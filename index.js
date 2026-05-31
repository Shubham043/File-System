import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import folderRoutes from './routes/folder.js';
import imageRoutes from './routes/image.js';
import { fileURLToPath } from 'url';
// import path from 'path';

// Recreate __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (local storage mode)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/images', imageRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });