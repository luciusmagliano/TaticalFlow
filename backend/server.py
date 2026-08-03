from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Query, Header
from fastapi.responses import Response as FastResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# =========================
# Config & Setup
# =========================
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
APP_NAME = os.environ.get('APP_NAME', 'taticaflow')

JWT_ALGO = "HS256"
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="TaticaFlow API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("taticaflow")

storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not set")
        return None
    try:
        r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        r.raise_for_status()
        storage_key = r.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(500, "Armazenamento indisponível")
    r = requests.put(f"{STORAGE_URL}/objects/{path}",
                     headers={"X-Storage-Key": key, "Content-Type": content_type},
                     data=data, timeout=120)
    if r.status_code == 403:
        # Refresh key and retry once
        global storage_key
        storage_key = None
        key = init_storage()
        r = requests.put(f"{STORAGE_URL}/objects/{path}",
                         headers={"X-Storage-Key": key, "Content-Type": content_type},
                         data=data, timeout=120)
    r.raise_for_status()
    return r.json()


def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(500, "Armazenamento indisponível")
    r = requests.get(f"{STORAGE_URL}/objects/{path}",
                     headers={"X-Storage-Key": key}, timeout=60)
    if r.status_code == 403:
        global storage_key
        storage_key = None
        key = init_storage()
        r = requests.get(f"{STORAGE_URL}/objects/{path}",
                         headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


# =========================
# Auth helpers
# =========================
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7),
               "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Não autenticado")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(401, "Usuário não encontrado")
        user.pop("password_hash", None)
        user.pop("_id", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token inválido")


# =========================
# Models
# =========================
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ClubIn(BaseModel):
    name: str
    short_name: Optional[str] = ""
    primary_color: str = "#FF3B30"
    secondary_color: str = "#FFFFFF"
    badge_url: Optional[str] = None


class PlayerIn(BaseModel):
    name: str
    number: int
    position: str  # GK, DF, MF, FW
    club_id: str
    photo_url: Optional[str] = None


class MatchIn(BaseModel):
    home_club_id: str
    away_club_id: str
    competition: Optional[str] = "Amistoso"
    date: Optional[str] = None
    stadium: Optional[str] = ""


class LineupPlayer(BaseModel):
    player_id: str
    x: float  # 0-100
    y: float  # 0-100
    is_starter: bool = True


class Lineup(BaseModel):
    formation: str = "4-4-2"
    players: List[LineupPlayer] = []


class MatchEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # goal, yellow_card, red_card, substitution
    minute: int
    team: str  # home | away
    player_id: Optional[str] = None
    player_out_id: Optional[str] = None  # for substitution
    player_in_id: Optional[str] = None
    assist_id: Optional[str] = None


class MatchUpdate(BaseModel):
    home_lineup: Optional[Lineup] = None
    away_lineup: Optional[Lineup] = None
    events: Optional[List[MatchEvent]] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: Optional[str] = None  # scheduled | live | finished
    stadium: Optional[str] = None
    competition: Optional[str] = None


def clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


# =========================
# Auth endpoints
# =========================
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Email já cadastrado")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    response.set_cookie("access_token", token, httponly=True, secure=True,
                        samesite="none", max_age=7 * 24 * 3600, path="/")
    return {"id": user_id, "email": email, "name": payload.name, "token": token}


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Credenciais inválidas")
    token = create_access_token(user["id"], email)
    response.set_cookie("access_token", token, httponly=True, secure=True,
                        samesite="none", max_age=7 * 24 * 3600, path="/")
    return {"id": user["id"], "email": user["email"], "name": user["name"], "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# =========================
# Upload
# =========================
MIME = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
        "gif": "image/gif", "webp": "image/webp", "svg": "image/svg+xml"}


@api.post("/upload")
async def upload(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    content_type = MIME.get(ext, file.content_type or "application/octet-stream")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Arquivo muito grande (máx 5MB)")
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, content_type)
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "storage_path": result["path"],
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}


