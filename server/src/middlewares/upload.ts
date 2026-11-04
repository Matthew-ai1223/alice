import multer from 'multer';
import path from 'path';
import fs from 'fs';

const isVercel = Boolean(process.env.VERCEL);

// Vercel only allows writes under /tmp
const UPLOAD_ROOT = isVercel
  ? path.join('/tmp', 'uploads')
  : path.resolve(process.cwd(), 'uploads');
const IMAGES_DIR = path.join(UPLOAD_ROOT, 'images');
const AUDIO_DIR = path.join(UPLOAD_ROOT, 'audio');

try {
  [UPLOAD_ROOT, IMAGES_DIR, AUDIO_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
} catch (err) {
  console.warn('[Uploads Notice] Could not create upload directories:', err);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const dest =
        file.fieldname === 'image'
          ? IMAGES_DIR
          : file.fieldname === 'audio'
            ? AUDIO_DIR
            : UPLOAD_ROOT;
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      cb(null, dest);
    } catch (err) {
      cb(err as Error, UPLOAD_ROOT);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.fieldname === 'image') {
    const allowedImageTypes = /jpeg|jpg|png|webp|gif|svg/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype;
    if (allowedImageTypes.test(ext) || allowedImageTypes.test(mime)) {
      return cb(null, true);
    }
    return cb(
      new Error('Invalid image file. Only JPG, JPEG, PNG, WEBP, and GIF are allowed.')
    );
  }

  if (file.fieldname === 'audio') {
    const allowedAudioTypes = /mp3|wav|ogg|m4a|aac|webm|mpeg/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype;
    if (allowedAudioTypes.test(ext) || allowedAudioTypes.test(mime)) {
      return cb(null, true);
    }
    return cb(
      new Error('Invalid audio file. Only MP3, WAV, OGG, M4A, AAC, and WEBM are allowed.')
    );
  }

  cb(null, true);
};

export const uploadMedicinalFiles = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size
  },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]);
