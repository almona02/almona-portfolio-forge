#!/usr/bin/env python3
"""
Python SDK Example
Demonstrates how to use the Almona Industrial API Python client
"""

import asyncio
from almona import (
    AlmonaAPIClient,
    AsyncAlmonaAPIClient,
    TicketCategory,
    TicketPriority,
    MaintenanceType,
    AlmonaAPIError,
    AuthenticationError,
    ValidationError
)


def sync_example():
    """Synchronous client example."""
    print("=== Synchronous Client Example ===")
    
    # Create client instance
    client = AlmonaAPIClient({
        "base_url": "https://api.almona.com",
        "debug": True  # Enable debug logging
    })
    
    try:
        # Authenticate
        print("Authenticating...")
        client.authenticate("user@example.com", "password")
        print("Authentication successful")
        
        # Get current user
        user = client.get_current_user()
        print(f"Current user: {user}")
        
        # Create a support ticket
        print("\nCreating support ticket...")
        support_ticket = client.create_support_ticket({
            "category": "support",
            "payload": {
                "title": "Hydraulic pump failure on CNC machine",
                "description": "The hydraulic pump on our CNC machine (Model XYZ-2000) has started making unusual noises and the pressure readings are inconsistent. This is affecting production quality.",
                "priority": "high",
                "machine_id": "550e8400-e29b-41d4-a716-446655440000",
                "machine_serial_number": "CNC-2023-001234"
            }
        })
        print(f"Created support ticket: {support_ticket.ticket_number}")
        
        # Create a preventive maintenance ticket
        print("\nCreating preventive maintenance ticket...")
        maintenance_ticket = client.create_preventive_maintenance_ticket({
            "category": "preventive_maintenance",
            "payload": {
                "title": "Monthly maintenance for CNC machine",
                "description": "Scheduled monthly maintenance including lubrication, calibration, and safety checks",
                "priority": "medium",
                "machine_id": "550e8400-e29b-41d4-a716-446655440000",
                "machine_serial_number": "CNC-2023-001234"
            },
            "maintenance_metadata": {
                "checklist_id": "checklist-001",
                "frequency_days": 30,
                "plan_id": "plan-monthly-001",
                "maintenance_type": "routine"
            }
        })
        print(f"Created maintenance ticket: {maintenance_ticket.ticket_number}")
        
        # Create a quote
        print("\nCreating quote...")
        quote = client.create_quote({
            "contact_name": "Ahmed Hassan",
            "contact_email": "ahmed.hassan@company.com",
            "contact_phone": "+20 123 456 7890",
            "company": "Egyptian Manufacturing Co.",
            "project_description": "We need to upgrade our production line with new CNC machines for automotive parts manufacturing.",
            "urgency": "urgent",
            "delivery_location": "Cairo Industrial Zone, Building 15, Floor 3",
            "products": [
                {
                    "product_id": "prod-cnc-xyz2000",
                    "quantity": 2,
                    "unit_price": 1500.00
                }
            ],
            "services": [
                {
                    "service_id": "svc-maintenance-monthly",
                    "quantity": 1,
                    "unit_price": 500.00
                }
            ],
            "special_requirements": "Installation must be completed during weekend hours due to production schedule.",
            "machine_id": "550e8400-e29b-41d4-a716-446655440000"
        })
        print(f"Created quote: {quote.quote_number}")
        
        # List tickets
        print("\nListing tickets...")
        tickets = client.list_tickets(
            filters={
                "category": "support",
                "priority": "high"
            }
        )
        print(f"Found {len(tickets)} high-priority support tickets")
        
        # Update ticket status
        if tickets:
            print("\nUpdating ticket status...")
            updated_ticket = client.update_ticket_status(
                tickets[0].id,
                "in_progress",
                "Technician assigned and working on the issue"
            )
            print(f"Updated ticket status: {updated_ticket.status}")
        
        # Lookup quotes
        print("\nLooking up quotes...")
        search_results = client.lookup_quotes("QUO-2024")
        print(f"Found {search_results.count} quotes matching 'QUO-2024'")
        
        # Get system health
        print("\nChecking system health...")
        health = client.get_health_status()
        print(f"System status: {health['status']}")
        
        # Get system metrics
        print("\nGetting system metrics...")
        metrics = client.get_metrics()
        print(f"API version: {metrics['api']['version']}")
        
    except AuthenticationError as e:
        print(f"Authentication failed: {e.message}")
    except ValidationError as e:
        print(f"Validation failed: {e.message}")
        print(f"Details: {e.details}")
    except AlmonaAPIError as e:
        print(f"API Error: {e.message}")
        print(f"Code: {e.code}")
        print(f"Status: {e.status_code}")
    except Exception as e:
        print(f"Unexpected error: {e}")
    finally:
        # Clean up
        client.close()


