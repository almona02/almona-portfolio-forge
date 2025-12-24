# Remnant Marketplace, ERP, CRM & Pre-Planning Implementation Draft

**Date:** January 2025  
**Status:** Strategic Planning & Implementation Roadmap  
**Purpose:** Comprehensive plan for prestigious remnant marketplace, ERP integration, CRM pipeline, and pre-planning features

---

## 🏆 Prestigious Remnant Marketplace

### Current Implementation Status

**✅ Core Infrastructure Complete:**
- `src/lib/inventory/RemnantMarketplace.ts` - Full marketplace system
- `src/lib/inventory/SmartRemnantSystem.ts` - ML-powered remnant matching
- Database tables: `remnant_marketplace_listings`, `remnant_marketplace_transactions`
- UI Component: `RemnantMarketplacePreview.tsx`
- ML Prediction: `RemnantUsagePredictor` with confidence scoring

### Vision: Prestigious Marketplace Features

#### 1. **Premium Listing Tiers**
```typescript
interface PremiumListingTier {
  tier: 'standard' | 'premium' | 'verified';
  features: {
    featuredPlacement: boolean;
    prioritySearch: boolean;
    verifiedBadge: boolean;
    analytics: boolean;
    promotionTools: boolean;
  };
  pricing: {
    standard: 'Free';
    premium: '5% transaction fee';
    verified: '3% transaction fee + monthly subscription';
  };
}
```

**Implementation Plan:**
- Add `listing_tier` field to `remnant_marketplace_listings` table
- Create premium listing creation flow
- Implement verified workshop badge system
- Add featured listings carousel on marketplace homepage

#### 2. **Smart Matching & Recommendations**
**Current:** Basic ML prediction exists  
**Enhancement:** Prestigious matching engine

```typescript
interface PrestigiousMatch {
  remnant: Remnant;
  matchScore: number; // 0-100
  confidence: number; // 0-100
  reasons: string[]; // Why this is a good match
  sellerRating: number; // Workshop reputation
  distance: number; // km
  priceCompetitiveness: number; // vs market average
  qualityGuarantee: boolean; // Verified quality
}
```

**Features:**
- AI-powered matching based on project requirements
- Seller reputation scoring (transaction history, ratings)
- Quality verification badges
- Distance-based recommendations
- Price competitiveness analysis

#### 3. **Circular Economy Impact Tracking**
**Strategic Value:** Aligns with Vision 2030 and government messaging

```typescript
interface CircularEconomyMetrics {
  totalRemnantsSold: number;
  totalMaterialSaved: number; // kg
  co2Saved: number; // kg (material_savings_kg * 14.3)
  workshopsParticipating: number;
  transactionsCompleted: number;
  averageWasteReduction: number; // percentage
}
```

**Dashboard Features:**
- Real-time circular economy impact metrics
- Regional heatmap of remnant trading
- Workshop participation leaderboard
- Environmental impact visualization
- Export for government reporting

#### 4. **Advanced Marketplace Features**

**A. Escrow & Payment Protection**
- Secure payment escrow system
- Automatic release on delivery confirmation
- Dispute resolution workflow
- Payment gateway integration (Fawry, Vodafone Cash)

**B. Logistics Integration**
- Delivery cost calculator
- Shipping partner integration
- Tracking number management
- Delivery confirmation system

**C. Quality Assurance**
- Photo verification system
- Quality inspection workflow
- Return/refund policy
- Quality guarantee badges

**D. Analytics & Insights**
- Seller dashboard with sales analytics
- Buyer dashboard with purchase history
- Market trends and pricing insights
- Demand forecasting

#### 5. **Government & Strategic Positioning**

**Messaging (from strategic-plan.md):**
> "Digital Public Good / Sovereign Industrial Asset"; import-substitution FX savings; circular economy via remnant marketplace.

**Key Metrics for Government:**
- FX savings from import substitution
- Circular economy contribution
- Job creation in digital economy
- SME empowerment metrics

---

## 📊 ERP System Implementation

### Current Status

**✅ Existing:**
- ERP bridge (mock/odoo-ready) - Basic structure exists
- Quote→invoice workflow
- Commercial workspace
- VAT invoicing
- Customer Portal

**❌ Not Yet Implemented:**
- Hardened ERP sync milestones
- Bidirectional sync
- Odoo webhook integration
- Stock moves synchronization

