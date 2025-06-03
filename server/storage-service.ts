import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// S3 client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.S3_ENDPOINT, // For S3-compatible services like DigitalOcean Spaces
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', // Required for some S3-compatible services
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'torquetrail-images';

// Multer configuration for S3 uploads
export const s3Upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    acl: 'public-read',
    key: function (req, file, cb) {
      const extension = path.extname(file.originalname);
      const filename = `${file.fieldname}-${uuidv4()}${extension}`;
      cb(null, filename);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
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

// Fallback to local storage if S3 is not configured
export const localUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
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

// Check if S3 is configured
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET_NAME
  );
}

// Get the appropriate upload middleware based on configuration
export function getUploadMiddleware() {
  return isS3Configured() ? s3Upload : localUpload;
}

// Get public URL for an image
export function getImageUrl(filename: string, baseUrl?: string): string {
  if (isS3Configured()) {
    // Return S3 URL
    const endpoint = process.env.S3_ENDPOINT || `https://s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;
    return `${endpoint}/${BUCKET_NAME}/${filename}`;
  } else {
    // Return local URL
    return `${baseUrl || ''}/uploads/${filename}`;
  }
}

// Delete an image from storage
export async function deleteImage(filename: string): Promise<void> {
  if (isS3Configured()) {
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
      }));
    } catch (error) {
      console.error('Error deleting image from S3:', error);
    }
  } else {
    // For local storage, we'll keep the existing file cleanup logic
    // This would be handled in the routes where files are deleted
  }
}

// Generate a signed URL for temporary access (useful for private images)
export async function generateSignedUrl(filename: string, expiresIn: number = 3600): Promise<string> {
  if (isS3Configured()) {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
      });
      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  } else {
    // For local storage, return the direct URL
    return `/uploads/${filename}`;
  }
}

export { s3Client, BUCKET_NAME };