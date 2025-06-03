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
      /* Hide static content once React loads */
      .static-content {
        display: block;
      }
      .react-loaded .static-content {
        display: none;
      }
      
      /* Static fallback styles for social media crawlers */
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #0a0a0a;
        color: #ffffff;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
        background: #1a1a1a;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        overflow: hidden;
        margin-top: 20px;
      }
      .hero-image {
        width: 100%;
        height: 300px;
        object-fit: cover;
      }
      .content {
        padding: 24px;
      }
      .title {
        font-size: 24px;
        font-weight: bold;
        margin: 0 0 8px 0;
        color: #ffffff;
      }
      .author {
        color: #94a3b8;
        margin-bottom: 16px;
      }
      .description {
        line-height: 1.6;
        margin-bottom: 20px;
        color: #e2e8f0;
      }
      .details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }
      .detail {
        padding: 12px;
        background-color: #2a2a2a;
        border-radius: 6px;
      }
      .detail-label {
        font-weight: 600;
        margin-bottom: 4px;
        color: #ffffff;
      }
      .button {
        display: inline-block;
        background-color: #3b82f6;
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 500;
      }
      .loading {
        text-align: center;
        padding: 40px;
        color: #94a3b8;
      }
      
      /* React app container */
      #root {
        min-height: 100vh;
      }
    </style>
    
    <script>
      // Mark when React has loaded
      window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          document.body.classList.add('react-loaded');
        }, 1000);
      });
    </script>
</head>
<body>
    <!-- Static content for social media crawlers -->
    <div class="static-content">
        <div class="container">
            ${driveLog.titleImageUrl ? `<img src="${imageUrl}" alt="${driveLog.title}" class="hero-image">` : ''}
            <div class="content">
                <h1 class="title">${driveLog.title}</h1>
                <p class="author">Shared by ${authorName}</p>
                ${description ? `<p class="description">${description}</p>` : ''}
                
                <div class="details">
                    <div class="detail">
                        <div class="detail-label">From</div>
                        <div>${driveLog.startLocation}</div>
                    </div>
                    <div class="detail">
                        <div class="detail-label">To</div>
                        <div>${driveLog.endLocation}</div>
                    </div>
                    <div class="detail">
                        <div class="detail-label">Distance</div>
                        <div>${driveLog.distance} km</div>
                    </div>
                    ${vehicle ? `
                    <div class="detail">
                        <div class="detail-label">Vehicle</div>
                        <div>${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="loading">
                    <p>Loading full experience...</p>
                </div>
            </div>
        </div>
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