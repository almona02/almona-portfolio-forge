"""
Email adapter for Railway deployment - prioritizes Resend, falls back to SendGrid.
"""
import logging
from typing import List, Optional, Dict
from datetime import datetime

try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False

try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Email, To, Content
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False

from core.config import settings

logger = logging.getLogger(__name__)


class EmailAdapter:
    """
    Email adapter that prioritizes Railway Resend service, falls back to SendGrid.
    """
    
    def __init__(self):
        self.resend_client = None
        self.sendgrid_client = None
        self.email_provider = "none"
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize email clients based on available services and API keys."""
        
        # Try Resend first (Railway recommended)
        if RESEND_AVAILABLE and hasattr(settings, 'RESEND_API_KEY') and settings.RESEND_API_KEY:
            try:
                resend.api_key = settings.RESEND_API_KEY
                self.resend_client = resend
                self.email_provider = "resend"
                logger.info("✅ Resend email service initialized (Railway)")
                return
            except Exception as e:
                logger.warning(f"⚠️  Resend initialization failed: {e}")
        
        # Fallback to SendGrid
        if SENDGRID_AVAILABLE and settings.SENDGRID_API_KEY:
            try:
                self.sendgrid_client = SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
                self.email_provider = "sendgrid"
                logger.info("✅ SendGrid email service initialized (Fallback)")
                return
            except Exception as e:
                logger.warning(f"⚠️  SendGrid initialization failed: {e}")
        
        logger.warning("❌ No email service available - emails will be logged only")
        self.email_provider = "none"
    
    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None
    ) -> bool:
        """Send email using available service."""
        
        if not to_emails:
            logger.warning("No recipient emails provided")
            return False
        
        # Set defaults
        from_email = from_email or getattr(settings, 'RESEND_FROM_EMAIL', settings.SENDGRID_FROM_EMAIL)
        from_name = from_name or getattr(settings, 'RESEND_FROM_NAME', settings.SENDGRID_FROM_NAME)
        
        if self.email_provider == "resend":
            return await self._send_with_resend(
                to_emails, subject, html_content, text_content, from_email, from_name
            )
        elif self.email_provider == "sendgrid":
            return await self._send_with_sendgrid(
                to_emails, subject, html_content, text_content, from_email, from_name
            )
        else:
            # Log email for development/testing
            logger.info(f"""
