import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { log } from './vite';

// Add proper type declaration for Express.User
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      name: string;
      email: string;
      role: string;
    }
  }
}

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user?.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: "Forbidden" });
  }
};

// RSVP link handler middleware - place this before any other routes
export const rsvpLinkHandler = (req: Request, res: Response, next: NextFunction) => {
  // Check if this is an RSVP link path, handle both formats of the URL:
  // 1. /guest-rsvp/TOKEN
  // 2. /guest-rsvp/guest-rsvp/TOKEN (duplicate path issue)
  if (req.path.startsWith('/guest-rsvp/')) {
    log(`RSVP link handler processing: ${req.path}`);
    console.log(`[RSVP Debug] Request path: ${req.path}, Query:`, req.query);
    
    // In production, we need to serve the index.html
    if (process.env.NODE_ENV === 'production') {
      try {
        const indexPath = path.join(process.cwd(), 'dist/public/index.html');
        if (fs.existsSync(indexPath)) {
          log(`Serving index.html for RSVP path: ${req.path}`);
          
          // Extract the token from the URL, handling both URL formats
          let token;
          if (req.path.startsWith('/guest-rsvp/guest-rsvp/')) {
            // This is the duplicate path issue we need to fix
            token = req.path.replace('/guest-rsvp/guest-rsvp/', '');
            log(`Detected duplicated path segment, extracted token: ${token}`);
          } else {
            // Standard path format
            token = req.path.replace('/guest-rsvp/', '');
          }
          
          // Read the index.html file
          const htmlContent = fs.readFileSync(indexPath, 'utf8');
          
          // Inject a script that sets the token in the window object
          const injectedHtml = htmlContent.replace(
            '<head>', 
            `<head>
            <script>
              window.rsvpToken = "${token}";
              console.log("RSVP token loaded from direct URL:", "${token}");
              // Also save to localStorage as a fallback
              localStorage.setItem("rsvp_token", "${token}");
            </script>`
          );
          
          // Send the modified HTML
          return res.send(injectedHtml);
        }
      } catch (error) {
        console.error('Error serving RSVP page:', error);
      }
    } else {
      // In development, check if we have a duplicate path issue
      if (req.path.startsWith('/guest-rsvp/guest-rsvp/')) {
        // Log the duplicate path issue for debugging
        log(`Detected duplicated path segment in development mode: ${req.path}`);
        
        // Store the token information for development mode
        const token = req.path.replace('/guest-rsvp/guest-rsvp/', '');
        // Note: We're not using the session here as it's not properly typed
        // Just log it for debugging purposes
        log(`Development mode: Extracted token from duplicated path: ${token}`);
      }
    }
    
    // In development, we'll let Vite handle it
    log('Letting Vite handle RSVP link in development mode');
  }
  
  next();
};