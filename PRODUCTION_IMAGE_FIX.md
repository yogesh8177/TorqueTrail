# Production Image Storage Fix

## Issue
Images disappear in production because the current storage uses ephemeral container directories that don't persist across deployments.

## Solution Implemented
1. **Persistent Storage Migration**: All uploads now go to `/home/runner/workspace/persistent-uploads/`
2. **Automatic Migration**: Server startup automatically migrates existing images
3. **Database Path Updates**: All image references updated to use persistent paths

## Production Deployment Requirements
The following changes ensure images persist in production:

### Storage Configuration
- New uploads: `/home/runner/workspace/persistent-uploads/`
- Static serving: `/persistent-uploads/` route
- Automatic migration on startup

### Database Updates Required
```sql
-- Update drive log images
UPDATE drive_logs SET title_image_url = REPLACE(title_image_url, '/uploads/', '/persistent-uploads/') WHERE title_image_url LIKE '/uploads/%';

-- Update pitstop images  
UPDATE pitstops SET image_urls = REPLACE(image_urls::text, '/uploads/', '/persistent-uploads/')::text[] WHERE image_urls::text LIKE '%/uploads/%';
```

### Files Changed
- `server/storage-service.ts`: Updated to use persistent directory
- `server/routes.ts`: Added automatic migration on startup
- Static routes: Added `/persistent-uploads/` serving

## Verification Steps
1. Deploy to production
2. Check migration logs in console
3. Verify image accessibility
4. Test new uploads persist across restarts

## Backup Plan
Original images remain in `/uploads/` until manually cleaned up after verification.