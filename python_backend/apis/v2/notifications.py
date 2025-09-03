"""
FastAPI router for email notification endpoints.
"""
import logging
from typing import List

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse

from models.notification_models import (
    TicketCreatedNotificationRequest,
    TicketAssignedNotificationRequest,
    MessageAddedNotificationRequest,
    TicketResolvedNotificationRequest,
    NotificationResponse,
    NotificationError,
    BulkNotificationRequest,
    BulkNotificationResponse
)
from core.supabase_client import supabase_client
from core.email_service import email_service
from core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_ticket_data(ticket_id: str) -> dict:
    """Helper function to get ticket data from Supabase."""
    try:
        ticket_data = await supabase_client.get_ticket_details(ticket_id)
        if not ticket_data:
            raise HTTPException(
                status_code=404,
                detail=f"Ticket with ID {ticket_id} not found"
            )
        return ticket_data
    except Exception as e:
        logger.error(f"Error fetching ticket {ticket_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch ticket data"
        )


async def get_message_data(message_id: str) -> dict:
    """Helper function to get message data from Supabase."""
    try:
        response = supabase_client.client.table('ticket_messages').select(
            '''
            *,
            author:profiles!ticket_messages_author_id_fkey(
                id, full_name, email, role
            )
            '''
        ).eq('id', message_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=404,
                detail=f"Message with ID {message_id} not found"
            )
        return response.data[0]
    except Exception as e:
        logger.error(f"Error fetching message {message_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch message data"
        )


@router.post(
    "/ticket-created",
    response_model=NotificationResponse,
    responses={
        404: {"model": NotificationError},
        500: {"model": NotificationError}
    },
    summary="Send notification when a new ticket is created",
    description="Sends email notifications to admin users when a new ticket is created"
)
async def notify_ticket_created(
    request: TicketCreatedNotificationRequest,
    background_tasks: BackgroundTasks
):
    """Send notification when a new ticket is created (to admins)."""
    try:
        # Get ticket data
        ticket_data = await get_ticket_data(request.ticket_id)
        
        # Get admin emails
        if request.admin_emails:
            admin_emails = [str(email) for email in request.admin_emails]
        else:
            admin_users = await supabase_client.get_admin_users()
            admin_emails = [user['email'] for user in admin_users if user.get('email')]
            
            # Fallback to configured admin emails if no admins in DB
            if not admin_emails:
                admin_emails = settings.admin_email_list
        
        if not admin_emails:
            raise HTTPException(
                status_code=500,
                detail="No admin emails configured"
            )
        
        # Send notification in background
        background_tasks.add_task(
            email_service.send_ticket_created_notification,
            ticket_data,
            admin_emails
        )
        
        return NotificationResponse(
            success=True,
            message="Ticket created notification queued successfully",
            recipients=admin_emails,
            notification_id=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending ticket created notification: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send notification"
        )


@router.post(
    "/ticket-assigned",
    response_model=NotificationResponse,
    responses={
        404: {"model": NotificationError},
        500: {"model": NotificationError}
    },
    summary="Send notification when a ticket is assigned",
    description="Sends email notification to technician when a ticket is assigned to them"
)
async def notify_ticket_assigned(
    request: TicketAssignedNotificationRequest,
    background_tasks: BackgroundTasks
):
    """Send notification when a ticket is assigned (to technician)."""
    try:
        # Get ticket data
        ticket_data = await get_ticket_data(request.ticket_id)
        
        # Get technician email
        technician_email = None
        if request.technician_email:
            technician_email = str(request.technician_email)
        elif request.technician_id:
            user_profile = await supabase_client.get_user_profile(
                request.technician_id
            )
            if user_profile:
                technician_email = user_profile.get('email')
        else:
            # Get from ticket's assigned_to field
            if ticket_data.get('assigned_user') and ticket_data['assigned_user'].get('email'):
                technician_email = ticket_data['assigned_user']['email']
        
        if not technician_email:
            raise HTTPException(
                status_code=400,
                detail="No technician email found"
            )
        
        # Send notification in background
        background_tasks.add_task(
            email_service.send_ticket_assigned_notification,
            ticket_data,
            technician_email
        )
        
        return NotificationResponse(
            success=True,
            message="Ticket assigned notification queued successfully",
            recipients=[technician_email],
            notification_id=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending ticket assigned notification: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send notification"
        )


@router.post(
    "/message-added",
    response_model=NotificationResponse,
    responses={
        404: {"model": NotificationError},
        500: {"model": NotificationError}
    },
    summary="Send notification when a new message is added",
    description="Sends email notification when a new message is added to a ticket"
)
async def notify_message_added(
    request: MessageAddedNotificationRequest,
    background_tasks: BackgroundTasks
):
    """Send notification when a new message is added to a ticket."""
    try:
        # Get ticket and message data
        ticket_data = await get_ticket_data(request.ticket_id)
        message_data = await get_message_data(request.message_id)
        
        # Determine recipient
        recipient_email = None
        is_customer = True
        
        if request.recipient_email:
            recipient_email = str(request.recipient_email)
        else:
            # Auto-determine recipient based on message author
            message_author_id = message_data.get('author_id')
            ticket_customer_id = ticket_data.get('user_id')
            
            if message_author_id == ticket_customer_id:
                # Message from customer, notify assigned technician or admins
                if ticket_data.get('assigned_user') and ticket_data['assigned_user'].get('email'):
                    recipient_email = ticket_data['assigned_user']['email']
                    is_customer = False
                else:
                    # No assigned technician, notify admins
                    admin_users = await supabase_client.get_admin_users()
                    if admin_users:
                        recipient_email = admin_users[0]['email']
                        is_customer = False
            else:
                # Message from staff, notify customer
                if ticket_data.get('profiles') and ticket_data['profiles'].get('email'):
                    recipient_email = ticket_data['profiles']['email']
                    is_customer = True
        
        if not recipient_email:
            raise HTTPException(
                status_code=400,
                detail="No recipient email found"
            )
        
        # Send notification in background
        background_tasks.add_task(
            email_service.send_message_notification,
            ticket_data,
            message_data,
            recipient_email,
            is_customer
        )
        
        return NotificationResponse(
            success=True,
            message="Message notification queued successfully",
            recipients=[recipient_email],
            notification_id=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message notification: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send notification"
        )


