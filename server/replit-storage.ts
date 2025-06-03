import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class ReplitKVStorage {
  private dbUrl: string;

  constructor() {
    this.dbUrl = process.env.REPLIT_DB_URL || '';
  }

  // Store image metadata in Replit KV database
  async storeImageMetadata(filename: string, metadata: any): Promise<void> {
    if (!this.dbUrl) return;
    
    try {
      await fetch(this.dbUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `image:${filename}=${JSON.stringify(metadata)}`
      });
    } catch (error) {
      console.error('Failed to store image metadata:', error);
    }
  }

  // Retrieve image metadata from Replit KV database
  async getImageMetadata(filename: string): Promise<any> {
    if (!this.dbUrl) return null;
    
    try {
      const response = await fetch(`${this.dbUrl}/image:${filename}`);
      if (response.ok) {
        const data = await response.text();
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to get image metadata:', error);
    }
    return null;
  }

  // List all stored images
  async listImages(): Promise<string[]> {
    if (!this.dbUrl) return [];
    
    try {
      const response = await fetch(`${this.dbUrl}?prefix=image:`);
      if (response.ok) {
        const data = await response.text();
        return data.split('\n').filter(key => key.startsWith('image:')).map(key => key.replace('image:', ''));
      }
    } catch (error) {
      console.error('Failed to list images:', error);
    }
    return [];
  }
}

// Enhanced persistent storage for Replit deployments
export class ReplitPersistentStorage {
  private kv: ReplitKVStorage;
  private baseDir: string;

  constructor() {
    this.kv = new ReplitKVStorage();
    // Use workspace directory for better persistence
    this.baseDir = path.join('/home/runner/workspace', 'persistent-uploads');
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async uploadImage(buffer: Buffer, originalName: string, mimetype: string, userId?: string): Promise<string> {
    const extension = path.extname(originalName);
    const filename = `${uuidv4()}${extension}`;
    const filePath = path.join(this.baseDir, filename);
    
    try {
      // Write file to persistent directory
      fs.writeFileSync(filePath, buffer);
      
      // Store metadata in Replit KV
      await this.kv.storeImageMetadata(filename, {
        originalName,
        mimetype,
        size: buffer.length,
        uploadedAt: new Date().toISOString(),
        userId
      });
      
      console.log(`Image uploaded to persistent storage: ${filename}`);
      return `/persistent-uploads/${filename}`;
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  }

  async deleteImage(url: string): Promise<void> {
    const filename = path.basename(url);
    const filePath = path.join(this.baseDir, filename);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Remove metadata from KV (optional, as it will be overwritten)
      console.log(`Deleted image: ${filename}`);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }

  imageExists(url: string): boolean {
    const filename = path.basename(url);
    const filePath = path.join(this.baseDir, filename);
    return fs.existsSync(filePath);
  }

  getImageUrl(filename: string, baseUrl?: string): string {
    return `${baseUrl || ''}/persistent-uploads/${filename}`;
  }

  // Migration utility
  async migrateFromUploads(): Promise<void> {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) return;

    const files = fs.readdirSync(uploadsDir);
    console.log(`Migrating ${files.length} images to persistent storage...`);

    for (const filename of files) {
      try {
        const sourcePath = path.join(uploadsDir, filename);
        const destPath = path.join(this.baseDir, filename);
        
        if (!fs.existsSync(destPath)) {
          const buffer = fs.readFileSync(sourcePath);
          fs.writeFileSync(destPath, buffer);
          
          // Store metadata
          await this.kv.storeImageMetadata(filename, {
            originalName: filename,
            mimetype: this.getMimetypeFromExtension(path.extname(filename)),
            size: buffer.length,
            migratedAt: new Date().toISOString()
          });
          
          console.log(`Migrated: ${filename}`);
        }
      } catch (error) {
        console.error(`Failed to migrate ${filename}:`, error);
      }
    }
  }

  private getMimetypeFromExtension(ext: string): string {
    const mimetypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return mimetypes[ext.toLowerCase()] || 'image/jpeg';
  }
}

export const replitStorage = new ReplitPersistentStorage();