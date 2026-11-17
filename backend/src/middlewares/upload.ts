import fs from "fs";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

export const UPLOADS_RAIZ = path.join(__dirname, "..", "..", "uploads");
const UPLOADS_DIR = path.join(UPLOADS_RAIZ, "os");
export const LOGOS_DIR = path.join(UPLOADS_RAIZ, "logos");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(LOGOS_DIR, { recursive: true });

const EXTENSOES_PERMITIDAS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const extensao = EXTENSOES_PERMITIDAS[file.mimetype] ?? path.extname(file.originalname);
    cb(null, `${randomUUID()}${extensao}`);
  },
});

export const uploadFotoOs = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!EXTENSOES_PERMITIDAS[file.mimetype]) {
      cb(new Error("Formato de imagem não suportado. Use JPEG, PNG ou WebP."));
      return;
    }
    cb(null, true);
  },
});

export const uploadLogo = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, LOGOS_DIR),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${EXTENSOES_PERMITIDAS[file.mimetype] ?? ".png"}`),
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!EXTENSOES_PERMITIDAS[file.mimetype]) {
      cb(new Error("Formato de imagem não suportado. Use JPEG, PNG ou WebP."));
      return;
    }
    cb(null, true);
  },
});
