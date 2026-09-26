import fs from "fs";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "os");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

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
