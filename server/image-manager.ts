import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

export interface ImageStorage {
  uploadImage(buffer: Buffer, originalName: string, mimetype: string): Promise<string>;
  deleteImage(url: string): Promise<void>;
  getImageUrl(filename: string, baseUrl?: string): string;
  imageExists(url: string): boolean;
}

// Local storage implementation
class LocalImageStorage implements ImageStorage {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async uploadImage(buffer: Buffer, originalName: string, mimetype: string): Promise<string> {
    const extension = path.extname(originalName);
    const filename = `${uuidv4()}${extension}`;
    const filePath = path.join(this.uploadsDir, filename);
    
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  }

  async deleteImage(url: string): Promise<void> {
    try {
      const filename = path.basename(url);
      const filePath = path.join(this.uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted image: ${filename}`);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }

  getImageUrl(filename: string, baseUrl?: string): string {
    return `${baseUrl || ''}/uploads/${filename}`;
  }

  imageExists(url: string): boolean {
    const filename = path.basename(url);
    const filePath = path.join(this.uploadsDir, filename);
    return fs.existsSync(filePath);
  }
}

// Replit object storage implementation
class ReplitImageStorage implements ImageStorage {
  private storageUrl: string;
  private token: string;

  constructor() {
    this.storageUrl = process.env.REPLIT_STORAGE_URL || '';
    this.token = process.env.REPLIT_STORAGE_TOKEN || '';
  }

  async uploadImage(buffer: Buffer, originalName: string, mimetype: string): Promise<string> {
    const extension = path.extname(originalName);
    const filename = `torquetrail/${uuidv4()}${extension}`;
    
    try {
      // Upload to Replit object storage using their API
      const response = await fetch(`${this.storageUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': mimetype,
          'X-Filename': filename,
        },
        body: buffer,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json() as any;
      const publicUrl = result.url || `${this.storageUrl}/${filename}`;
      
      console.log(`Uploaded image to Replit storage: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error('Replit storage upload failed, falling back to local:', error);
      // Fallback to local storage
      const localStorage = new LocalImageStorage();
      return localStorage.uploadImage(buffer, originalName, mimetype);
    }
  }

  async deleteImage(url: string): Promise<void> {
    try {
      const filename = this.extractFilenameFromUrl(url);
      
      const response = await fetch(`${this.storageUrl}/${filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        console.warn(`Failed to delete from Replit storage: ${response.statusText}`);
      }
      
      console.log(`Deleted image from Replit storage: ${filename}`);
    } catch (error) {
      console.error('Error deleting from Replit storage:', error);
    }
  }

  getImageUrl(filename: string, baseUrl?: string): string {
    // If filename is already a full URL, return it
    if (filename.startsWith('http')) {
      return filename;
    }
    
    // Construct Replit storage URL
    return `${this.storageUrl}/torquetrail/${filename}`;
  }

  imageExists(url: string): boolean {
    // For cloud storage, assume images exist unless we can verify otherwise
    // This avoids making unnecessary HTTP requests on every check
    return true;
  }

  private extractFilenameFromUrl(url: string): string {
    // Extract filename from full URL
    const parts = url.split('/');
    return parts[parts.length - 1];
  }
}

// Factory function to get the appropriate storage implementation
function createImageStorage(): ImageStorage {
  // Check for Replit object storage environment variables
  const replitStorageUrl = process.env.REPLIT_STORAGE_URL;
  const replitStorageToken = process.env.REPLIT_STORAGE_TOKEN;
  
  if (replitStorageUrl && replitStorageToken) {
    console.log('Using Replit object storage');
    return new ReplitImageStorage();
  } else {
    console.log('Using local image storage');
    return new LocalImageStorage();
  }
}

// Singleton instance
export const imageStorage = createImageStorage();

// Helper function to migrate existing images to cloud storage
export async function migrateImagesToCloud(): Promise<void> {
  const localStorage = new LocalImageStorage();
  const cloudStorage = new ReplitImageStorage();
  
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) return;
  
  const files = fs.readdirSync(uploadsDir);
  console.log(`Starting migration of ${files.length} images to cloud storage...`);
  
  for (const filename of files) {
    try {
      const filePath = path.join(uploadsDir, filename);
      const buffer = fs.readFileSync(filePath);
      const mimetype = getMimetypeFromExtension(path.extname(filename));
      
      // Upload to cloud storage
      const cloudUrl = await cloudStorage.uploadImage(buffer, filename, mimetype);
      console.log(`Migrated ${filename} to ${cloudUrl}`);
      
      // Note: In a real migration, you'd update database records here
      // to point to the new cloud URLs instead of local paths
      
    } catch (error) {
      console.error(`Failed to migrate ${filename}:`, error);
    }
  }
  
  console.log('Image migration completed');
}

function getMimetypeFromExtension(ext: string): string {
  const mimetypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime'
  };
  
  return mimetypes[ext.toLowerCase()] || 'application/octet-stream';
}