import { Resend } from 'resend';
import { Guest, WeddingEvent } from '@shared/schema';
import * as SendGrid from '@sendgrid/mail';
import nodemailer from 'nodemailer';

/**
 * Email service that supports multiple providers
 * Currently implemented: Gmail, Outlook, SendGrid, Resend
 */
export class EmailService {
  // Provider types we support
  private static readonly PROVIDER_RESEND = 'resend';
  private static readonly PROVIDER_SENDGRID = 'sendgrid';
  private static readonly PROVIDER_GMAIL = 'gmail';
  private static readonly PROVIDER_OUTLOOK = 'outlook';

  private provider: string;
  private apiKey: string | null;
  private resendClient: Resend | null = null;
  private sendGridClient: any = null;
  private nodemailerTransport: any = null;
  private eventId: number;
  private defaultFromEmail: string;
  private eventName: string;
  private event: WeddingEvent | null = null;

  constructor(eventId: number, provider: string, apiKey: string | null = null, defaultFromEmail: string = '', eventName: string = '', event: WeddingEvent | null = null) {
    this.eventId = eventId;
    this.provider = provider.toLowerCase();
    this.apiKey = apiKey;
    this.defaultFromEmail = defaultFromEmail;
    this.eventName = eventName;
    this.event = event;

    // Initialize the appropriate client based on provider
    try {
      if (this.provider === EmailService.PROVIDER_RESEND && this.apiKey) {
        this.resendClient = new Resend(this.apiKey);
        console.log(`Initialized Resend client for event ${eventId}`);
      } 
      else if (this.provider === EmailService.PROVIDER_SENDGRID && this.apiKey) {
        this.sendGridClient = SendGrid;
        this.sendGridClient.setApiKey(this.apiKey);
        console.log(`Initialized SendGrid client for event ${eventId}`);
      }
      else if (this.provider === EmailService.PROVIDER_GMAIL && this.apiKey) {
        try {
          // Use the stored event data for OAuth2 configuration
          if (!this.event) {
            console.warn(`No event data available for Gmail OAuth2 configuration`);
            return;
          }

          this.nodemailerTransport = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
              type: 'OAuth2',
              user: defaultFromEmail,
              clientId: this.event.gmailClientId || process.env.GMAIL_CLIENT_ID,
              clientSecret: this.event.gmailClientSecret || process.env.GMAIL_CLIENT_SECRET,
              refreshToken: this.event.gmailRefreshToken,
              accessToken: this.apiKey
            }
          });
          console.log(`Initialized Gmail client for event ${eventId}`);
        } catch (err) {
          console.error(`Failed to initialize Gmail client:`, err);
        }
      }
      else if (this.provider === EmailService.PROVIDER_OUTLOOK && this.apiKey) {
        try {
          // Get the event to retrieve the refresh token
          const event = global.currentEvent || {};
          
          this.nodemailerTransport = nodemailer.createTransport({
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            auth: {
              type: 'OAuth2',
              user: defaultFromEmail,
              clientId: event.outlookClientId || process.env.OUTLOOK_CLIENT_ID,
              clientSecret: event.outlookClientSecret || process.env.OUTLOOK_CLIENT_SECRET,
              refreshToken: event.outlookRefreshToken,
              accessToken: this.apiKey
            }
          });
          console.log(`Initialized Outlook client for event ${eventId}`);
        } catch (err) {
          console.error(`Failed to initialize Outlook client:`, err);
        }
      }
    } catch (error) {
      console.error(`Failed to initialize email client for provider ${provider}:`, error);
    }
  }

  /**
   * Check if the email service is configured and ready to use
   */
  public isConfigured(): boolean {
    // Check if we have a from email address
    if (!this.defaultFromEmail) {
      console.warn(`No from email address configured for event ${this.eventId}`);
      return false;
    }

    // Check provider-specific configuration
    if (this.provider === EmailService.PROVIDER_RESEND) {
      return !!this.resendClient;
    }
    else if (this.provider === EmailService.PROVIDER_SENDGRID) {
      return !!this.sendGridClient;
    }
    else if (this.provider === EmailService.PROVIDER_GMAIL) {
      return !!this.nodemailerTransport;
    }
    else if (this.provider === EmailService.PROVIDER_OUTLOOK) {
      return !!this.nodemailerTransport;
    }
    
    console.warn(`Unknown email provider: ${this.provider} for event ${this.eventId}`);
    return false;
  }

  /**
   * Send a simple email
   */
  public async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
    text?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const { to, subject, html, text, from } = options;
    const fromEmail = from || this.defaultFromEmail;

    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Email service not properly configured. Check API key and from email.'
      };
    }

    try {
      // Format recipient(s) as an array
      const toAddresses = Array.isArray(to) ? to : [to];
      
      // Handle different providers
      if (this.provider === EmailService.PROVIDER_RESEND) {
        if (!this.resendClient) {
          return { success: false, error: 'Resend client not initialized' };
        }
        
        const response = await this.resendClient.emails.send({
          from: fromEmail,
          to: toAddresses,
          subject,
          html,
          text: text || undefined,
        });

        if (response.error) {
          console.error(`Resend email sending failed: ${response.error.message}`);
          return {
            success: false,
            error: response.error.message
          };
        }

        return {
          success: true,
          id: response.data?.id
        };
      }
      
      else if (this.provider === EmailService.PROVIDER_SENDGRID) {
        if (!this.sendGridClient) {
          return { success: false, error: 'SendGrid client not initialized' };
        }
        
        const msg = {
          to: toAddresses,
          from: fromEmail,
          subject: subject,
          text: text || '',
          html: html,
        };
        
        try {
          const response = await this.sendGridClient.send(msg);
          console.log('SendGrid email sent successfully:', response);
          
          return {
            success: true,
            id: response?.[0]?.headers['x-message-id'] || 'unknown'
          };
        } catch (error: any) {
          console.error('SendGrid email error:', error);
          
          if (error.response) {
            // Extract more detailed error information
            const errorDetails = error.response.body?.errors?.map((err: any) => err.message).join(', ') 
              || error.message;
              
            return {
              success: false,
              error: `SendGrid error: ${errorDetails}`
            };
          }
          
          return {
            success: false,
            error: `SendGrid error: ${error.message}`
          };
        }
      }
      
      else if (this.provider === EmailService.PROVIDER_GMAIL || this.provider === EmailService.PROVIDER_OUTLOOK) {
        if (!this.nodemailerTransport) {
          return { 
            success: false, 
            error: `${this.provider} transport not initialized` 
          };
        }
        
        // For nodemailer, we need to extract the email address from the formatted from string
        // if it's in the format "Name <email@example.com>"
        let fromEmailAddress = fromEmail;
        if (fromEmail.includes('<') && fromEmail.includes('>')) {
          fromEmailAddress = fromEmail.match(/<([^>]+)>/)?.[1] || fromEmail;
        }
        
        try {
          const mailOptions = {
            from: fromEmail,
            to: toAddresses.join(', '),
            subject: subject,
            text: text || '',
            html: html
          };
          
          const info = await this.nodemailerTransport.sendMail(mailOptions);
          console.log(`${this.provider} email sent:`, info.messageId);
          
          return {
            success: true,
            id: info.messageId
          };
        } catch (error: any) {
          console.error(`${this.provider} email error:`, error);
          
          return {
            success: false,
            error: `${this.provider} error: ${error.message}`
          };
        }
      }

      // If we get here, the provider is not supported
      return {
        success: false,
        error: `Unsupported email provider: ${this.provider}`
      };
    } catch (error: any) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error.message || 'Unknown error sending email'
      };
    }
  }

  /**
   * Send an RSVP form email to a guest
   */
  public async sendRSVPEmail(guest: Guest, event: WeddingEvent, rsvpLink: string): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!guest.email) {
      return {
        success: false,
        error: 'Guest email is required'
      };
    }

    const guestName = `${guest.firstName} ${guest.lastName}`;
    const subject = `RSVP Request for ${event.title}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #9c27b0; text-align: center; padding-bottom: 10px; border-bottom: 1px solid #eee;">
          ${event.title}
        </h2>
        <p>Dear ${guestName},</p>
        <p>
          You are cordially invited to celebrate the wedding of <strong>${event.brideName}</strong> and <strong>${event.groomName}</strong>.
        </p>
        <p>
          <strong>When:</strong> ${event.startDate} to ${event.endDate}<br>
          <strong>Where:</strong> ${event.location}
        </p>
        <p>
          Please let us know if you'll be joining us by clicking the link below to complete your RSVP:
        </p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${rsvpLink}" style="background-color: #9c27b0; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            RSVP Now
          </a>
        </p>
        <p>
          If the button doesn't work, you can copy and paste this link into your browser:<br>
          <a href="${rsvpLink}">${rsvpLink}</a>
        </p>
        <p>
          We look forward to celebrating with you!
        </p>
        <p style="font-style: italic; color: #666;">
          ${event.brideName} & ${event.groomName}
        </p>
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
          This invitation was sent by ${event.title} Wedding RSVP System
        </div>
      </div>
    `;

    const text = `
Dear ${guestName},

You are cordially invited to celebrate the wedding of ${event.brideName} and ${event.groomName}.

When: ${event.startDate} to ${event.endDate}
Where: ${event.location}

Please let us know if you'll be joining us by visiting:
${rsvpLink}

We look forward to celebrating with you!

${event.brideName} & ${event.groomName}
    `;

    return this.sendEmail({
      to: guest.email,
      subject,
      html,
      text
    });
  }

  /**
   * Create an EmailService instance from an event object
   */
  public static fromEvent(event: WeddingEvent): EmailService {
    if (!event) {
      throw new Error('Event is required to create an email service');
    }

    // Extract email configuration from the event
    const emailProvider = event.emailProvider || 'resend';
    
    // Determine the API key to use based on the event's configuration
    let emailApiKey = null;
    
    // First try the direct API key in the event object
    if (event.emailApiKey) {
      emailApiKey = event.emailApiKey;
      console.log(`Using direct email API key for event ${event.id}`);
    }
    // If Gmail is configured and selected as provider, use Gmail OAuth tokens
    else if (event.useGmail && emailProvider === 'gmail' && event.gmailAccessToken) {
      emailApiKey = event.gmailAccessToken;
      console.log(`Using Gmail OAuth token for event ${event.id}`);
    }
    // If Outlook is configured and selected as provider, use Outlook OAuth tokens
    else if (event.useOutlook && emailProvider === 'outlook' && event.outlookAccessToken) {
      emailApiKey = event.outlookAccessToken;
      console.log(`Using Outlook OAuth token for event ${event.id}`);
    }
    // If SendGrid is configured and selected as provider, use SendGrid API key
    else if (event.useSendGrid && emailProvider === 'sendgrid' && event.sendGridApiKey) {
      emailApiKey = event.sendGridApiKey;
      console.log(`Using SendGrid API key for event ${event.id}`);
    }
    // Fallback to environment variables if available
    else if (process.env.RESEND_API_KEY && emailProvider === 'resend') {
      emailApiKey = process.env.RESEND_API_KEY;
      console.log(`Using environment RESEND_API_KEY for event ${event.id}`);
    }
    
    if (!emailApiKey) {
      console.warn(`No email API key found for event ${event.id} with provider ${emailProvider}`);
    }
    
    // Determine from email address
    // Default format is "Wedding of [Couple] <noreply@domain.com>"
    const fromName = `Wedding of ${event.coupleNames}`;
    const fromDomain = event.emailFromDomain || 'example.com';
    const fromEmail = event.emailFromAddress || `noreply@${fromDomain}`;
    const formattedFromEmail = `${fromName} <${fromEmail}>`;

    // Log the email configuration (without API key details for security)
    console.log(`Email service configuration for event ${event.id}:
      - Provider: ${emailProvider}
      - From: ${formattedFromEmail}
      - API Key configured: ${!!emailApiKey}
    `);

    return new EmailService(
      event.id,
      emailProvider,
      emailApiKey,
      formattedFromEmail,
      event.title,
      event
    );
  }
}

/**
 * Get the RSVP link for a guest
 */
export function generateRSVPLink(baseUrl: string, eventId: number, guestId: number, token: string): string {
  return `${baseUrl}/guest-rsvp?token=${token}`;
}