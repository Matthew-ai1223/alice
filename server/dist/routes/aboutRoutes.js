import { Router } from 'express';
import { getAbout, updateAbout, updateAboutPortrait } from '../controllers/aboutController.js';
import { uploadMedicinalFiles } from '../middlewares/upload.js';
const router = Router();
router.get('/', getAbout);
router.put('/', updateAbout);
router.post('/portrait', uploadMedicinalFiles, updateAboutPortrait);
export default router;
