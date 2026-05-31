import express from 'express';
import auth from '../middleware/auth.js';
import { uploadImage, deleteImage } from '../controllers/imageController.js';
import {upload} from '../utils/storage.js';

const router = express.Router();

router.use(auth);

router.post('/', upload.single('image'), uploadImage);
router.delete('/:id', deleteImage);

export default router;