### Implementation Roadmap (from strategic-plan.md)

#### Phase 1: Data Models & API Contracts (M1)

**Timeline:** Weeks 9-10

**Deliverables:**
```typescript
// New data models
interface ERPQuote {
  id: string;
  fabricatorProjectId: string;
  odooQuoteId?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  syncedAt?: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
}

interface ERPOrder {
  id: string;
  fabricatorProjectId: string;
  odooOrderId?: string;
  status: 'draft' | 'confirmed' | 'in_production' | 'completed';
  syncedAt?: Date;
}

interface ERPInvoice {
  id: string;
  fabricatorProjectId: string;
  odooInvoiceId?: string;
  status: 'draft' | 'posted' | 'paid';
  syncedAt?: Date;
}

interface StockMove {
  id: string;
  productId: string;
  quantity: number;
  locationFrom: string;
  locationTo: string;
  date: Date;
  syncedAt?: Date;
}
```

**API Contracts:**
- `/api/erp/odoo/webhook` - Odoo webhook endpoint
- `/api/erp/sync/quotes` - Sync quotes to Odoo
- `/api/erp/sync/orders` - Sync orders to Odoo
- `/api/erp/sync/invoices` - Sync invoices to Odoo
- `/api/erp/sync/stock` - Sync stock moves to Odoo
- `/api/erp/status` - Get sync status

#### Phase 2: Bidirectional Sync (M2)

**Timeline:** Weeks 11-12

**Features:**
- **Quote Sync:** Create/update quotes in Odoo from Fabricator Pro
- **Order Sync:** Convert approved quotes to orders in Odoo
- **Invoice Sync:** Generate invoices in Odoo from completed orders
- **Stock Moves:** Sync material consumption to Odoo inventory
- **Pull Updates:** Fetch status changes from Odoo back to Fabricator Pro

**Sync Strategy:**
```typescript
interface SyncStrategy {
  direction: 'push' | 'pull' | 'bidirectional';
  conflictResolution: 'fabricator_wins' | 'odoo_wins' | 'manual';
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: 'exponential' | 'linear';
    timeout: number;
  };
  audit: {
    logBeforeAfter: boolean;
    storeHistory: boolean;
  };
}
```

#### Phase 3: Pilot & Rollback (M3)

**Timeline:** Weeks 13-14

**Pilot Workshops:** 1-2 workshops for testing

**Deliverables:**
- Pilot testing with real Odoo instances
- Rollback/retry playbook
- Error handling and recovery procedures
- User training materials

#### Phase 4: Multi-Tenant Hardening (M4)

**Timeline:** Weeks 15-16

**Features:**
- Multi-tenant ERP configuration
- Per-workshop ERP settings
- Backfill historical data
- Performance optimization
- Monitoring and alerting

### Technical Implementation

**Backend (Python):**
```python
# python_backend/services/erp_odoo_adapter.py
class OdooAdapter:
    def sync_quote(self, quote: ERPQuote) -> SyncResult
    def sync_order(self, order: ERPOrder) -> SyncResult
    def sync_invoice(self, invoice: ERPInvoice) -> SyncResult
    def sync_stock_move(self, move: StockMove) -> SyncResult
    def pull_updates(self, last_sync: datetime) -> List[Update]
```

**Frontend (TypeScript):**
```typescript
// src/lib/erp/OdooSyncManager.ts
class OdooSyncManager {
  async syncQuote(quoteId: string): Promise<SyncResult>
  async syncOrder(orderId: string): Promise<SyncResult>
  async getSyncStatus(): Promise<SyncStatus>
  async retryFailedSyncs(): Promise<void>
}
```

**UI Components:**
- `ERPSyncDashboard.tsx` - Sync status and controls
- `ERPSyncLog.tsx` - Sync history and errors
- `ERPConfiguration.tsx` - Odoo connection settings
- `ManualSyncDialog.tsx` - Manual sync override

---

## 👥 CRM Pipeline Implementation

### Current Status

**✅ Existing:**
- Customer Portal
- Unified ticketing system
- Quote→invoice workflow

**❌ Not Yet Implemented:**
- Explicit CRM pipeline
- Leads/opportunities management
- Contact/org models
- Activity timeline

### Implementation Roadmap

#### Phase 1: Data Models (Week 9)

