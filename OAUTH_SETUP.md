# OAuth Authentication Setup

## Google OAuth Configuration

1. **Google Cloud Console Setup:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing project
   - Enable Google+ API and Google Sign-In API
   - Go to "Credentials" section
   - Create OAuth 2.0 Client ID
   - Set application type to "Web application"
   - Add authorized redirect URIs:
     ```
     https://your-domain.replit.app/api/auth/google/callback
     http://localhost:5000/api/auth/google/callback (for development)
     ```

2. **Required Environment Variables:**
   ```
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

## Facebook OAuth Configuration

1. **Facebook Developer Console Setup:**
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create a new app or select existing app
   - Add "Facebook Login" product
   - Configure OAuth redirect URIs:
     ```
     https://your-domain.replit.app/api/auth/facebook/callback
     http://localhost:5000/api/auth/facebook/callback (for development)
     ```

2. **Required Environment Variables:**
   ```
   FACEBOOK_APP_ID=your-facebook-app-id
   FACEBOOK_APP_SECRET=your-facebook-app-secret
   ```

## Authentication Flow

The application now supports three authentication methods:

1. **Replit Authentication** (Default)
   - Native Replit user authentication
   - Automatic user provisioning

2. **Google OAuth**
   - Social login via Google accounts
   - Profile information auto-populated

3. **Facebook OAuth**
   - Social login via Facebook accounts
   - Profile information auto-populated

## User Experience

- Users see a unified login page with all authentication options
- Social login buttons for Google and Facebook
- Automatic account creation for new social users
- Seamless integration with existing TorqueTrail features

## Security Features

- Unique user IDs for each provider (google:123, facebook:456)
- Secure token handling
- Profile information synchronization
- Automatic logout handling