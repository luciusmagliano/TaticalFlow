# PRD — TaticaFlow

## Problem Statement (original, PT-BR)
Crie um aplicativo web onde o usuário poderá cadastrar clubes de futebol e jogadores, fazer o upload do escudo e das fotos dos jogadores e depois fazer escalações, substituições e gere uma imagem de resultado final similar a da imagem anexa.

## User Choices
- Auth: Email/senha (JWT)
- Storage: Emergent Object Storage (imagens)
- Formação: Presets fixos (4-4-2, 4-3-3, 3-5-2, 4-2-3-1, 5-3-2) + drag livre
- Idioma: PT-BR

## Personas
- Treinador amador que quer registrar suas escalações e compartilhar resultados como imagem.

## Architecture
- Backend: FastAPI + MongoDB + Emergent Object Storage
- Frontend: React 19 + TailwindCSS + Shadcn + html-to-image
- Auth: JWT bcrypt, cookie + Bearer

## Implemented (Feb 2026)
- Auth (register/login/logout/me), bcrypt + JWT
- Upload endpoint + Object Storage
- Clubes CRUD (nome, sigla, cores, escudo)
- Jogadores CRUD (nome, número, posição, foto, clube)
- Partidas CRUD
- Editor tático:
  - 5 formações pré-definidas com auto-posicionamento
  - Drag livre no campo
  - Adicionar/remover do elenco
  - Eventos: gol, cartão amarelo, cartão vermelho, substituição
  - Placar automático a partir dos gols
- Overlay de transmissão: geração de PNG cinematográfico 1600x900

## Backlog / Next
- P1: Publicar link público de partida
- P1: Estatísticas (posse, chutes)
- P2: Copiar imagem para clipboard
- P2: Templates de imagem (diferentes estilos)
