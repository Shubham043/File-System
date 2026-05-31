import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dobbyads',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    resource_type: 'image',
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Cloudinary URL is already public — no local path needed
const getFileUrl = (file) => file.path;

// Delete from Cloudinary using public_id
const deleteFile = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (e) {
    console.error('Cloudinary delete error:', e.message);
  }
};

export { upload, getFileUrl, deleteFile };