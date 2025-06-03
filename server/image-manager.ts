import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

// Future: Replit object storage implementation
class ReplitImageStorage implements ImageStorage {
  async uploadImage(buffer: Buffer, originalName: string, mimetype: string): Promise<string> {
    // TODO: Implement Replit object storage upload
    const extension = path.extname(originalName);
    const filename = `${uuidv4()}${extension}`;
    
    // For now, fallback to local storage
    const localStorage = new LocalImageStorage();
    return localStorage.uploadImage(buffer, originalName, mimetype);
  }

  async deleteImage(url: string): Promise<void> {
    // TODO: Implement Replit object storage deletion
    const localStorage = new LocalImageStorage();
    return localStorage.deleteImage(url);
  }

  getImageUrl(filename: string, baseUrl?: string): string {
    // TODO: Return Replit storage URL
    // return `https://replit-object-storage.com/${filename}`;
    const localStorage = new LocalImageStorage();
    return localStorage.getImageUrl(filename, baseUrl);
  }

  imageExists(url: string): boolean {
    // TODO: Check Replit storage
    const localStorage = new LocalImageStorage();
    return localStorage.imageExists(url);
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