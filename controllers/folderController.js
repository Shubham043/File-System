import Folder from '../models/Folder.js';
import Image from '../models/Image.js';
import { deleteFile } from '../utils/storage.js';
import mongoose from 'mongoose';

// POST /api/folders
const createFolder = async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const userId = req.user._id;

    if (!name) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    let ancestors = [];

    if (parentId) {
      // Verify parent exists and belongs to user
      const parentFolder = await Folder.findOne({ _id: parentId, userId });
      if (!parentFolder) {
        return res.status(404).json({ message: 'Parent folder not found' });
      }
      // New folder's ancestors = parent's ancestors + parent itself
      ancestors = [...(parentFolder.ancestors || []), parentFolder._id];
    }

    const folder = await Folder.create({
      name,
      parentId: parentId || null,
      ancestors,
      userId,
    });

    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/folders - get root folders
const getRootFolders = async (req, res) => {
  try {
    const folders = await Folder.find({
      userId: req.user._id,
      parentId: null,
    }).sort({ createdAt: -1 });

    res.json(folders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/folders/:id - get folder contents (subfolders + images)
const getFolderContents = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify folder exists and belongs to user
    const folder = await Folder.findOne({ _id: id, userId });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Get subfolders and images in parallel
    const [subfolders, images] = await Promise.all([
      Folder.find({ userId, parentId: id }).sort({ createdAt: -1 }),
      Image.find({ userId, folderId: id }).sort({ createdAt: -1 }),
    ]);

    res.json({ folder, subfolders, images });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /api/folders/:id
const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const folder = await Folder.findOne({ _id: id, userId });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Find all descendant folders using ancestors array
    const descendantFolders = await Folder.find({
      userId,
      ancestors: folder._id,
    });

    const allFolderIds = [folder._id, ...descendantFolders.map(f => f._id)];

    // Find all images in these folders to delete files
    const images = await Image.find({ userId, folderId: { $in: allFolderIds } });

    // Delete physical files
    images.forEach(img => {
      try {
        // Extract filename from URL for local storage
        const filename = img.url.split('/uploads/')[1];
        if (filename) deleteFile(filename);
      } catch (e) {
        // Non-critical — continue even if file deletion fails
        console.error('File deletion error:', e.message);
      }
    });

    // Delete all images and folders in parallel
    await Promise.all([
      Image.deleteMany({ folderId: { $in: allFolderIds } }),
      Folder.deleteMany({ _id: { $in: allFolderIds } }),
    ]);

    // Subtract folder's size from all its ancestors
    if (folder.ancestors.length > 0 && folder.size > 0) {
      await Folder.updateMany(
        { _id: { $in: folder.ancestors } },
        { $inc: { size: -folder.size } }
      );
    }

    res.json({ message: 'Folder deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export { createFolder, getRootFolders, getFolderContents, deleteFolder };