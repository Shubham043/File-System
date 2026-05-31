import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // S3 URL or local file path
  url: {
    type: String,
    required: true,
  },
  // Original filename
  filename: {
    type: String,
    required: true,
  },
  // Size in bytes
  size: {
    type: Number,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    required: true,
  },
  // Denormalized for direct ownership checks without joins
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

// Compound indexes for frequent queries
imageSchema.index({ userId: 1, folderId: 1 });

export default mongoose.model('Image', imageSchema);