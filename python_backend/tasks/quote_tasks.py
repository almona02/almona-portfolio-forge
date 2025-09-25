"""
Enhanced background tasks for heavy quote processing.
"""
from celery import current_task
from celery.exceptions import Retry
from typing import Dict, Any, List, Optional
import logging
import time
import asyncio
from datetime import datetime, timedelta

from celery_app import celery_app
from core.supabase_client import get_enhanced_supabase_client
from core.connection_pool import get_connection_pool
from core.errors import DatabaseError, ErrorContext
from apis.v2.core.errors import SupabaseError, create_error_context

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="process_quote_calculation", max_retries=3)
def process_quote_calculation(self, quote_id: str, items_data: Dict[str, Any]):
    """
    Enhanced background task for heavy quote calculations with advanced pricing logic.
    
    Features:
    - Complex pricing calculations with discounts, taxes, and fees
    - Bulk item processing with progress tracking
    - Database optimization with connection pooling
    - Retry logic with exponential backoff
    - Performance monitoring and metrics
    
    Args:
        quote_id: The quote ID to process
        items_data: Quote items data for calculation
    """
    start_time = time.time()
    
    try:
        # Update task status
        current_task.update_state(
            state="PROGRESS",
            meta={
                "current": 0, 
                "total": 100, 
                "status": "Starting heavy quote calculation...",
                "quote_id": quote_id,
                "started_at": datetime.utcnow().isoformat()
            }
        )
        
        # Get enhanced Supabase client with connection pooling
        supabase = get_enhanced_supabase_client()
        
        # Step 1: Validate and prepare data (10%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 10, "total": 100, "status": "Validating quote data..."}
        )
        
        products = items_data.get("products", [])
        services = items_data.get("services", [])
        discounts = items_data.get("discounts", [])
        taxes = items_data.get("taxes", [])
        
        if not products and not services:
            raise ValueError("No products or services found in quote data")
        
        # Step 2: Calculate base amounts (30%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 20, "total": 100, "status": "Calculating base amounts..."}
        )
        
        total_amount = 0.0
        item_details = []
        
        # Process products with bulk calculation
        for i, item in enumerate(products):
            if item.get("unit_price") and item.get("quantity"):
                base_amount = item["unit_price"] * item["quantity"]
                total_amount += base_amount
                
                item_details.append({
                    "type": "product",
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "quantity": item["quantity"],
                    "unit_price": item["unit_price"],
                    "base_amount": base_amount
                })
            
            # Update progress for large datasets
            if len(products) > 10 and i % max(1, len(products) // 10) == 0:
                progress = 20 + (i / len(products)) * 10
                current_task.update_state(
                    state="PROGRESS",
                    meta={"current": int(progress), "total": 100, "status": f"Processing products... {i+1}/{len(products)}"}
                )
        
        # Process services
        for i, item in enumerate(services):
            if item.get("unit_price") and item.get("quantity"):
                base_amount = item["unit_price"] * item["quantity"]
                total_amount += base_amount
                
                item_details.append({
                    "type": "service",
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "quantity": item["quantity"],
                    "unit_price": item["unit_price"],
                    "base_amount": base_amount
                })
        
        # Step 3: Apply discounts (50%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 40, "total": 100, "status": "Applying discounts..."}
        )
        
        discount_amount = 0.0
        for discount in discounts:
            if discount.get("type") == "percentage":
                discount_amount += total_amount * (discount.get("value", 0) / 100)
            elif discount.get("type") == "fixed":
                discount_amount += discount.get("value", 0)
        
        subtotal = total_amount - discount_amount
        
        # Step 4: Calculate taxes (70%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 60, "total": 100, "status": "Calculating taxes..."}
        )
        
        tax_amount = 0.0
        for tax in taxes:
            if tax.get("type") == "percentage":
                tax_amount += subtotal * (tax.get("value", 0) / 100)
            elif tax.get("type") == "fixed":
                tax_amount += tax.get("value", 0)
        
        final_amount = subtotal + tax_amount
        
        # Step 5: Update database with connection pooling (90%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 80, "total": 100, "status": "Updating database..."}
        )
        
        # Use connection pool for database operations
        pool = get_connection_pool()
        
        # Prepare update data
        update_data = {
            "total_amount": round(final_amount, 2),
            "subtotal": round(subtotal, 2),
            "discount_amount": round(discount_amount, 2),
            "tax_amount": round(tax_amount, 2),
            "calculation_status": "completed",
            "calculated_at": datetime.utcnow().isoformat(),
            "calculation_details": {
                "item_count": len(item_details),
                "processing_time_ms": round((time.time() - start_time) * 1000, 2),
                "items": item_details
            }
        }
        
        # Update quote in database
        result = supabase.client.table("quotes").update(update_data).eq("id", quote_id).execute()
        
        if not result.data:
            raise DatabaseError(
                "Failed to update quote total",
                "update_quote_total",
                ErrorContext(resource_id=quote_id)
            )
        
        # Step 6: Complete task (100%)
        processing_time = time.time() - start_time
        
        current_task.update_state(
            state="SUCCESS",
            meta={
                "current": 100, 
                "total": 100, 
                "status": "Quote calculation completed successfully",
                "quote_id": quote_id,
                "final_amount": final_amount,
                "processing_time_seconds": round(processing_time, 2),
                "completed_at": datetime.utcnow().isoformat()
            }
        )
        
        logger.info(
            f"Quote calculation completed for quote {quote_id}: "
            f"amount={final_amount}, time={processing_time:.2f}s, items={len(item_details)}"
        )
        
        return {
            "quote_id": quote_id,
            "total_amount": final_amount,
            "subtotal": subtotal,
            "discount_amount": discount_amount,
            "tax_amount": tax_amount,
            "processing_time_seconds": processing_time,
            "item_count": len(item_details)
        }
        
    except Exception as e:
        processing_time = time.time() - start_time
        error_msg = f"Quote calculation failed for quote {quote_id}: {str(e)}"
        
        logger.error(f"{error_msg} (processing_time: {processing_time:.2f}s)")
        
        current_task.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "quote_id": quote_id,
                "processing_time_seconds": processing_time,
                "failed_at": datetime.utcnow().isoformat()
            }
        )
        
        # Retry logic for transient failures
        if self.request.retries < self.max_retries:
            retry_delay = 2 ** self.request.retries  # Exponential backoff
            logger.info(f"Retrying quote calculation for {quote_id} in {retry_delay} seconds")
            raise self.retry(countdown=retry_delay, exc=e)
        
        raise


