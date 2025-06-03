import { storage } from "./storage";

export async function generatePublicShareHTML(driveLogId: number, baseUrl: string): Promise<string> {
  try {
    console.log(`Attempting to fetch drive log with ID: ${driveLogId}`);
    const driveLog = await storage.getDriveLogWithPitstops(driveLogId);
    
    if (!driveLog) {
      console.log(`Drive log ${driveLogId} not found in database`);
      return generateNotFoundHTML();
    }
    
    console.log(`Drive log ${driveLogId} found. isPublic: ${driveLog.isPublic}`);
    
    if (!driveLog.isPublic) {
      console.log(`Drive log ${driveLogId} is not public`);
      return generateNotFoundHTML();
    }

    // Get user information
    console.log(`Fetching user for drive log ${driveLogId}, userId: ${driveLog.userId}`);
    const user = await storage.getUser(driveLog.userId);
    if (!user) {
      console.log(`User ${driveLog.userId} not found for drive log ${driveLogId}`);
      return generateNotFoundHTML();
    }
    console.log(`User found: ${user.firstName} ${user.lastName}`);
    
    console.log(`Drive log ${driveLogId} validation successful, generating HTML`);
    
    // Log the actual structure of driveLog for debugging
    console.log(`Drive log structure:`, {
      id: driveLog.id,
      title: driveLog.title,
      isPublic: driveLog.isPublic,
      userId: driveLog.userId,
      hasTitle: !!driveLog.title,
      hasTitleImage: !!driveLog.titleImageUrl
    });

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
    
    // Add timestamp for cache busting
    const timestamp = Date.now();
    const cacheBustedImageUrl = `${imageUrl}?v=${timestamp}`;

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
    <meta property="og:image" content="${cacheBustedImageUrl}">
    <meta property="og:image:secure_url" content="${cacheBustedImageUrl}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${driveLog.title} - Drive log shared on TorqueTrail">
    <meta property="og:url" content="${shareUrl}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="TorqueTrail">
    <meta property="article:author" content="${authorName}">
    
    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${driveLog.title} - TorqueTrail">
    <meta name="twitter:description" content="${description} by ${authorName}">
    <meta name="twitter:image" content="${cacheBustedImageUrl}">
    <meta name="twitter:image:alt" content="${driveLog.title} - Drive log shared on TorqueTrail">
    
    <!-- WhatsApp specific meta tags -->
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    
    <!-- Additional meta tags -->
    <meta name="author" content="${authorName}">
    <link rel="canonical" href="${shareUrl}">
</head>
<body>
    <!-- Hidden content for social media crawlers only -->
    <div style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;">
        <h1>${driveLog.title}</h1>
        <p>Shared by ${authorName}</p>
        <p>${description || `Drive from ${driveLog.startLocation} to ${driveLog.endLocation}`}</p>
        <p>From: ${driveLog.startLocation}</p>
        <p>To: ${driveLog.endLocation}</p>
        <p>Distance: ${driveLog.distance} km</p>
        ${vehicle ? `<p>Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}</p>` : ''}
    </div>
    
    <!-- Client-side redirect for regular users -->
    <script>
      // Check if this is a social media crawler
      const userAgent = navigator.userAgent || '';
      const isCrawler = /facebookexternalhit|twitterbot|whatsapp|linkedinbot|slackbot|telegrambot/i.test(userAgent);
      
      // If not a crawler, redirect to the React app
      if (!isCrawler && window.location.pathname.startsWith('/share/')) {
        const driveLogId = window.location.pathname.split('/share/')[1];
        window.location.replace('/public-drive-log/' + driveLogId);
      }
    </script>
    
    <!-- React app container -->
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
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