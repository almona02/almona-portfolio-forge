/**
 * TypeScript SDK Example
 * Demonstrates how to use the Almona Industrial API TypeScript client
 */

import { createAlmonaAPIClient, TicketCategory, TicketPriority } from '@almona/industrial-api-client';

async function main() {
  // Create client instance
  const client = createAlmonaAPIClient({
    baseURL: 'https://api.almona.com',
    debug: true // Enable debug logging
  });

  try {
    // Authenticate
    console.log('Authenticating...');
    await client.authenticate('user@example.com', 'password');
    console.log('Authentication successful');

    // Get current user
    const user = await client.getCurrentUser();
    console.log('Current user:', user);

    // Create a support ticket
    console.log('\nCreating support ticket...');
    const supportTicket = await client.createSupportTicket({
      category: TicketCategory.SUPPORT,
      payload: {
        title: 'Hydraulic pump failure on CNC machine',
        description: 'The hydraulic pump on our CNC machine (Model XYZ-2000) has started making unusual noises and the pressure readings are inconsistent. This is affecting production quality.',
        priority: TicketPriority.HIGH,
        machine_id: '550e8400-e29b-41d4-a716-446655440000',
        machine_serial_number: 'CNC-2023-001234'
      }
    });
    console.log('Created support ticket:', supportTicket.ticket_number);

    // Create a preventive maintenance ticket
    console.log('\nCreating preventive maintenance ticket...');
    const maintenanceTicket = await client.createPreventiveMaintenanceTicket({
      category: TicketCategory.PREVENTIVE_MAINTENANCE,
      payload: {
        title: 'Monthly maintenance for CNC machine',
        description: 'Scheduled monthly maintenance including lubrication, calibration, and safety checks',
        priority: TicketPriority.MEDIUM,
        machine_id: '550e8400-e29b-41d4-a716-446655440000',
        machine_serial_number: 'CNC-2023-001234'
      },
      maintenance_metadata: {
        checklist_id: 'checklist-001',
        frequency_days: 30,
        plan_id: 'plan-monthly-001',
        maintenance_type: 'routine'
      }
    });
    console.log('Created maintenance ticket:', maintenanceTicket.ticket_number);

    // Create a quote
    console.log('\nCreating quote...');
    const quote = await client.createQuote({
      contact_name: 'Ahmed Hassan',
      contact_email: 'ahmed.hassan@company.com',
      contact_phone: '+20 123 456 7890',
      company: 'Egyptian Manufacturing Co.',
      project_description: 'We need to upgrade our production line with new CNC machines for automotive parts manufacturing.',
      urgency: 'urgent',
      delivery_location: 'Cairo Industrial Zone, Building 15, Floor 3',
      products: [
        {
          product_id: 'prod-cnc-xyz2000',
          quantity: 2,
          unit_price: 1500.00
        }
      ],
      services: [
        {
          service_id: 'svc-maintenance-monthly',
          quantity: 1,
          unit_price: 500.00
        }
      ],
      special_requirements: 'Installation must be completed during weekend hours due to production schedule.',
      machine_id: '550e8400-e29b-41d4-a716-446655440000'
    });
    console.log('Created quote:', quote.quote_number);

    // List tickets
    console.log('\nListing tickets...');
    const tickets = await client.listTickets({
      category: TicketCategory.SUPPORT,
      priority: TicketPriority.HIGH
    });
    console.log(`Found ${tickets.length} high-priority support tickets`);

    // Update ticket status
    if (tickets.length > 0) {
      console.log('\nUpdating ticket status...');
      const updatedTicket = await client.updateTicketStatus(
        tickets[0].id,
        'in_progress',
        'Technician assigned and working on the issue'
      );
      console.log('Updated ticket status:', updatedTicket.status);
    }

    // Lookup quotes
    console.log('\nLooking up quotes...');
    const searchResults = await client.lookupQuotes('QUO-2024');
    console.log(`Found ${searchResults.count} quotes matching 'QUO-2024'`);

    // Get system health
    console.log('\nChecking system health...');
    const health = await client.getHealthStatus();
    console.log('System status:', health.status);

    // Get system metrics
    console.log('\nGetting system metrics...');
    const metrics = await client.getMetrics();
    console.log('API version:', metrics.api.version);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
main().catch(console.error);
