import { storage } from '../storage';
import { RsvpFollowupTemplate, RsvpFollowupLog, Guest, WeddingEvent } from '@shared/schema';
import { whatsappService } from './whatsapp';

export class RsvpFollowupService {
  /**
   * Process follow-up communications after an RSVP response
   * This will generate appropriate follow-up messages based on RSVP status
   */
  async processRsvpFollowup(guestId: number, eventId: number): Promise<boolean> {
    try {
      // Get the guest and verify event context
      const guest = await storage.getGuestWithEventContext(guestId, eventId);
      if (!guest) {
        console.error(`Cannot process RSVP follow-up: Guest ${guestId} not found in event ${eventId}`);
        return false;
      }

      // Get the event
      const event = await storage.getEvent(eventId);
      if (!event) {
        console.error(`Cannot process RSVP follow-up: Event ${eventId} not found`);
        return false;
      }

      // Determine appropriate follow-up template based on RSVP status
      const templateType = this.determineFollowupTemplateType(guest.rsvpStatus);
      if (!templateType) {
        console.log(`No follow-up needed for guest ${guestId} with RSVP status ${guest.rsvpStatus}`);
        return false;
      }

      // Get the appropriate template
      const template = await storage.getRsvpFollowupTemplateByType(eventId, templateType);
      if (!template) {
        console.warn(`Template type ${templateType} not found for event ${eventId}`);
        // Create default template if it doesn't exist
        const defaultTemplate = await this.createDefaultTemplate(eventId, templateType);
        if (!defaultTemplate) {
          return false;
        }
        return this.sendFollowupMessage(guest, event, defaultTemplate);
      }

      // Send the follow-up message
      return this.sendFollowupMessage(guest, event, template);
    } catch (error) {
      console.error('Error processing RSVP follow-up:', error);
      return false;
    }
  }

  /**
   * Determine the appropriate template type based on RSVP status
   */
  private determineFollowupTemplateType(rsvpStatus: string): string | null {
    switch (rsvpStatus.toLowerCase()) {
      case 'confirmed':
        return 'attendance_confirmed';
      case 'declined':
        return 'attendance_declined';
      case 'pending':
        return 'attendance_pending';
      case 'maybe':
        return 'attendance_maybe';
      default:
        return null;
    }
  }

  /**
   * Create a default template for a given type if it doesn't exist
   */
  private async createDefaultTemplate(eventId: number, templateType: string): Promise<RsvpFollowupTemplate | null> {
    try {
      const templateContent = this.getDefaultTemplateContent(templateType);
      
      const template = await storage.createRsvpFollowupTemplate({
        eventId,
        type: templateType,
        subject: `${this.getDefaultTemplateSubject(templateType)}`,
        message: templateContent,
        isActive: true
      });
      
      return template;
    } catch (error) {
      console.error(`Error creating default template for ${templateType}:`, error);
      return null;
    }
  }

  /**
   * Get default subject line for each template type
   */
  private getDefaultTemplateSubject(templateType: string): string {
    switch (templateType) {
      case 'attendance_confirmed':
        return 'Thank you for confirming your attendance';
      case 'attendance_declined':
        return 'We will miss you - Response received';
      case 'attendance_pending':
        return 'Your RSVP is pending - Additional information required';
      case 'attendance_maybe':
        return 'Thank you for your initial response';
      default:
        return 'Wedding RSVP Follow-up';
    }
  }

  /**
   * Get default template content for each template type
   */
  private getDefaultTemplateContent(templateType: string): string {
    switch (templateType) {
      case 'attendance_confirmed':
        return `Dear {{guest_name}},

Thank you for confirming your attendance to our wedding celebration. We're delighted that you'll be joining us on our special day!

We'll be sending you more details about the event schedule, venue information, and accommodation options in the coming weeks.

If you have any dietary restrictions or special requirements, please let us know as soon as possible.

Looking forward to celebrating with you!

Warm regards,
{{couple_names}}`;

      case 'attendance_declined':
        return `Dear {{guest_name}},

Thank you for letting us know that you won't be able to attend our wedding celebration. While we'll miss having you there, we completely understand that schedules can be complicated.

We appreciate your response and will keep you in our thoughts on our special day.

Wishing you all the best,
{{couple_names}}`;

      case 'attendance_pending':
        return `Dear {{guest_name}},

Thank you for starting your RSVP process for our wedding. We noticed that your response is still pending completion.

To help us with our planning, could you please complete your RSVP at your earliest convenience? If you've encountered any issues or have questions, please don't hesitate to reach out.

You can complete your RSVP by visiting: {{rsvp_link}}

Looking forward to your response,
{{couple_names}}`;

      case 'attendance_maybe':
        return `Dear {{guest_name}},

Thank you for your initial response to our wedding invitation. We understand that you're not sure if you can attend at this time.

We'd appreciate if you could let us know your final decision by {{rsvp_deadline}}. This will help us tremendously with our planning.

If you have any questions or concerns, please feel free to reach out.

Best wishes,
{{couple_names}}`;

      default:
        return `Dear {{guest_name}},

Thank you for your response to our wedding invitation. We appreciate you taking the time to RSVP.

If you have any questions or need to update your response, please don't hesitate to contact us.

Warm regards,
{{couple_names}}`;
    }
  }

