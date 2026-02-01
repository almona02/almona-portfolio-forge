"""
Background tasks for report generation and analytics.
"""
from celery import current_task
from celery.exceptions import Retry
from typing import Dict, Any, List, Optional
import logging
import time
import json
import csv
import io
from datetime import datetime, timedelta
from collections import defaultdict

from celery_app import celery_app
from core.supabase_client import get_enhanced_supabase_client
from core.connection_pool import get_connection_pool

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="generate_report", max_retries=2)
def generate_report(
    self,
    report_type: str,
    parameters: Dict[str, Any],
    user_id: str,
    format: str = "json"
):
    """
    Generate comprehensive reports with heavy data processing.
    
    Features:
    - Multiple report types (sales, quotes, customers, etc.)
    - Large dataset processing with progress tracking
    - Multiple output formats (JSON, CSV, PDF)
    - Data aggregation and analytics
    - Performance optimization with connection pooling
    
    Args:
        report_type: Type of report to generate
        parameters: Report parameters (date range, filters, etc.)
        user_id: User requesting the report
        format: Output format (json, csv, pdf)
    """
    start_time = time.time()
    
    try:
        # Update task status
        current_task.update_state(
            state="PROGRESS",
            meta={
                "current": 0,
                "total": 100,
                "status": "Initializing report generation...",
                "report_type": report_type,
                "user_id": user_id,
                "format": format,
                "started_at": datetime.utcnow().isoformat()
            }
        )
        
        # Step 1: Validate parameters (10%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 10, "total": 100, "status": "Validating report parameters..."}
        )
        
        if not report_type or not user_id:
            raise ValueError("Missing required report parameters")
        
        # Get enhanced Supabase client
        supabase = get_enhanced_supabase_client()
        
        # Step 2: Fetch data based on report type (40%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 20, "total": 100, "status": "Fetching report data..."}
        )
        
        report_data = {}
        
        if report_type == "sales_summary":
            report_data = _generate_sales_summary(supabase, parameters)
        elif report_type == "quote_analytics":
            report_data = _generate_quote_analytics(supabase, parameters)
        elif report_type == "customer_report":
            report_data = _generate_customer_report(supabase, parameters)
        elif report_type == "product_performance":
            report_data = _generate_product_performance(supabase, parameters)
        else:
            raise ValueError(f"Unsupported report type: {report_type}")
        
        # Step 3: Process and aggregate data (70%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 50, "total": 100, "status": "Processing and aggregating data..."}
        )
        
        processed_data = _process_report_data(report_data, report_type, parameters)
        
        # Step 4: Generate output in requested format (90%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 80, "total": 100, "status": f"Generating {format.upper()} output..."}
        )
        
        output_data = _format_report_output(processed_data, format)
        
        # Step 5: Save report and update status (100%)
        processing_time = time.time() - start_time
        
        # Save report record
        report_record = {
            "report_type": report_type,
            "user_id": user_id,
            "parameters": parameters,
            "format": format,
            "status": "completed",
            "generated_at": datetime.utcnow().isoformat(),
            "processing_time_seconds": round(processing_time, 2),
            "data_size": len(str(output_data)),
            "output_data": output_data if format == "json" else None
        }
        
        try:
            result = supabase.client.table("reports").insert(report_record).execute()
            report_id = result.data[0]["id"] if result.data else None
        except Exception as db_error:
            logger.warning(f"Failed to save report to database: {db_error}")
            report_id = None
        
        current_task.update_state(
            state="SUCCESS",
            meta={
                "current": 100,
                "total": 100,
                "status": "Report generated successfully",
                "report_type": report_type,
                "report_id": report_id,
                "processing_time_seconds": round(processing_time, 2),
                "data_size": len(str(output_data)),
                "completed_at": datetime.utcnow().isoformat()
            }
        )
        
        logger.info(
            f"Report generated successfully: type={report_type}, "
            f"user={user_id}, time={processing_time:.2f}s, size={len(str(output_data))}"
        )
        
        return {
            "report_type": report_type,
            "report_id": report_id,
            "user_id": user_id,
            "format": format,
            "processing_time_seconds": processing_time,
            "data_size": len(str(output_data)),
            "generated_at": datetime.utcnow().isoformat(),
            "output_data": output_data
        }
        
    except Exception as e:
        processing_time = time.time() - start_time
        error_msg = f"Report generation failed: {str(e)}"
        
        logger.error(f"{error_msg} (processing_time: {processing_time:.2f}s)")
        
        current_task.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "report_type": report_type,
                "user_id": user_id,
                "processing_time_seconds": processing_time,
                "failed_at": datetime.utcnow().isoformat()
            }
        )
        
        # Retry logic
        if self.request.retries < self.max_retries:
            retry_delay = 2 ** self.request.retries
            logger.info(f"Retrying report generation in {retry_delay} seconds")
            raise self.retry(countdown=retry_delay, exc=e)
        
        raise