📧 EMAIL (No Service Available):
To: {', '.join(to_emails)}
From: {from_name} <{from_email}>
Subject: {subject}
Content: {text_content or html_content[:200]}...
            """)
            return True
    
    async def _send_with_resend(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str],
        from_email: str,
        from_name: str
    ) -> bool:
        """Send email using Resend service."""
        try:
            params = {
                "from": f"{from_name} <{from_email}>",
                "to": to_emails,
                "subject": subject,
                "html": html_content,
            }
            
            if text_content:
                params["text"] = text_content
            
            email = resend.Emails.send(params)
            
            if email.get('id'):
                logger.info(f"✅ Resend email sent successfully. ID: {email['id']}")
                return True
            else:
                logger.error(f"❌ Resend email failed: {email}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Resend email error: {e}")
            return False
    
    async def _send_with_sendgrid(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str],
        from_email: str,
        from_name: str
    ) -> bool:
        """Send email using SendGrid service."""
        try:
            from_email_obj = Email(from_email, from_name)
            to_list = [To(email) for email in to_emails]
            
            mail = Mail(
                from_email=from_email_obj,
                to_emails=to_list,
                subject=subject,
                html_content=Content("text/html", html_content),
                plain_text_content=Content("text/plain", text_content) if text_content else None
            )
            
            response = self.sendgrid_client.send(mail)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"✅ SendGrid email sent successfully. Status: {response.status_code}")
                return True
            else:
                logger.error(f"❌ SendGrid email failed. Status: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ SendGrid email error: {e}")
            return False
    
    async def send_ticket_notification(
        self,
        ticket_data: Dict,
        recipient_emails: List[str],
        template_type: str = "ticket_created"
    ) -> bool:
        """Send ticket notification email."""
        
        # Create email content based on template type
        if template_type == "ticket_created":
            subject = f"🎫 New Ticket Created: {ticket_data.get('ticket_number', 'N/A')}"
            html_content = f"""
            <h2>New Service Ticket Created</h2>
            <p><strong>Ticket Number:</strong> {ticket_data.get('ticket_number', 'N/A')}</p>
            <p><strong>Title:</strong> {ticket_data.get('title', 'N/A')}</p>
            <p><strong>Priority:</strong> {ticket_data.get('priority', 'N/A')}</p>
            <p><strong>Status:</strong> {ticket_data.get('status', 'N/A')}</p>
            <p><strong>Customer:</strong> {ticket_data.get('customer_name', 'N/A')}</p>
            
            <h3>Description:</h3>
            <p>{ticket_data.get('description', 'No description provided')}</p>
            
            <hr>
            <p>Please log in to the admin dashboard to review and assign this ticket.</p>
            """
            
        elif template_type == "ticket_assigned":
            subject = f"🔧 Ticket Assigned: {ticket_data.get('ticket_number', 'N/A')}"
            html_content = f"""
            <h2>Ticket Assigned to You</h2>
            <p><strong>Ticket Number:</strong> {ticket_data.get('ticket_number', 'N/A')}</p>
            <p><strong>Title:</strong> {ticket_data.get('title', 'N/A')}</p>
            <p><strong>Priority:</strong> {ticket_data.get('priority', 'N/A')}</p>
            <p><strong>Customer:</strong> {ticket_data.get('customer_name', 'N/A')}</p>
            
            <h3>Description:</h3>
            <p>{ticket_data.get('description', 'No description provided')}</p>
            
            <hr>
            <p>Please review the ticket details and begin working on resolution.</p>
            """
            
        elif template_type == "ticket_resolved":
            subject = f"✅ Ticket Resolved: {ticket_data.get('ticket_number', 'N/A')}"
            html_content = f"""
            <h2>Your Ticket Has Been Resolved</h2>
            <p><strong>Ticket Number:</strong> {ticket_data.get('ticket_number', 'N/A')}</p>
            <p><strong>Title:</strong> {ticket_data.get('title', 'N/A')}</p>
            <p><strong>Resolution:</strong> {ticket_data.get('resolution', 'Issue resolved by our technical team')}</p>
            
            <hr>
            <p>If you have any questions about this resolution, please contact our support team.</p>
            """
        
        else:
            subject = f"📧 Ticket Update: {ticket_data.get('ticket_number', 'N/A')}"
            html_content = f"""
            <h2>Ticket Update</h2>
            <p><strong>Ticket Number:</strong> {ticket_data.get('ticket_number', 'N/A')}</p>
            <p>Your ticket has been updated. Please check your dashboard for details.</p>
            """
        
        # Create text version
        text_content = f"""
        Ticket Update: {ticket_data.get('ticket_number', 'N/A')}
        
        Title: {ticket_data.get('title', 'N/A')}
        Status: {ticket_data.get('status', 'N/A')}
        Priority: {ticket_data.get('priority', 'N/A')}
        
        Please check your dashboard for full details.
        
        Best regards,
        Almona Industrial Support Team
        """
        
        return await self.send_email(
            to_emails=recipient_emails,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
    
    def get_service_status(self) -> Dict:
        """Get email service status for health checks."""
        return {
            "provider": self.email_provider,
            "resend_available": RESEND_AVAILABLE and self.resend_client is not None,
            "sendgrid_available": SENDGRID_AVAILABLE and self.sendgrid_client is not None,
            "operational": self.email_provider != "none"
        }


# Global email adapter instance
email_adapter = EmailAdapter()


# FastAPI dependency
def get_email_service():
    """Get email service dependency."""
    return email_adapter