async def async_example():
    """Asynchronous client example."""
    print("\n=== Asynchronous Client Example ===")
    
    async with AsyncAlmonaAPIClient({
        "base_url": "https://api.almona.com",
        "debug": True
    }) as client:
        try:
            # Authenticate
            print("Authenticating...")
            await client.authenticate("user@example.com", "password")
            print("Authentication successful")
            
            # Create multiple tickets concurrently
            print("\nCreating multiple tickets concurrently...")
            tasks = [
                client.create_support_ticket({
                    "category": "support",
                    "payload": {
                        "title": f"Concurrent ticket {i}",
                        "description": f"This is concurrent ticket number {i}",
                        "priority": "medium"
                    }
                })
                for i in range(1, 4)
            ]
            
            tickets = await asyncio.gather(*tasks)
            print(f"Created {len(tickets)} tickets concurrently")
            
            for ticket in tickets:
                print(f"- {ticket.ticket_number}: {ticket.title}")
            
            # Create quotes concurrently
            print("\nCreating quotes concurrently...")
            quote_tasks = [
                client.create_quote({
                    "contact_name": f"Contact {i}",
                    "contact_email": f"contact{i}@example.com",
                    "products": [
                        {
                            "product_id": f"prod-{i}",
                            "quantity": 1,
                            "unit_price": 1000.00 * i
                        }
                    ]
                })
                for i in range(1, 3)
            ]
            
            quotes = await asyncio.gather(*quote_tasks)
            print(f"Created {len(quotes)} quotes concurrently")
            
            for quote in quotes:
                print(f"- {quote.quote_number}: ${quote.total_amount}")
            
        except AuthenticationError as e:
            print(f"Authentication failed: {e.message}")
        except AlmonaAPIError as e:
            print(f"API Error: {e.message}")
        except Exception as e:
            print(f"Unexpected error: {e}")


def error_handling_example():
    """Error handling example."""
    print("\n=== Error Handling Example ===")
    
    client = AlmonaAPIClient("https://api.almona.com")
    
    try:
        # This will fail with authentication error
        client.create_support_ticket({
            "category": "support",
            "payload": {
                "title": "Test ticket",
                "priority": "medium"
            }
        })
    except AuthenticationError as e:
        print(f"Caught AuthenticationError: {e.message}")
        print(f"Error code: {e.code}")
    except ValidationError as e:
        print(f"Caught ValidationError: {e.message}")
        print(f"Details: {e.details}")
    except AlmonaAPIError as e:
        print(f"Caught AlmonaAPIError: {e.message}")
        print(f"Code: {e.code}")
        print(f"Status: {e.status_code}")
        print(f"Context: {e.context}")
    except Exception as e:
        print(f"Caught unexpected error: {e}")


def pydantic_models_example():
    """Pydantic models example."""
    print("\n=== Pydantic Models Example ===")
    
    from almona import (
        SupportTicketCreate,
        UnifiedTicketBase,
        QuoteCreateRequest,
        QuoteItem
    )
    
    # Create ticket using Pydantic models
    ticket_data = SupportTicketCreate(
        category=TicketCategory.SUPPORT,
        payload=UnifiedTicketBase(
            title="Pydantic model ticket",
            description="This ticket was created using Pydantic models",
            priority=TicketPriority.HIGH,
            machine_id="550e8400-e29b-41d4-a716-446655440000"
        )
    )
    
    print("Created ticket data using Pydantic models:")
    print(f"Title: {ticket_data.payload.title}")
    print(f"Priority: {ticket_data.payload.priority}")
    print(f"Category: {ticket_data.category}")
    
    # Create quote using Pydantic models
    quote_data = QuoteCreateRequest(
        contact_name="Pydantic User",
        contact_email="pydantic@example.com",
        products=[
            QuoteItem(
                product_id="prod-pydantic",
                quantity=1,
                unit_price=2000.00
            )
        ]
    )
    
    print("\nCreated quote data using Pydantic models:")
    print(f"Contact: {quote_data.contact_name}")
    print(f"Products: {len(quote_data.products)}")
    print(f"Total: ${quote_data.products[0].total}")


def main():
    """Main function to run all examples."""
    print("Almona Industrial API Python SDK Examples")
    print("=" * 50)
    
    # Run synchronous example
    sync_example()
    
    # Run asynchronous example
    asyncio.run(async_example())
    
    # Run error handling example
    error_handling_example()
    
    # Run Pydantic models example
    pydantic_models_example()
    
    print("\nExamples completed!")


if __name__ == "__main__":
    main()