def _generate_sales_summary(supabase, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Generate sales summary report data."""
    start_date = parameters.get("start_date", (datetime.now() - timedelta(days=30)).isoformat())
    end_date = parameters.get("end_date", datetime.now().isoformat())
    
    # Fetch sales data
    sales_data = supabase.client.table("quotes").select(
        "id, total_amount, created_at, status, customer_id"
    ).gte("created_at", start_date).lte("created_at", end_date).execute()
    
    # Fetch customer data
    customer_ids = list(set([sale["customer_id"] for sale in sales_data.data if sale.get("customer_id")]))
    customers_data = {}
    if customer_ids:
        customers = supabase.client.table("profiles").select(
            "id, full_name, company_name"
        ).in_("id", customer_ids).execute()
        customers_data = {c["id"]: c for c in customers.data}
    
    return {
        "sales": sales_data.data,
        "customers": customers_data,
        "date_range": {"start": start_date, "end": end_date}
    }


def _generate_quote_analytics(supabase, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Generate quote analytics report data."""
    start_date = parameters.get("start_date", (datetime.now() - timedelta(days=30)).isoformat())
    end_date = parameters.get("end_date", datetime.now().isoformat())
    
    # Fetch quotes with detailed information
    quotes_data = supabase.client.table("quotes").select(
        "id, total_amount, created_at, status, customer_id, calculation_status"
    ).gte("created_at", start_date).lte("created_at", end_date).execute()
    
    # Fetch quote items for detailed analysis
    quote_ids = [quote["id"] for quote in quotes_data.data]
    quote_items = []
    if quote_ids:
        items_data = supabase.client.table("quote_items").select(
            "quote_id, product_id, quantity, unit_price, total_price"
        ).in_("quote_id", quote_ids).execute()
        quote_items = items_data.data
    
    return {
        "quotes": quotes_data.data,
        "quote_items": quote_items,
        "date_range": {"start": start_date, "end": end_date}
    }


def _generate_customer_report(supabase, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Generate customer report data."""
    # Fetch customer data
    customers_data = supabase.client.table("profiles").select(
        "id, full_name, email, company_name, phone, created_at, is_active"
    ).execute()
    
    # Fetch customer activity (quotes, tickets)
    customer_ids = [customer["id"] for customer in customers_data.data]
    
    quotes_data = []
    tickets_data = []
    if customer_ids:
        quotes = supabase.client.table("quotes").select(
            "id, customer_id, total_amount, created_at, status"
        ).in_("customer_id", customer_ids).execute()
        quotes_data = quotes.data
        
        tickets = supabase.client.table("service_tickets").select(
            "id, user_id, status, created_at, priority"
        ).in_("user_id", customer_ids).execute()
        tickets_data = tickets.data
    
    return {
        "customers": customers_data.data,
        "quotes": quotes_data,
        "tickets": tickets_data
    }


def _generate_product_performance(supabase, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Generate product performance report data."""
    start_date = parameters.get("start_date", (datetime.now() - timedelta(days=30)).isoformat())
    end_date = parameters.get("end_date", datetime.now().isoformat())
    
    # Fetch products
    products_data = supabase.client.table("products").select(
        "id, name_en, name_ar, sku, category, price"
    ).execute()
    
    # Fetch quote items for performance analysis
    quote_items_data = supabase.client.table("quote_items").select(
        "product_id, quantity, unit_price, total_price, quote_id"
    ).execute()
    
    # Fetch quotes for date filtering
    quotes_data = supabase.client.table("quotes").select(
        "id, created_at, status"
    ).gte("created_at", start_date).lte("created_at", end_date).execute()
    
    return {
        "products": products_data.data,
        "quote_items": quote_items_data.data,
        "quotes": quotes_data.data,
        "date_range": {"start": start_date, "end": end_date}
    }


def _process_report_data(report_data: Dict[str, Any], report_type: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Process and aggregate report data."""
    processed = {
        "report_type": report_type,
        "generated_at": datetime.utcnow().isoformat(),
        "parameters": parameters,
        "summary": {},
        "data": report_data
    }
    
    if report_type == "sales_summary":
        sales = report_data["sales"]
        processed["summary"] = {
            "total_sales": sum(sale.get("total_amount", 0) for sale in sales),
            "total_quotes": len(sales),
            "average_quote_value": sum(sale.get("total_amount", 0) for sale in sales) / len(sales) if sales else 0,
            "status_breakdown": _count_by_field(sales, "status")
        }
    
    elif report_type == "quote_analytics":
        quotes = report_data["quotes"]
        processed["summary"] = {
            "total_quotes": len(quotes),
            "total_value": sum(quote.get("total_amount", 0) for quote in quotes),
            "status_breakdown": _count_by_field(quotes, "status"),
            "calculation_status_breakdown": _count_by_field(quotes, "calculation_status")
        }
    
    elif report_type == "customer_report":
        customers = report_data["customers"]
        quotes = report_data["quotes"]
        tickets = report_data["tickets"]
        
        processed["summary"] = {
            "total_customers": len(customers),
            "active_customers": len([c for c in customers if c.get("is_active")]),
            "total_quotes": len(quotes),
            "total_tickets": len(tickets),
            "customer_activity": _analyze_customer_activity(customers, quotes, tickets)
        }
    
    elif report_type == "product_performance":
        products = report_data["products"]
        quote_items = report_data["quote_items"]
        quotes = report_data["quotes"]
        
        processed["summary"] = {
            "total_products": len(products),
            "total_quote_items": len(quote_items),
            "top_products": _get_top_products(products, quote_items, quotes)
        }
    
    return processed


def _count_by_field(data: List[Dict], field: str) -> Dict[str, int]:
    """Count occurrences by field value."""
    counts = defaultdict(int)
    for item in data:
        value = item.get(field, "unknown")
        counts[str(value)] += 1
    return dict(counts)


def _analyze_customer_activity(customers: List[Dict], quotes: List[Dict], tickets: List[Dict]) -> Dict[str, Any]:
    """Analyze customer activity patterns."""
    customer_activity = {}
    
    for customer in customers:
        customer_id = customer["id"]
        customer_quotes = [q for q in quotes if q.get("customer_id") == customer_id]
        customer_tickets = [t for t in tickets if t.get("user_id") == customer_id]
        
        customer_activity[customer_id] = {
            "name": customer.get("full_name", "Unknown"),
            "company": customer.get("company_name", ""),
            "quote_count": len(customer_quotes),
            "ticket_count": len(customer_tickets),
            "total_quote_value": sum(q.get("total_amount", 0) for q in customer_quotes)
        }
    
    return customer_activity


def _get_top_products(products: List[Dict], quote_items: List[Dict], quotes: List[Dict]) -> List[Dict]:
    """Get top performing products."""
    product_stats = defaultdict(lambda: {"quantity": 0, "revenue": 0, "quotes": 0})
    
    # Filter quotes by date range
    valid_quote_ids = {q["id"] for q in quotes}
    
    for item in quote_items:
        if item.get("quote_id") in valid_quote_ids:
            product_id = item.get("product_id")
            if product_id:
                product_stats[product_id]["quantity"] += item.get("quantity", 0)
                product_stats[product_id]["revenue"] += item.get("total_price", 0)
                product_stats[product_id]["quotes"] += 1
    
    # Create product performance list
    top_products = []
    for product in products:
        product_id = product["id"]
        stats = product_stats.get(product_id, {"quantity": 0, "revenue": 0, "quotes": 0})
        
        top_products.append({
            "product_id": product_id,
            "name": product.get("name_en", "Unknown"),
            "sku": product.get("sku", ""),
            "quantity_sold": stats["quantity"],
            "revenue": stats["revenue"],
            "quote_count": stats["quotes"]
        })
    
    # Sort by revenue
    top_products.sort(key=lambda x: x["revenue"], reverse=True)
    return top_products[:10]  # Top 10 products


def _format_report_output(processed_data: Dict[str, Any], format: str) -> Any:
    """Format report output in requested format."""
    if format == "json":
        return processed_data
    
    elif format == "csv":
        # Convert to CSV format
        output = io.StringIO()
        
        # Write summary
        writer = csv.writer(output)
        writer.writerow(["Report Summary"])
        writer.writerow(["Report Type", processed_data["report_type"]])
        writer.writerow(["Generated At", processed_data["generated_at"]])
        writer.writerow([])
        
        # Write summary data
        summary = processed_data.get("summary", {})
        writer.writerow(["Summary"])
        for key, value in summary.items():
            if isinstance(value, dict):
                writer.writerow([key, ""])
                for sub_key, sub_value in value.items():
                    writer.writerow([f"  {sub_key}", sub_value])
            else:
                writer.writerow([key, value])
        
        return output.getvalue()
    
    elif format == "pdf":
        # In production, use a PDF library like reportlab
        # For now, return a placeholder
        return f"PDF report for {processed_data['report_type']} - {processed_data['generated_at']}"
    
    else:
        raise ValueError(f"Unsupported output format: {format}")


@celery_app.task(bind=True, name="generate_daily_reports", max_retries=1)
def generate_daily_reports(self):
    """Generate daily automated reports."""
    try:
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 0, "total": 100, "status": "Starting daily report generation..."}
        )
        
        # Generate various daily reports
        reports = [
            ("sales_summary", {"start_date": (datetime.now() - timedelta(days=1)).isoformat(), "end_date": datetime.now().isoformat()}),
            ("quote_analytics", {"start_date": (datetime.now() - timedelta(days=7)).isoformat(), "end_date": datetime.now().isoformat()}),
        ]
        
        results = []
        for i, (report_type, parameters) in enumerate(reports):
            current_task.update_state(
                state="PROGRESS",
                meta={"current": (i / len(reports)) * 100, "total": 100, "status": f"Generating {report_type}..."}
            )
            
            result = generate_report.delay(report_type, parameters, "system", "json")
            results.append({"report_type": report_type, "task_id": result.id})
        
        current_task.update_state(
            state="SUCCESS",
            meta={
                "current": 100,
                "total": 100,
                "status": "Daily reports generation completed",
                "reports_generated": len(results),
                "completed_at": datetime.utcnow().isoformat()
            }
        )
        
        return {"reports_generated": len(results), "results": results}
        
    except Exception as e:
        logger.error(f"Daily reports generation failed: {str(e)}")
        current_task.update_state(
            state="FAILURE",
            meta={"error": str(e), "failed_at": datetime.utcnow().isoformat()}
        )
        raise


@celery_app.task(bind=True, name="generate_report_job_file", max_retries=2)
def generate_report_job_file(self, job_id: str):
    """
    Generate report file from template and data (Phase 4 implementation).
    
    Processes a report generation job:
    1. Loads job from database
    2. Loads template if template_id provided
    3. Generates file (PDF/Excel/CSV) based on format
    4. Uploads to Supabase Storage
    5. Updates job status and download URL
    
    Args:
        job_id: Report generation job ID (UUID string)
    """
    from uuid import UUID
    from datetime import datetime, timezone, timedelta
    from apis.v2.repositories.report_generation_repository import (
        ReportGenerationRepository
    )
    from apis.v2.repositories.report_templates_repository import (
        ReportTemplatesRepository
    )
    from apis.v2.utils.storage_service import upload_report_file
    from apis.v2.utils.csv_generator import generate_csv_from_data
    from apis.v2.utils.excel_generator import generate_excel_from_data
    from apis.v2.utils.pdf_generator import generate_pdf_from_data

    start_time = time.time()
    job_uuid = UUID(job_id)

    try:
        # Get service role client for database operations
        supabase_client_wrapper = get_enhanced_supabase_client()
        supabase = supabase_client_wrapper.client

        # Create repositories
        job_repo = ReportGenerationRepository(supabase)
        template_repo = ReportTemplatesRepository(supabase)

        # Load job
        job = job_repo.get_job_by_id(job_uuid, user_id=None)
        if not job:
            raise ValueError(f"Report generation job not found: {job_id}")

        # Update status to processing
        started_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        job_repo.update_job_fields(
            job_uuid,
            {
                "status": "processing",
                "started_at": started_at,
            }
        )

        # Extract job data
        template_id_str = job.get("template_id")
        report_type = job.get("report_type", "")
        report_data = job.get("report_data", {})
        format_str = job.get("format", "pdf")

        # Load template if provided
        template_schema = None
        if template_id_str:
            try:
                template_uuid = UUID(template_id_str)
                template = template_repo.get_template_by_id(
                    template_uuid, user_id=None
                )
                if template:
                    template_schema = template.get("template_schema", {})
            except (ValueError, Exception) as e:
                logger.warning(f"Failed to load template {template_id_str}: {e}")

        # Generate file based on format
        # For now, use simple data table layout (template schema parsing TBD)
        # Extract data array from report_data if available
        data_array = report_data.get("data", [])
        if not data_array and isinstance(report_data, dict):
            # Fallback: convert report_data dict to list format
            data_array = [report_data]

        file_bytes: bytes
        content_type: str
        file_extension: str

        if format_str == "csv":
            file_bytes = generate_csv_from_data(data_array)
            content_type = "text/csv"
            file_extension = "csv"
        elif format_str == "excel":
            file_bytes = generate_excel_from_data(data_array)
            content_type = (
                "application/vnd.openxmlformats-officedocument."
                "spreadsheetml.sheet"
            )
            file_extension = "xlsx"
        elif format_str == "pdf":
            file_bytes = generate_pdf_from_data(data_array)
            content_type = "application/pdf"
            file_extension = "pdf"
        else:
            raise ValueError(f"Unsupported format: {format_str}")

        # Upload to Supabase Storage
        file_path = f"reports/{job_id}.{file_extension}"
        expires_in = 604800  # 7 days
        signed_url, expires_at_iso = upload_report_file(
            supabase, file_bytes, file_path, content_type, expires_in
        )

        # Calculate generation time
        generation_time_ms = int((time.time() - start_time) * 1000)

        # Update job status to completed
        completed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        job_repo.update_job_fields(
            job_uuid,
            {
                "status": "completed",
                "completed_at": completed_at,
                "download_url": signed_url,
                "download_expires_at": expires_at_iso,
                "file_size_bytes": len(file_bytes),
                "generation_time_ms": generation_time_ms,
            }
        )

        logger.info(
            f"Report generation job {job_id} completed successfully "
            f"in {generation_time_ms}ms"
        )

        return {
            "job_id": job_id,
            "status": "completed",
            "download_url": signed_url,
            "file_size_bytes": len(file_bytes),
        }

    except Exception as e:
        error_message = str(e)
        logger.error(f"Report generation job {job_id} failed: {error_message}")

        # Update job status to failed
        try:
            supabase_client_wrapper = get_enhanced_supabase_client()
            supabase = supabase_client_wrapper.client
            job_repo = ReportGenerationRepository(supabase)
            job_repo.update_job_fields(
                job_uuid,
                {
                    "status": "failed",
                    "error_message": error_message[:500],  # Limit length
                }
            )
        except Exception as update_error:
            logger.error(f"Failed to update job status to failed: {update_error}")

        # Retry on transient errors
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=60)  # Retry after 60 seconds

        raise
