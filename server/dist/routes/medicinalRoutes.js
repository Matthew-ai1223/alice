import { Router } from 'express';
import { getAllMedicinals, getMedicinalById, getMedicinalImage, getMedicinalAudio, createMedicinal, updateMedicinal, deleteMedicinal, getStats, } from '../controllers/medicinalController.js';
import { uploadMedicinalFiles } from '../middlewares/upload.js';
const router = Router();
// Stats endpoint
router.get('/stats', getStats);
router.get('/:id/image', getMedicinalImage);
router.get('/:id/audio', getMedicinalAudio);
// Main CRUD endpoints
router.get('/', getAllMedicinals);
router.get('/:id', getMedicinalById);
router.post('/', uploadMedicinalFiles, createMedicinal);
router.put('/:id', uploadMedicinalFiles, updateMedicinal);
router.delete('/:id', deleteMedicinal);
export default router;