@api.get("/files/{path:path}")
async def download(path: str):
    # Public read (images are non-sensitive)
    record = await db.files.find_one({"storage_path": path})
    if not record:
        raise HTTPException(404, "Arquivo não encontrado")
    data, ct = get_object(path)
    return FastResponse(content=data, media_type=record.get("content_type", ct),
                        headers={"Cache-Control": "public, max-age=86400"})


# =========================
# Clubs
# =========================
@api.post("/clubs")
async def create_club(payload: ClubIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.clubs.insert_one(doc)
    return clean(doc)


@api.get("/clubs")
async def list_clubs(user: dict = Depends(get_current_user)):
    docs = await db.clubs.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    return docs


@api.get("/clubs/{club_id}")
async def get_club(club_id: str, user: dict = Depends(get_current_user)):
    doc = await db.clubs.find_one({"id": club_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Clube não encontrado")
    return doc


@api.put("/clubs/{club_id}")
async def update_club(club_id: str, payload: ClubIn, user: dict = Depends(get_current_user)):
    res = await db.clubs.update_one({"id": club_id, "user_id": user["id"]},
                                     {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Clube não encontrado")
    return await db.clubs.find_one({"id": club_id}, {"_id": 0})


@api.delete("/clubs/{club_id}")
async def delete_club(club_id: str, user: dict = Depends(get_current_user)):
    await db.clubs.delete_one({"id": club_id, "user_id": user["id"]})
    await db.players.delete_many({"club_id": club_id, "user_id": user["id"]})
    return {"ok": True}


# =========================
# Players
# =========================
@api.post("/players")
async def create_player(payload: PlayerIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.players.insert_one(doc)
    return clean(doc)


@api.get("/players")
async def list_players(club_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q: dict = {"user_id": user["id"]}
    if club_id:
        q["club_id"] = club_id
    docs = await db.players.find(q, {"_id": 0}).sort("number", 1).to_list(1000)
    return docs


@api.put("/players/{player_id}")
async def update_player(player_id: str, payload: PlayerIn, user: dict = Depends(get_current_user)):
    res = await db.players.update_one({"id": player_id, "user_id": user["id"]},
                                       {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Jogador não encontrado")
    return await db.players.find_one({"id": player_id}, {"_id": 0})


@api.delete("/players/{player_id}")
async def delete_player(player_id: str, user: dict = Depends(get_current_user)):
    await db.players.delete_one({"id": player_id, "user_id": user["id"]})
    return {"ok": True}


# =========================
# Matches
# =========================
@api.post("/matches")
async def create_match(payload: MatchIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "home_lineup": {"formation": "4-4-2", "players": []},
        "away_lineup": {"formation": "4-4-2", "players": []},
        "events": [],
        "home_score": 0,
        "away_score": 0,
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.matches.insert_one(doc)
    return clean(doc)


@api.get("/matches")
async def list_matches(user: dict = Depends(get_current_user)):
    docs = await db.matches.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.get("/matches/{match_id}")
async def get_match(match_id: str, user: dict = Depends(get_current_user)):
    doc = await db.matches.find_one({"id": match_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Partida não encontrada")
    return doc


@api.put("/matches/{match_id}")
async def update_match(match_id: str, payload: MatchUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    res = await db.matches.update_one({"id": match_id, "user_id": user["id"]},
                                       {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Partida não encontrada")
    return await db.matches.find_one({"id": match_id}, {"_id": 0})


@api.delete("/matches/{match_id}")
async def delete_match(match_id: str, user: dict = Depends(get_current_user)):
    await db.matches.delete_one({"id": match_id, "user_id": user["id"]})
    return {"ok": True}


@api.get("/")
async def root():
    return {"service": "TaticaFlow API", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.clubs.create_index("id", unique=True)
        await db.players.create_index("id", unique=True)
        await db.matches.create_index("id", unique=True)
    except Exception as e:
        logger.error(f"Index create error: {e}")
    init_storage()


@app.on_event("shutdown")
async def shutdown():
    client.close()
