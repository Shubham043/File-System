import Image from '../models/Image.js';
import Folder from '../models/Folder.js';
import { deleteFile, getFileUrl } from '../utils/storage.js';
import mongoose from 'mongoose';

// POST /api/images
const uploadImage = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let uploadedFilename = null;

  try {
    const { name, folderId } = req.body;
    const userId = req.user._id;
    const file = req.file;

    if (!name || !folderId || !file) {
      // Clean up uploaded file if validation fails
      if (file) deleteFile(file.filename);
      return res.status(400).json({ message: 'Name, folderId and image file are required' });
    }

    uploadedFilename = file.filename;

    // Verify folder exists and belongs to user
    const folder = await Folder.findOne({ _id: folderId, userId }).session(session);
    if (!folder) {
      await session.abortTransaction();
      deleteFile(uploadedFilename);
      return res.status(404).json({ message: 'Folder not found' });
    }

    const imageUrl = getFileUrl(file);

    // Create image document
    const image = await Image.create([{
      name,
      url: imageUrl,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype,
      folderId,
      userId,
    }], { session });

    // Update size of the folder AND all its ancestors in one query
    // This is the core design decision — ancestors array enables single updateMany
    const foldersToUpdate = [...(folder.ancestors || []), folder._id];
    await Folder.updateMany(
      { _id: { $in: foldersToUpdate } },
      { $inc: { size: file.size } },
      { session }
    );

    await session.commitTransaction();

    res.status(201).json(image[0]);
  } catch (err) {
    await session.abortTransaction();
    // Rollback: delete the uploaded file
    if (uploadedFilename) {
      try { deleteFile(uploadedFilename); } catch (e) {}
    }
    res.status(500).json({ message: 'Upload failed', error: err.message });
  } finally {
    session.endSession();
  }
};

// DELETE /api/images/:id
const deleteImage = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const userId = req.user._id;

    const image = await Image.findOne({ _id: id, userId }).session(session);
    if (!image) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Image not found' });
    }

    const folder = await Folder.findOne({ _id: image.folderId, userId }).session(session);

    // Delete image document
    await Image.deleteOne({ _id: id }).session(session);

    // Subtract size from folder and all ancestors
    if (folder) {
      const foldersToUpdate = [...folder.ancestors, folder._id];
      await Folder.updateMany(
        { _id: { $in: foldersToUpdate } },
        { $inc: { size: -image.size } },
        { session }
      );
    }

    await session.commitTransaction();

    // Delete physical file after transaction succeeds
    try {
      const filename = image.url.split('/uploads/')[1];
      if (filename) deleteFile(filename);
    } catch (e) {
      console.error('File deletion error:', e.message);
    }

    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    session.endSession();
  }
};

export { uploadImage, deleteImage };