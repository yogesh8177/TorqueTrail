# TorqueTrail Deployment Guide

## Cloud Storage Configuration

TorqueTrail supports persistent image storage using Replit's object storage service. This ensures images remain available across deployments.

### Setting Up Replit Object Storage

1. **In Replit Console:**
   - Go to your Replit project settings
   - Navigate to the "Secrets" tab
   - Add the following environment variables:

2. **Required Environment Variables:**
   ```
   REPLIT_STORAGE_URL=https://your-storage-endpoint.replit.app
   REPLIT_STORAGE_TOKEN=your-storage-access-token
   ```

3. **Optional Configuration:**
   ```
   NODE_ENV=production
   DATABASE_URL=your-postgresql-connection-string
   ```

### Storage Configuration API

Check your current storage configuration:
```bash
GET /api/storage/config
```

Response:
```json
{
  "type": "replit",
  "configured": true,
  "url": "https://your-storage-endpoint.replit.app"
}
```

### Image Storage Features

- **Automatic Fallback:** If Replit storage is unavailable, falls back to local storage
- **UUID Filenames:** All images use UUID-based naming for uniqueness
- **Image Migration:** Built-in tools for migrating existing images to cloud storage
- **Error Handling:** Robust error handling with fallback mechanisms

### Production Deployment

1. **Deploy to Replit:**
   - Push your code to the Replit repository
   - Configure environment variables in Secrets
   - The application will automatically detect and use Replit storage

2. **Verify Storage:**
   - Check `/api/storage/config` endpoint
   - Upload a test image through the interface
   - Confirm images persist after deployment restarts

### Migration from Local Storage

If you have existing images in local storage, they will automatically be preserved. The system is designed to:

1. Use Replit storage for new uploads when configured
2. Continue serving existing local images
3. Provide migration tools for moving local images to cloud storage

### Benefits of Replit Object Storage

- **Persistence:** Images survive deployment restarts
- **Scalability:** No local disk space limitations
- **Performance:** CDN-backed image delivery
- **Reliability:** Built-in redundancy and backup

### Troubleshooting

**Images not persisting:**
- Verify REPLIT_STORAGE_URL and REPLIT_STORAGE_TOKEN are set
- Check storage configuration endpoint
- Review server logs for upload errors

**Storage type shows 'local':**
- Confirm environment variables are properly set in Replit Secrets
- Restart the application after adding secrets

**Upload failures:**
- Check network connectivity to storage endpoint
- Verify token permissions
- Monitor fallback to local storage in logs