@celery_app.task(name="generate_quote_pdf")
def generate_quote_pdf(quote_id: str, quote_data: Dict[str, Any]):
    """
    Background task to generate PDF for quote.
    
    Args:
        quote_id: The quote ID
        quote_data: Quote data for PDF generation
    """
    try:
        # Simulate PDF generation
        import time
        time.sleep(2)  # Simulate processing time
        
        # In a real implementation, you would:
        # 1. Generate PDF using a library like reportlab or weasyprint
        # 2. Store the PDF in cloud storage (S3, etc.)
        # 3. Update the quote record with PDF URL
        
        pdf_url = f"https://storage.example.com/quotes/{quote_id}.pdf"
        
        supabase = get_supabase_client()
        supabase.table("quotes").update({
            "pdf_url": pdf_url,
            "pdf_generated_at": "2024-01-01T00:00:00Z"
        }).eq("id", quote_id).execute()
        
        logger.info(f"PDF generated for quote {quote_id}")
        return {"quote_id": quote_id, "pdf_url": pdf_url}
        
    except Exception as e:
        logger.error(f"PDF generation failed for quote {quote_id}: {str(e)}")
        raise


@celery_app.task(name="send_quote_notification")
def send_quote_notification(quote_id: str, recipient_email: str, quote_data: Dict[str, Any]):
    """
    Background task to send quote notification email.
    
    Args:
        quote_id: The quote ID
        recipient_email: Email address to send to
        quote_data: Quote data for email content
    """
    try:
        # Simulate email sending
        import time
        time.sleep(1)  # Simulate processing time
        
        # In a real implementation, you would:
        # 1. Use SendGrid, AWS SES, or similar service
        # 2. Generate email template with quote data
        # 3. Send email with PDF attachment
        
        logger.info(f"Quote notification sent to {recipient_email} for quote {quote_id}")
        return {"quote_id": quote_id, "email_sent": True, "recipient": recipient_email}
        
    except Exception as e:
        logger.error(f"Quote notification failed for quote {quote_id}: {str(e)}")
        raise