  /**
   * Send follow-up message to guest based on template
   */
  private async sendFollowupMessage(
    guest: Guest, 
    event: WeddingEvent, 
    template: RsvpFollowupTemplate
  ): Promise<boolean> {
    try {
      // Replace template variables
      const personalizedMessage = this.personalizeMessage(guest, event, template.message);
      const personalizedSubject = this.personalizeMessage(guest, event, template.subject);

      // Determine communication channel (email or WhatsApp)
      let sent = false;

      // Prefer WhatsApp if phone is available and WhatsApp is configured
      if (guest.phone && event.whatsappConfigured) {
        sent = await this.sendWhatsAppMessage(guest, personalizedMessage);
      }

      // Fall back to email or use email if preference is set
      if (!sent && guest.email) {
        sent = await this.sendEmailMessage(guest, personalizedSubject, personalizedMessage);
      }

      // Log the follow-up communication
      if (sent) {
        await storage.createRsvpFollowupLog({
          guestId: guest.id,
          templateId: template.id,
          messageType: guest.phone && event.whatsappConfigured ? 'whatsapp' : 'email',
          success: true
        });
      }

      return sent;
    } catch (error) {
      console.error('Error sending follow-up message:', error);
      
      // Log the failed attempt
      await storage.createRsvpFollowupLog({
        guestId: guest.id,
        templateId: template.id,
        messageType: 'unknown',
        success: false,
        errorMessage: error.message || 'Unknown error'
      });
      
      return false;
    }
  }

  /**
   * Replace template variables with actual values
   */
  private personalizeMessage(guest: Guest, event: WeddingEvent, message: string): string {
    let personalizedMessage = message;
    
    // Basic replacements
    personalizedMessage = personalizedMessage.replace(/{{guest_name}}/g, `${guest.firstName} ${guest.lastName}`);
    personalizedMessage = personalizedMessage.replace(/{{first_name}}/g, guest.firstName);
    personalizedMessage = personalizedMessage.replace(/{{last_name}}/g, guest.lastName);
    personalizedMessage = personalizedMessage.replace(/{{couple_names}}/g, event.coupleNames);
    personalizedMessage = personalizedMessage.replace(/{{event_name}}/g, event.title);
    personalizedMessage = personalizedMessage.replace(/{{rsvp_status}}/g, guest.rsvpStatus);
    
    // Generate RSVP link
    const rsvpLink = `${process.env.APP_URL || 'https://your-wedding-site.com'}/rsvp?eid=${event.id}&gid=${guest.id}`;
    personalizedMessage = personalizedMessage.replace(/{{rsvp_link}}/g, rsvpLink);
    
    // RSVP deadline is typically 4 weeks before the event start date
    const eventDate = new Date(event.startDate);
    const rsvpDeadline = new Date(eventDate);
    rsvpDeadline.setDate(eventDate.getDate() - 28);
    const formattedDeadline = rsvpDeadline.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    personalizedMessage = personalizedMessage.replace(/{{rsvp_deadline}}/g, formattedDeadline);
    
    return personalizedMessage;
  }

  /**
   * Send a WhatsApp message
   */
  private async sendWhatsAppMessage(guest: Guest, message: string): Promise<boolean> {
    try {
      // Assume we have a WhatsApp service with a sendMessage method
      const result = await whatsappService.sendDirectMessage(guest.phone, message);
      return result.success;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Send an email message
   */
  private async sendEmailMessage(guest: Guest, subject: string, message: string): Promise<boolean> {
    try {
      // TODO: Implement email sending functionality
      // For now, just log the attempt and return success
      console.log(`[EMAIL] To: ${guest.email}, Subject: ${subject}`);
      console.log(`[EMAIL] Message: ${message}`);
      
      // Mock successful email sending
      return true;
    } catch (error) {
      console.error('Error sending email message:', error);
      return false;
    }
  }
}

export const rsvpFollowupService = new RsvpFollowupService();