@router.post(
    "/ticket-resolved",
    response_model=NotificationResponse,
    responses={
        404: {"model": NotificationError},
        500: {"model": NotificationError}
    },
    summary="Send notification when a ticket is resolved",
    description="Sends email notification to customer when their ticket is resolved"
)
async def notify_ticket_resolved(
    request: TicketResolvedNotificationRequest,
    background_tasks: BackgroundTasks
):
    """Send notification when a ticket is resolved (to customer)."""
    try:
        # Get ticket data
        ticket_data = await get_ticket_data(request.ticket_id)
        
        # Get customer email
        customer_email = None
        if request.customer_email:
            customer_email = str(request.customer_email)
        elif ticket_data.get('profiles') and ticket_data['profiles'].get('email'):
            customer_email = ticket_data['profiles']['email']
        
        if not customer_email:
            raise HTTPException(
                status_code=400,
                detail="No customer email found"
            )
        
        # Add resolution summary to ticket data if provided
        if request.resolution_summary:
            ticket_data['resolution_summary'] = request.resolution_summary
        
        # Send notification in background
        background_tasks.add_task(
            email_service.send_ticket_resolved_notification,
            ticket_data,
            customer_email
        )
        
        return NotificationResponse(
            success=True,
            message="Ticket resolved notification queued successfully",
            recipients=[customer_email],
            notification_id=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending ticket resolved notification: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send notification"
        )


@router.post(
    "/bulk",
    response_model=BulkNotificationResponse,
    summary="Send multiple notifications in bulk",
    description="Sends multiple notifications in a single request"
)
async def send_bulk_notifications(
    request: BulkNotificationRequest,
    background_tasks: BackgroundTasks
):
    """Send multiple notifications in bulk."""
    results = []
    successful = 0
    failed = 0
    
    for notification in request.notifications:
        try:
            notification_type = notification.get('type')
            ticket_id = notification.get('ticket_id')
            
            if not notification_type or not ticket_id:
                results.append(NotificationResponse(
                    success=False,
                    message="Missing notification type or ticket_id",
                    notification_id=None,
                    recipients=[]
                ))
                failed += 1
                continue
            
            # Route to appropriate notification handler
            if notification_type == 'ticket_created':
                req = TicketCreatedNotificationRequest(
                    ticket_id=ticket_id,
                    admin_emails=notification.get('admin_emails')
                )
                result = await notify_ticket_created(req, background_tasks)
            elif notification_type == 'ticket_assigned':
                req = TicketAssignedNotificationRequest(
                    ticket_id=ticket_id,
                    technician_id=notification.get('technician_id'),
                    technician_email=notification.get('technician_email')
                )
                result = await notify_ticket_assigned(req, background_tasks)
            elif notification_type == 'message_added':
                message_id = notification.get('message_id')
                author_id = notification.get('author_id')
                
                if not message_id or not author_id:
                    results.append(NotificationResponse(
                        success=False,
                        message="Missing message_id or author_id for message_added",
                        notification_id=None,
                        recipients=[]
                    ))
                    failed += 1
                    continue
                
                req = MessageAddedNotificationRequest(
                    ticket_id=ticket_id,
                    message_id=message_id,
                    author_id=author_id,
                    recipient_email=notification.get('recipient_email')
                )
                result = await notify_message_added(req, background_tasks)
            elif notification_type == 'ticket_resolved':
                req = TicketResolvedNotificationRequest(
                    ticket_id=ticket_id,
                    customer_email=notification.get('customer_email'),
                    resolution_summary=notification.get('resolution_summary')
                )
                result = await notify_ticket_resolved(req, background_tasks)
            else:
                results.append(NotificationResponse(
                    success=False,
                    message=f"Unknown notification type: {notification_type}",
                    notification_id=None,
                    recipients=[]
                ))
                failed += 1
                continue
            
            results.append(result)
            successful += 1
            
        except Exception as e:
            logger.error(f"Error in bulk notification: {e}")
            results.append(NotificationResponse(
                success=False,
                message=str(e),
                notification_id=None,
                recipients=[]
            ))
            failed += 1
    
    return BulkNotificationResponse(
        total_requested=len(request.notifications),
        successful=successful,
        failed=failed,
        results=results
    )


@router.get(
    "/health",
    summary="Health check for notification service",
    description="Returns the health status of the notification service"
)
async def health_check():
    """Health check endpoint for notification service."""
    try:
        # Test email service initialization
        if not email_service.sendgrid_client:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "message": "Email service not initialized"
                }
            )
        
        # Test Supabase connection
        if not supabase_client.client:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "message": "Supabase client not initialized"
                }
            )
        
        return {
            "status": "healthy",
            "message": "Notification service is operational",
            "services": {
                "email": "connected",
                "database": "connected"
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "message": f"Service error: {str(e)}"
            }
        )
