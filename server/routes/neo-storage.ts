// This file has been disabled as part of removing NEOFS functionality
// and simplifying our system to use IPFS direct pinning only.
// If you need to restore NEOFS functionality, uncomment the code below.

/*
import { Router, Request, Response } from 'express';
import multer from 'multer';
import axios, { AxiosRequestConfig } from 'axios';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { WebSocket } from 'ws';

// Define custom request type with multer file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
  files?: { [fieldname: string]: Express.Multer.File[] };
}

const router = Router();

// Configure multer with proper field name and file type validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check file type
    const validMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/aac',
      'audio/mp4',
      'audio/x-m4a'
    ];
    if (!validMimeTypes.includes(file.mimetype)) {
      cb(new Error('Please select a supported audio file (MP3, WAV, OGG, AAC, M4A).'));
      return;
    }
    cb(null, true);
  }
});

// Add GAS calculation endpoint
router.post('/calculate-gas', async (req, res) => {
  return res.status(501).json({ error: 'NEOFS functionality has been disabled' });
});

// Updated API endpoint to include version and proper path
const NEO_FS_API = "https://fs.neo.org/api/v1";

// Upload file to Neo FS
router.post('/upload', upload.single('file'), async (req: MulterRequest, res) => {
  return res.status(501).json({ error: 'NEOFS functionality has been disabled' });
});

// Update list files endpoint with better error handling
router.get('/files/:address', async (req, res) => {
  return res.status(501).json({ error: 'NEOFS functionality has been disabled' });
});

// Update the download endpoint with proper types
router.get('/download/:address/:fileId', async (req, res) => {
  return res.status(501).json({ error: 'NEOFS functionality has been disabled' });
});

// Add error handling middleware
router.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('NEO Storage error:', err);
  res.status(501).json({
    error: 'NEOFS functionality has been disabled',
    details: 'Please use IPFS endpoints instead'
  });
});

export default router;
*/

import { Router } from 'express';
const router = Router();

// Return disabled status for all endpoints
router.all('*', (req, res) => {
  res.status(501).json({ 
    error: 'NEOFS functionality has been disabled',
    message: 'Please use IPFS endpoints instead'
  });
});

export default router;