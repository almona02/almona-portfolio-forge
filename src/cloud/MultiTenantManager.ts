/**
 * Multi-Tenant Architecture Manager
 * Manages multiple companies/organizations on the same platform
 */

export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial' | 'expired';
  plan: 'free' | 'basic' | 'professional' | 'enterprise';
  createdAt: Date;
  expiresAt?: Date;
  settings: TenantSettings;
  limits: TenantLimits;
  usage: TenantUsage;
}

export interface TenantSettings {
  branding: {
    logo?: string;
    primaryColor?: string;
    companyName?: string;
  };
  features: {
    cncIntegration: boolean;
    advancedAnalytics: boolean;
    apiAccess: boolean;
    customReports: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    currency: string;
  };
}

export interface TenantLimits {
  maxUsers: number;
  maxProjects: number;
  maxStorageGB: number;
  maxApiCalls: number;
  maxLocations: number;
}

export interface TenantUsage {
  users: number;
  projects: number;
  storageGB: number;
  apiCalls: number;
  locations: number;
}

export class MultiTenantManager {
  private tenants: Map<string, Tenant> = new Map();

  /**
   * Create new tenant
   */
  createTenant(
    name: string,
    subdomain: string,
    plan: Tenant['plan'] = 'trial'
  ): Tenant {
    const tenant: Tenant = {
      id: `tenant_${Date.now()}`,
      name,
      subdomain: subdomain.toLowerCase(),
      status: plan === 'trial' ? 'trial' : 'active',
      plan,
      createdAt: new Date(),
      expiresAt:
        plan === 'trial'
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          : undefined, // 14 days trial
      settings: {
        branding: {
          companyName: name,
        },
        features: this.getDefaultFeatures(plan),
        preferences: {
          language: 'en',
          timezone: 'UTC',
          currency: 'EUR',
        },
      },
      limits: this.getDefaultLimits(plan),
      usage: {
        users: 0,
        projects: 0,
        storageGB: 0,
        apiCalls: 0,
        locations: 0,
      },
    };

    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  /**
   * Get tenant by ID
   */
  getTenant(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  /**
   * Get tenant by subdomain
   */
  getTenantBySubdomain(subdomain: string): Tenant | undefined {
    return Array.from(this.tenants.values()).find(
      (t) => t.subdomain === subdomain
    );
  }

  /**
   * Update tenant settings
   */
  updateTenantSettings(
    tenantId: string,
    settings: Partial<TenantSettings>
  ): void {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

    tenant.settings = {
      ...tenant.settings,
      ...settings,
      branding: { ...tenant.settings.branding, ...settings.branding },
      features: { ...tenant.settings.features, ...settings.features },
      preferences: { ...tenant.settings.preferences, ...settings.preferences },
    };
  }

  /**
   * Update tenant usage
   */
  updateUsage(tenantId: string, usage: Partial<TenantUsage>): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;

    const newUsage = { ...tenant.usage, ...usage };

    // Check limits
    if (
      newUsage.users > tenant.limits.maxUsers ||
      newUsage.projects > tenant.limits.maxProjects ||
      newUsage.storageGB > tenant.limits.maxStorageGB ||
      newUsage.apiCalls > tenant.limits.maxApiCalls ||
      newUsage.locations > tenant.limits.maxLocations
    ) {
      return false; // Limit exceeded
    }

    tenant.usage = newUsage;
    return true;
  }

  /**
   * Upgrade tenant plan
   */
  upgradePlan(tenantId: string, newPlan: Tenant['plan']): void {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

    tenant.plan = newPlan;
    tenant.limits = this.getDefaultLimits(newPlan);
    tenant.settings.features = this.getDefaultFeatures(newPlan);
    tenant.status = 'active';
  }

  /**
   * Check if tenant has access to feature
   */
  hasFeature(tenantId: string, feature: keyof TenantSettings['features']): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;

    return tenant.settings.features[feature] || false;
  }

  /**
   * Get default features for plan
   */
  private getDefaultFeatures(plan: Tenant['plan']): TenantSettings['features'] {
    switch (plan) {
      case 'free':
        return {
          cncIntegration: false,
          advancedAnalytics: false,
          apiAccess: false,
          customReports: false,
        };
      case 'basic':
        return {
          cncIntegration: true,
          advancedAnalytics: false,
          apiAccess: false,
          customReports: false,
        };
      case 'professional':
        return {
          cncIntegration: true,
          advancedAnalytics: true,
          apiAccess: true,
          customReports: true,
        };
      case 'enterprise':
        return {
          cncIntegration: true,
          advancedAnalytics: true,
          apiAccess: true,
          customReports: true,
        };
      default:
        return {
          cncIntegration: false,
          advancedAnalytics: false,
          apiAccess: false,
          customReports: false,
        };
    }
  }

  /**
   * Get default limits for plan
   */
  private getDefaultLimits(plan: Tenant['plan']): TenantLimits {
    switch (plan) {
      case 'free':
        return {
          maxUsers: 1,
          maxProjects: 10,
          maxStorageGB: 1,
          maxApiCalls: 100,
          maxLocations: 1,
        };
      case 'basic':
        return {
          maxUsers: 5,
          maxProjects: 100,
          maxStorageGB: 10,
          maxApiCalls: 1000,
          maxLocations: 3,
        };
      case 'professional':
        return {
          maxUsers: 25,
          maxProjects: 1000,
          maxStorageGB: 100,
          maxApiCalls: 10000,
          maxLocations: 10,
        };
      case 'enterprise':
        return {
          maxUsers: -1, // Unlimited
          maxProjects: -1,
          maxStorageGB: -1,
          maxApiCalls: -1,
          maxLocations: -1,
        };
      default:
        return {
          maxUsers: 1,
          maxProjects: 10,
          maxStorageGB: 1,
          maxApiCalls: 100,
          maxLocations: 1,
        };
    }
  }

  /**
   * Check tenant status
   */
  checkTenantStatus(tenantId: string): {
    active: boolean;
    canCreateProject: boolean;
    canAddUser: boolean;
    message?: string;
  } {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return {
        active: false,
        canCreateProject: false,
        canAddUser: false,
        message: 'Tenant not found',
      };
    }

    const now = new Date();
    const expired = tenant.expiresAt && tenant.expiresAt < now;
    const suspended = tenant.status === 'suspended';

    if (expired || suspended) {
      return {
        active: false,
        canCreateProject: false,
        canAddUser: false,
        message: expired ? 'Tenant subscription expired' : 'Tenant suspended',
      };
    }

    const canCreateProject =
      tenant.limits.maxProjects === -1 ||
      tenant.usage.projects < tenant.limits.maxProjects;
    const canAddUser =
      tenant.limits.maxUsers === -1 ||
      tenant.usage.users < tenant.limits.maxUsers;

    return {
      active: true,
      canCreateProject,
      canAddUser,
      message: canCreateProject && canAddUser ? undefined : 'Limit reached',
    };
  }
}

