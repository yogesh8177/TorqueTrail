import { storage } from "./storage";

export async function generatePublicShareHTML(driveLogId: number, baseUrl: string): Promise<string> {
  try {
    const driveLog = await storage.getDriveLogWithPitstops(driveLogId);
    
    if (!driveLog || !driveLog.isPublic) {
      return generateNotFoundHTML();
    }

    // Get user information
    const user = await storage.getUser(driveLog.userId);
    if (!user) {
      return generateNotFoundHTML();
    }

    // Get vehicle information if available
    let vehicle = null;
    if (driveLog.vehicleId) {
      vehicle = await storage.getVehicle(driveLog.vehicleId);
    }

    const authorName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : (user.email || 'Unknown User').split('@')[0];

    const shareUrl = `${baseUrl}/share/${driveLogId}`;
    const imageUrl = driveLog.titleImageUrl ? `${baseUrl}${driveLog.titleImageUrl}` : `${baseUrl}/generated-icon.png`;
    const description = driveLog.description || `Drive from ${driveLog.startLocation} to ${driveLog.endLocation}`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${driveLog.title} - TorqueTrail</title>
    <meta name="description" content="${description} - Shared on TorqueTrail by ${authorName}">
    
    <!-- Open Graph meta tags -->
    <meta property="og:title" content="${driveLog.title} - TorqueTrail">
    <meta property="og:description" content="${description} by ${authorName}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${shareUrl}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="TorqueTrail">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    
    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${driveLog.title} - TorqueTrail">
    <meta name="twitter:description" content="${description} by ${authorName}">
    <meta name="twitter:image" content="${imageUrl}">
    
    <!-- Additional meta tags -->
    <meta name="author" content="${authorName}">
    <link rel="canonical" href="${shareUrl}">
    
    <!-- Initialize React app -->
    <script type="module" src="/src/main.tsx"></script>
    
    <style>
      /* Minimal styles for social media crawlers only */
      .seo-only {
        position: absolute;
        left: -9999px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
      
      /* React app container */
      #root {
        min-height: 100vh;
      }
    </style>
</head>
<body>
    <!-- Hidden content for social media crawlers only -->
    <div class="seo-only">
        <h1>${driveLog.title}</h1>
        <p>Shared by ${authorName}</p>
        <p>${description || `Drive from ${driveLog.startLocation} to ${driveLog.endLocation}`}</p>
        <p>From: ${driveLog.startLocation}</p>
        <p>To: ${driveLog.endLocation}</p>
        <p>Distance: ${driveLog.distance} km</p>
        ${vehicle ? `<p>Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}</p>` : ''}
    </div>
    
    <!-- React app container -->
    <div id="root"></div>
</body>
</html>`;
  } catch (error) {
    console.error('Error generating public share HTML:', error);
    return generateNotFoundHTML();
  }
}

function generateNotFoundHTML(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Drive Log Not Found - TorqueTrail</title>
    <meta name="description" content="The requested drive log was not found or is not publicly available.">
    
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0;
        padding: 20px;
        background-color: #f8fafc;
        color: #1e293b;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
      }
      .container {
        text-align: center;
        background: white;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .title {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 16px;
      }
      .button {
        display: inline-block;
        background-color: #3b82f6;
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 500;
        margin-top: 20px;
      }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">Drive Log Not Found</h1>
        <p>The requested drive log was not found or is not publicly available.</p>
        <a href="/" class="button">Visit TorqueTrail</a>
    </div>
</body>
</html>`;
}