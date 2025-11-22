/**
 * Customer Relationship Management Integration
 * Manages customer data, history, and interactions
 */

export interface Customer {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  address?: {
    street: string;
    city: string;
    country: string;
    postalCode: string;
  };
  type: 'individual' | 'business' | 'contractor';
  status: 'active' | 'inactive' | 'prospect';
  createdAt: Date;
  lastContact?: Date;
  totalOrders: number;
  totalValue: number;
  rating: number; // 1-5
  notes?: string;
  tags: string[];
}

export interface CustomerInteraction {
  id: string;
  customerId: string;
  type: 'call' | 'email' | 'meeting' | 'quote' | 'order' | 'complaint' | 'support';
  date: Date;
  description: string;
  outcome?: string;
  assignedTo?: string;
  followUpDate?: Date;
}

export interface CustomerProject {
  id: string;
  customerId: string;
  projectId: string;
  orderNumber: string;
  status: 'quote' | 'ordered' | 'production' | 'delivered' | 'installed';
  value: number;
  createdAt: Date;
  completedAt?: Date;
}

export class CRMIntegration {
  private customers: Map<string, Customer> = new Map();
  private interactions: Map<string, CustomerInteraction[]> = new Map();
  private projects: Map<string, CustomerProject[]> = new Map();

  /**
   * Add or update customer
   */
  upsertCustomer(customer: Customer): void {
    this.customers.set(customer.id, customer);
  }

  /**
   * Get customer by ID
   */
  getCustomer(customerId: string): Customer | undefined {
    return this.customers.get(customerId);
  }

  /**
   * Search customers
   */
  searchCustomers(query: string): Customer[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.customers.values()).filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.email.toLowerCase().includes(lowerQuery) ||
        c.company?.toLowerCase().includes(lowerQuery) ||
        c.phone.includes(query)
    );
  }

  /**
   * Get customers by status
   */
  getCustomersByStatus(status: Customer['status']): Customer[] {
    return Array.from(this.customers.values()).filter((c) => c.status === status);
  }

  /**
   * Add customer interaction
   */
  addInteraction(interaction: CustomerInteraction): void {
    const customerInteractions = this.interactions.get(interaction.customerId) || [];
    customerInteractions.push(interaction);
    this.interactions.set(interaction.customerId, customerInteractions);

    // Update customer last contact
    const customer = this.customers.get(interaction.customerId);
    if (customer) {
      customer.lastContact = interaction.date;
      this.customers.set(interaction.customerId, customer);
    }
  }

  /**
   * Get customer interactions
   */
  getCustomerInteractions(customerId: string): CustomerInteraction[] {
    return this.interactions.get(customerId) || [];
  }

  /**
   * Add customer project
   */
  addProject(project: CustomerProject): void {
    const customerProjects = this.projects.get(project.customerId) || [];
    customerProjects.push(project);
    this.projects.set(project.customerId, customerProjects);

    // Update customer statistics
    const customer = this.customers.get(project.customerId);
    if (customer) {
      customer.totalOrders += 1;
      customer.totalValue += project.value;
      this.customers.set(project.customerId, customer);
    }
  }

  /**
   * Get customer projects
   */
  getCustomerProjects(customerId: string): CustomerProject[] {
    return this.projects.get(customerId) || [];
  }

  /**
   * Get customer history summary
   */
  getCustomerHistory(customerId: string): {
    customer: Customer;
    interactions: CustomerInteraction[];
    projects: CustomerProject[];
    totalValue: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
  } {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    const interactions = this.getCustomerInteractions(customerId);
    const projects = this.getCustomerProjects(customerId);
    const totalValue = projects.reduce((sum, p) => sum + p.value, 0);
    const averageOrderValue =
      projects.length > 0 ? totalValue / projects.length : 0;
    const lastOrderDate = projects
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      ?.createdAt;

    return {
      customer,
      interactions,
      projects,
      totalValue,
      averageOrderValue,
      lastOrderDate,
    };
  }

  /**
   * Get top customers by value
   */
  getTopCustomers(limit: number = 10): Customer[] {
    return Array.from(this.customers.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);
  }

  /**
   * Get customers requiring follow-up
   */
  getCustomersRequiringFollowUp(daysThreshold: number = 30): Customer[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    return Array.from(this.customers.values()).filter((c) => {
      if (!c.lastContact) return true;
      return c.lastContact < cutoffDate && c.status === 'active';
    });
  }

  /**
   * Calculate customer lifetime value
   */
  calculateLifetimeValue(customerId: string): number {
    const customer = this.customers.get(customerId);
    if (!customer) return 0;

    const projects = this.getCustomerProjects(customerId);
    const totalValue = projects.reduce((sum, p) => sum + p.value, 0);
    const averageOrderValue =
      projects.length > 0 ? totalValue / projects.length : 0;
    const estimatedFutureOrders = Math.max(0, 12 - projects.length); // Estimate next year

    return totalValue + averageOrderValue * estimatedFutureOrders * 0.7; // 70% retention
  }
}