**New Tables:**
```sql
-- Leads table
CREATE TABLE public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  source VARCHAR(100), -- 'website', 'referral', 'trade_show', etc.
  status VARCHAR(50) DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'converted', 'lost'
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunities table
CREATE TABLE public.crm_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id),
  name VARCHAR(255) NOT NULL,
  value DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'EGP',
  stage VARCHAR(50) DEFAULT 'prospecting', -- 'prospecting', 'qualification', 'proposal', 'negotiation', 'won', 'lost'
  probability INTEGER DEFAULT 0, -- 0-100
  expected_close_date DATE,
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table
CREATE TABLE public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.crm_organizations(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations table
CREATE TABLE public.crm_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  size VARCHAR(50), -- 'small', 'medium', 'large', 'enterprise'
  website VARCHAR(255),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table
CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'call', 'email', 'meeting', 'note', 'quote', 'order'
  subject VARCHAR(255),
  description TEXT,
  related_to_type VARCHAR(50), -- 'lead', 'opportunity', 'contact', 'organization', 'quote', 'order'
  related_to_id UUID,
  performed_by UUID REFERENCES public.profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Phase 2: CRM Pipeline Logic (Week 10)

**Lead Management:**
```typescript
// src/lib/crm/LeadManager.ts
class LeadManager {
  async createLead(data: LeadData): Promise<Lead>
  async qualifyLead(leadId: string): Promise<Opportunity>
  async convertLead(leadId: string): Promise<Contact>
  async updateLeadStatus(leadId: string, status: LeadStatus): Promise<void>
}
```

**Opportunity Management:**
```typescript
// src/lib/crm/OpportunityManager.ts
class OpportunityManager {
  async createOpportunity(data: OpportunityData): Promise<Opportunity>
  async updateStage(opportunityId: string, stage: OpportunityStage): Promise<void>
  async linkToQuote(opportunityId: string, quoteId: string): Promise<void>
  async convertToOrder(opportunityId: string): Promise<Order>
}
```

**Activity Timeline:**
```typescript
// src/lib/crm/ActivityTimeline.ts
class ActivityTimeline {
  async logActivity(activity: Activity): Promise<void>
  async getTimeline(relatedToType: string, relatedToId: string): Promise<Activity[]>
  async linkToQuote(activityId: string, quoteId: string): Promise<void>
  async linkToOrder(activityId: string, orderId: string): Promise<void>
}
```

#### Phase 3: UI Components (Week 11)

**Components:**
- `CRMLeadsDashboard.tsx` - Lead management dashboard
- `CRMOpportunitiesPipeline.tsx` - Opportunity pipeline view
- `CRMContactCard.tsx` - Contact details and timeline
- `CRMActivityLog.tsx` - Activity timeline component
- `CRMQuoteLink.tsx` - Link quotes to opportunities

**Integration Points:**
- Customer Portal: Show related leads/opportunities
- Quote System: Auto-link quotes to opportunities
- Order System: Auto-link orders to opportunities
- Ticketing: Link tickets to contacts/organizations

#### Phase 4: Analytics & Reporting (Week 12)

**Features:**
- Lead conversion rates
- Opportunity pipeline value
- Sales cycle length
- Win/loss analysis
- Activity metrics

---

## 📋 Pre-Planning & Project Planning Drafts

### Current Status

**✅ Existing:**
- `ProjectManagement.ts` - Basic project management
- `NewProjectWizard` - Project creation wizard
- Production scheduling (partial)

**❌ Not Yet Implemented:**
- Comprehensive pre-planning system
- Project templates
- Resource planning
- Timeline estimation

### Pre-Planning Features

#### 1. **Project Templates**

```typescript
interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'residential' | 'commercial' | 'industrial';
  defaultSystemPack: string;
  defaultMaterials: Material[];
  estimatedTimeline: {
    design: number; // days
    fabrication: number; // days
    installation: number; // days
  };
  typicalWindowTypes: WindowType[];
  commonSpecifications: Specification[];
}
```

**Use Cases:**
- Villa project template (casement windows, sliding doors)
- Commercial building template (curtain walls, shopfronts)
- Industrial template (large openings, specialized systems)

#### 2. **Resource Planning**

```typescript
interface ResourcePlan {
  projectId: string;
  resources: {
    materials: MaterialRequirement[];
    labor: LaborRequirement[];
    machines: MachineRequirement[];
    tools: ToolRequirement[];
  };
  timeline: {
    phases: ProjectPhase[];
    dependencies: Dependency[];
    criticalPath: string[];
  };
  costEstimate: {
    materials: number;
    labor: number;
    overhead: number;
    total: number;
  };
}
```

**Features:**
- Material requirement calculation
- Labor allocation planning
- Machine scheduling
- Tool availability checking
- Cost estimation

#### 3. **Project Timeline Estimation**

```typescript
interface TimelineEstimation {
  projectId: string;
  phases: {
    design: PhaseEstimate;
    approval: PhaseEstimate;
    fabrication: PhaseEstimate;
    glazing: PhaseEstimate;
    installation: PhaseEstimate;
  };
  totalDuration: number; // days
  buffer: number; // days
  milestones: Milestone[];
  dependencies: Dependency[];
}
```

**AI-Powered Estimation:**
- Historical project data analysis
- Similar project matching
- Complexity scoring
- Risk factor adjustment

#### 4. **Pre-Planning Dashboard**

**Components:**
- `PrePlanningWizard.tsx` - Step-by-step project planning
- `ResourcePlanner.tsx` - Resource allocation interface
- `TimelineEstimator.tsx` - Timeline estimation tool
- `ProjectTemplates.tsx` - Template selection
- `PrePlanningSummary.tsx` - Planning summary and approval

**Workflow:**
1. **Template Selection** - Choose project template
2. **Requirements Gathering** - Collect project requirements
3. **Resource Planning** - Allocate resources
4. **Timeline Estimation** - Calculate project timeline
5. **Cost Estimation** - Estimate project costs
6. **Approval** - Get stakeholder approval
7. **Project Creation** - Create actual project from plan

#### 5. **Integration with Existing Systems**

**Quote System:**
- Generate quotes from pre-plans
- Update quotes based on plan changes
- Link quotes to pre-plans

**Production Scheduling:**
- Schedule production based on pre-plan timeline
- Allocate machines based on resource plan
- Track progress against plan

**ERP Integration:**
- Sync resource requirements to ERP
- Create purchase orders from material requirements
- Track actual vs planned costs

---

## 🎯 Implementation Priority

### High Priority (Q1 2025)

1. **Remnant Marketplace Enhancements**
   - Premium listing tiers
   - Quality verification system
   - Circular economy metrics dashboard

2. **ERP Phase 1 (M1)**
   - Data models
   - API contracts
   - Basic Odoo adapter

3. **CRM Phase 1**
   - Data models
   - Lead management
   - Basic pipeline

### Medium Priority (Q2 2025)

4. **ERP Phase 2 (M2)**
   - Bidirectional sync
   - Stock moves integration
   - Error handling

5. **CRM Phase 2**
   - Opportunity management
   - Activity timeline
   - Quote/order linking

6. **Pre-Planning Core**
   - Project templates
   - Resource planning
   - Timeline estimation

### Lower Priority (Q3 2025)

7. **ERP Phase 3-4 (M3-M4)**
   - Pilot testing
   - Multi-tenant hardening
   - Performance optimization

8. **CRM Phase 3-4**
   - Analytics dashboard
   - Advanced reporting
   - Integration enhancements

9. **Pre-Planning Advanced**
   - AI-powered estimation
   - Advanced resource optimization
   - Integration with all systems

---

## 📊 Success Metrics

### Remnant Marketplace
- Transaction volume (monthly)
- Workshops participating
- Material saved (kg/month)
- CO₂ saved (kg/month)
- Premium listing adoption rate

### ERP Integration
- Sync success rate (>99%)
- Sync latency (<5 seconds)
- Error rate (<0.1%)
- Pilot workshop satisfaction (>4.5/5)

### CRM Pipeline
- Lead conversion rate
- Opportunity pipeline value
- Sales cycle reduction
- Activity tracking adoption

### Pre-Planning
- Template usage rate
- Planning accuracy (actual vs estimated)
- Resource utilization improvement
- Project delivery on-time rate

---

## 🔗 Related Documents

- `docs/strategic-plan.md` - Overall strategic plan
- `FABRICATOR_ENHANCEMENT_PLAN.md` - Enhancement roadmap
- `STRATEGIC_ENHANCEMENT_IMPLEMENTATION.md` - Implementation status
- `docs/ML_PREDICTION_INTERPRETATION.md` - ML prediction guide

---

**Last Updated:** January 2025  
**Next Review:** After Q1 2025 milestones

