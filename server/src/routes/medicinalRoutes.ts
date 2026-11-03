import { Router } from 'express';
import {
  getAllMedicinals,
  getMedicinalById,
  createMedicinal,
  updateMedicinal,
  deleteMedicinal,
  getStats,
} from '../controllers/medicinalController.js';
import { uploadMedicinalFiles } from '../middlewares/upload.js';

const router = Router();

// Stats endpoint
router.get('/stats', getStats);

// Main CRUD endpoints
router.get('/', getAllMedicinals);
router.get('/:id', getMedicinalById);
router.post('/', uploadMedicinalFiles, createMedicinal);
router.put('/:id', uploadMedicinalFiles, updateMedicinal);
router.delete('/:id', deleteMedicinal);

export default router;
