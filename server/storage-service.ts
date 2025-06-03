import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import * as fs from 'fs';

// Enhanced persistent storage using Replit workspace directory
export const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Store in Replit's persistent workspace directory
      const persistentDir = path.join('/home/runner/workspace', 'persistent-uploads');
      if (!fs.existsSync(persistentDir)) {
        fs.mkdirSync(persistentDir, { recursive: true });
      }
      cb(null, persistentDir);
    },
    filename: (req, file, cb) => {
      // Generate UUID-based filename for better uniqueness
      const extension = path.extname(file.originalname);
      const filename = `${file.fieldname}-${uuidv4()}${extension}`;
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  },
});

// Get the upload middleware (simplified)
export function getUploadMiddleware() {
  return upload;
}

// Get public URL for an image
export function getImageUrl(filename: string, baseUrl?: string): string {
  return `${baseUrl || ''}/uploads/${filename}`;
}

// Delete an image from storage
export async function deleteImage(filename: string): Promise<void> {
  try {
    const filePath = path.join(process.cwd(), 'uploads', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted image: ${filename}`);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
  }
}

// Check if cloud storage is configured (returns false for local storage)
export function isS3Configured(): boolean {
  return false;
}

// Utility function to check if an image file exists
export function imageExists(filename: string): boolean {
  const filePath = path.join(process.cwd(), 'uploads', filename);
  return fs.existsSync(filePath);
}