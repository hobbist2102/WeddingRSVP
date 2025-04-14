import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Please log in again' });
};

const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user && (req.user as any).role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden' });
};

const router = Router();

// Schema for validating OAuth configuration updates
const oauthConfigSchema = z.object({
  // Gmail settings
  gmailClientId: z.string().optional(),
  gmailClientSecret: z.string().optional(), 
  gmailRedirectUri: z.string().optional(),
  useGmail: z.boolean().optional(),
  
  // Outlook settings
  outlookClientId: z.string().optional(),
  outlookClientSecret: z.string().optional(),
  outlookRedirectUri: z.string().optional(),
  useOutlook: z.boolean().optional(),
  
  // SendGrid settings
  sendGridApiKey: z.string().optional(),
  useSendGrid: z.boolean().optional(),
  
  // General email settings
  emailFrom: z.string().optional(),
  emailReplyTo: z.string().optional(),
});

// Get event's OAuth configuration
router.get("/:eventId/oauth-config", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }
    
    const event = await storage.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    
    // Return only the OAuth-related fields
    res.json({
      // Gmail settings
      gmailClientId: event.gmailClientId,
      gmailRedirectUri: event.gmailRedirectUri,
      gmailAccount: event.gmailAccount,
      useGmail: event.useGmail,
      
      // Outlook settings
      outlookClientId: event.outlookClientId,
      outlookRedirectUri: event.outlookRedirectUri,
      outlookAccount: event.outlookAccount,
      useOutlook: event.useOutlook,
      
      // SendGrid settings
      useSendGrid: event.useSendGrid,
      
      // General email settings
      emailFrom: event.emailFrom,
      emailReplyTo: event.emailReplyTo,
    });
  } catch (error) {
    console.error("Failed to get OAuth configuration:", error);
    res.status(500).json({ 
      message: "An error occurred while fetching OAuth configuration", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update event's OAuth configuration
router.patch("/:eventId/oauth-config", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }
    
    const event = await storage.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    
    // Validate the request body
    const validationResult = oauthConfigSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid OAuth configuration", 
        errors: validationResult.error.format() 
      });
    }
    
    // Update the OAuth configuration
    const updatedEvent = await storage.updateEvent(eventId, validationResult.data);
    
    if (!updatedEvent) {
      return res.status(500).json({
        message: "Failed to update OAuth configuration",
        details: "Event update returned no data"
      });
    }
    
    res.json({
      message: "OAuth configuration updated successfully",
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        // Include other non-sensitive fields as needed
      }
    });
  } catch (error) {
    console.error("Failed to update OAuth configuration:", error);
    res.status(500).json({ 
      message: "An error occurred while updating OAuth configuration", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;