import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

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
    fileSize: 4 * 1024 * 1024, // 4MB — Vercel serverless body limit
  },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]);
