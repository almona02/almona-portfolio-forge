"""
Email service using SendGrid for ticket notifications.
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from jinja2 import Environment, FileSystemLoader, select_autoescape

from core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending ticket notifications via SendGrid."""
    
    def __init__(self):
        self.sendgrid_client = None
        self.jinja_env = None
        self._initialize_clients()
    
    def _initialize_clients(self) -> None:
        """Initialize SendGrid client and Jinja2 environment."""
        try:
            if not settings.SENDGRID_API_KEY:
                logger.warning(
                    "SENDGRID_API_KEY not configured - "
                    "email service will be disabled"
                )
                self.sendgrid_client = None
            else:
                self.sendgrid_client = SendGridAPIClient(
                    api_key=settings.SENDGRID_API_KEY
                )
            
            # Initialize Jinja2 environment for email templates
            self.jinja_env = Environment(
                loader=FileSystemLoader('templates/email'),
                autoescape=select_autoescape(['html', 'xml'])
            )
            
            logger.info("Email service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize email service: {e}")
            raise
    
    def _render_template(
        self,
        template_name: str,
        context: Dict
    ) -> tuple[str, str]:
        """Render email template with context data."""
        try:
            # Add common context variables
            context.update({
                'company_name': settings.COMPANY_NAME,
                'company_website': settings.COMPANY_WEBSITE,
                'current_year': datetime.now().year,
                'support_email': settings.SENDGRID_FROM_EMAIL
            })
            
            # Render HTML template
            html_template = self.jinja_env.get_template(
                f"{template_name}.html"
            )
            html_content = html_template.render(context)
            
            # Render text template (fallback)
            try:
                text_template = self.jinja_env.get_template(
                    f"{template_name}.txt"
                )
                text_content = text_template.render(context)
            except Exception:
                # If no text template exists, create basic text version
                text_content = f"""
                {context.get('subject', 'Notification')}
                
                Please view this email in HTML format for the best experience.
                
                Best regards,
                {settings.COMPANY_NAME}
                """
            
            return html_content, text_content
            
        except Exception as e:
            logger.error(f"Error rendering template {template_name}: {e}")
            raise
    
    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        template_name: str,
        context: Dict,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None
    ) -> bool:
        """Send email using SendGrid with template rendering."""
        try:
            if not self.sendgrid_client:
                logger.warning(
                    f"Email service disabled - would send email to "
                    f"{len(to_emails)} recipients: {subject}"
                )
                return True  # Return True to not break the flow
            
            if not to_emails:
                logger.warning("No recipient emails provided")
                return False
            
            # Render email content
            html_content, text_content = self._render_template(
                template_name, context
            )
            
            # Create SendGrid mail object
            from_email = Email(
                settings.SENDGRID_FROM_EMAIL,
                settings.SENDGRID_FROM_NAME
            )
            
            # Create recipient list
            to_list = [To(email) for email in to_emails]
            
            # Create mail object
            mail = Mail(
                from_email=from_email,
                to_emails=to_list,
                subject=subject,
                html_content=Content("text/html", html_content),
                plain_text_content=Content("text/plain", text_content)
            )
            
            # Add CC recipients if provided
            if cc_emails:
                for cc_email in cc_emails:
                    mail.add_cc(Email(cc_email))
            
            # Add BCC recipients if provided
            if bcc_emails:
                for bcc_email in bcc_emails:
                    mail.add_bcc(Email(bcc_email))
            
            # Send email
            response = self.sendgrid_client.send(mail)
            
            if response.status_code in [200, 201, 202]:
                logger.info(
                    f"Email sent successfully to {len(to_emails)} recipients"
                )
                return True
            else:
                logger.error(
                    f"Failed to send email. Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False
    
    async def send_ticket_created_notification(
        self,
        ticket_data: Dict,
        admin_emails: List[str]
    ) -> bool:
        """Send notification when a new ticket is created."""
        context = {
            'ticket': ticket_data,
            'subject': (
                f"New Ticket Created: {ticket_data.get('ticket_number')}"
            )
        }
        
        return await self.send_email(
            to_emails=admin_emails,
            subject=context['subject'],
            template_name='ticket_created',
            context=context
        )
    
    async def send_ticket_assigned_notification(
        self,
        ticket_data: Dict,
        technician_email: str
    ) -> bool:
        """Send notification when a ticket is assigned to a technician."""
        context = {
            'ticket': ticket_data,
            'subject': f"Ticket Assigned: {ticket_data.get('ticket_number')}"
        }
        
        return await self.send_email(
            to_emails=[technician_email],
            subject=context['subject'],
            template_name='ticket_assigned',
            context=context
        )
    
    async def send_message_notification(
        self,
        ticket_data: Dict,
        message_data: Dict,
        recipient_email: str,
        is_customer: bool = True
    ) -> bool:
        """Send notification when a new message is added to a ticket."""
        template_name = (
            'message_added_customer' if is_customer else 'message_added_admin'
        )
        
        context = {
            'ticket': ticket_data,
            'message': message_data,
            'is_customer': is_customer,
            'subject': (
                f"New Message on Ticket {ticket_data.get('ticket_number')}"
            )
        }
        
        return await self.send_email(
            to_emails=[recipient_email],
            subject=context['subject'],
            template_name=template_name,
            context=context
        )
    
    async def send_ticket_resolved_notification(
        self,
        ticket_data: Dict,
        customer_email: str
    ) -> bool:
        """Send notification when a ticket is resolved."""
        context = {
            'ticket': ticket_data,
            'subject': f"Ticket Resolved: {ticket_data.get('ticket_number')}"
        }
        
        return await self.send_email(
            to_emails=[customer_email],
            subject=context['subject'],
            template_name='ticket_resolved',
            context=context
        )


# Global email service instance
email_service = EmailService()
