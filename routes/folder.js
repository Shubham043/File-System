import express from 'express';
import auth from '../middleware/auth.js';
import { createFolder, getRootFolders, getFolderContents, deleteFolder } from '../controllers/folderController.js';

const router = express.Router();

router.use(auth); // All folder routes require auth

router.get('/', getRootFolders);
router.post('/', createFolder);
router.get('/:id', getFolderContents);
router.delete('/:id', deleteFolder);

export default router;