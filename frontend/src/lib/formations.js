// Formations return positions on a 100x100 grid where (x,y) are percentages.
// x: 0 (near own goal) -> 100 (near opponent goal)
// y: 0 (left side) -> 100 (right side)
// GK at x~7, defense line, midfield, attack (11 players total).

export const FORMATIONS = {
  "4-4-2": [
    { pos: "GK", x: 7, y: 50 },
    { pos: "DF", x: 22, y: 15 },
    { pos: "DF", x: 22, y: 38 },
    { pos: "DF", x: 22, y: 62 },
    { pos: "DF", x: 22, y: 85 },
    { pos: "MF", x: 48, y: 15 },
    { pos: "MF", x: 48, y: 38 },
    { pos: "MF", x: 48, y: 62 },
    { pos: "MF", x: 48, y: 85 },
    { pos: "FW", x: 78, y: 35 },
    { pos: "FW", x: 78, y: 65 },
  ],
  "4-3-3": [
    { pos: "GK", x: 7, y: 50 },
    { pos: "DF", x: 22, y: 15 },
    { pos: "DF", x: 22, y: 38 },
    { pos: "DF", x: 22, y: 62 },
    { pos: "DF", x: 22, y: 85 },
    { pos: "MF", x: 46, y: 30 },
    { pos: "MF", x: 46, y: 50 },
    { pos: "MF", x: 46, y: 70 },
    { pos: "FW", x: 78, y: 20 },
    { pos: "FW", x: 82, y: 50 },
    { pos: "FW", x: 78, y: 80 },
  ],
  "3-5-2": [
    { pos: "GK", x: 7, y: 50 },
    { pos: "DF", x: 22, y: 25 },
    { pos: "DF", x: 22, y: 50 },
    { pos: "DF", x: 22, y: 75 },
    { pos: "MF", x: 42, y: 12 },
    { pos: "MF", x: 45, y: 32 },
    { pos: "MF", x: 45, y: 50 },
    { pos: "MF", x: 45, y: 68 },
    { pos: "MF", x: 42, y: 88 },
    { pos: "FW", x: 78, y: 38 },
    { pos: "FW", x: 78, y: 62 },
  ],
  "4-2-3-1": [
    { pos: "GK", x: 7, y: 50 },
    { pos: "DF", x: 22, y: 15 },
    { pos: "DF", x: 22, y: 38 },
    { pos: "DF", x: 22, y: 62 },
    { pos: "DF", x: 22, y: 85 },
    { pos: "MF", x: 38, y: 35 },
    { pos: "MF", x: 38, y: 65 },
    { pos: "MF", x: 58, y: 20 },
    { pos: "MF", x: 58, y: 50 },
    { pos: "MF", x: 58, y: 80 },
    { pos: "FW", x: 82, y: 50 },
  ],
  "5-3-2": [
    { pos: "GK", x: 7, y: 50 },
    { pos: "DF", x: 22, y: 10 },
    { pos: "DF", x: 22, y: 30 },
    { pos: "DF", x: 22, y: 50 },
    { pos: "DF", x: 22, y: 70 },
    { pos: "DF", x: 22, y: 90 },
    { pos: "MF", x: 48, y: 30 },
    { pos: "MF", x: 48, y: 50 },
    { pos: "MF", x: 48, y: 70 },
    { pos: "FW", x: 78, y: 38 },
    { pos: "FW", x: 78, y: 62 },
  ],
};

export const FORMATION_NAMES = Object.keys(FORMATIONS);
