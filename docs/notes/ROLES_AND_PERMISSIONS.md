# Roles and Permissions Documentation

## Overview

This document defines the user roles, permissions matrix, and Row Level Security (RLS) policies for Almona Portfolio Forge. The system uses Supabase Row Level Security to enforce database-level access control, ensuring that users can only access data they are authorized to view or modify.

## User Roles

The platform supports four primary roles:

1. **Technical Officer**: Full system access with administrative privileges
2. **User Admin**: User management and configuration access
3. **Operator**: Production workflow access with limited administrative capabilities
4. **Installer**: Field installation and service access

## Permission Matrix

### Projects & Quotes

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| Technical Officer | ✅ All | ✅ All | ✅ All | ✅ All |
| User Admin | ✅ All | ✅ All | ✅ All | ✅ Own |
| Operator | ✅ Own | ✅ Own + Assigned | ✅ Own + Assigned | ❌ |
| Installer | ❌ | ✅ Assigned Only | ✅ Assigned Only | ❌ |

**Notes:**
- Operators can create projects but only modify those assigned to them
- Installers can only view projects assigned for installation
- User Admins can delete only their own projects (not others')

### Profiles & Calibrations

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| Technical Officer | ✅ All | ✅ All | ✅ All | ✅ All |
| User Admin | ✅ All | ✅ All | ✅ All | ✅ All |
| Operator | ✅ Own | ✅ Own + Shared | ✅ Own | ✅ Own |
| Installer | ❌ | ✅ Read-Only | ❌ | ❌ |

**Notes:**
- Operators can create and manage their own profile calibrations
- Shared profiles are readable by all operators but only editable by creator
- Installers have read-only access for reference during installation

### Optimization & Cut Lists

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| Technical Officer | ✅ All | ✅ All | ✅ All | ✅ All |
| User Admin | ✅ All | ✅ All | ✅ All | ✅ All |
| Operator | ✅ Own | ✅ Own + Assigned | ✅ Own | ✅ Own |
| Installer | ❌ | ✅ Assigned Only | ❌ | ❌ |

**Notes:**
- Operators can generate optimizations for their own projects
- Cut lists are assigned to specific operators for production
- Installers can view cut lists for installation verification only

### Analytics Dashboards

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| Technical Officer | ✅ All | ✅ All | ✅ All | ✅ All |
| User Admin | ✅ All | ✅ All | ✅ All | ✅ Own |
| Operator | ❌ | ✅ Own Data Only | ❌ | ❌ |
| Installer | ❌ | ❌ | ❌ | ❌ |

**Notes:**
- Operators can view their own performance metrics and calibration analytics
- Financial data and cross-user analytics are restricted to Technical Officers and User Admins
- Installers have no analytics access

### Users & Roles

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| Technical Officer | ✅ All | ✅ All | ✅ All | ✅ All |
| User Admin | ✅ All | ✅ All | ✅ All | ✅ Non-Admin Only |
| Operator | ❌ | ✅ Own Profile | ✅ Own Profile | ❌ |
| Installer | ❌ | ✅ Own Profile | ✅ Own Profile | ❌ |

**Notes:**
- User Admins can manage users but cannot delete other admins or technical officers
- Operators and Installers can only view and update their own profiles

### Inventory & Remnants

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| Technical Officer | ✅ All | ✅ All | ✅ All | ✅ All |
| User Admin | ✅ All | ✅ All | ✅ All | ✅ All |
| Operator | ✅ Own | ✅ All | ✅ Own | ✅ Own |
| Installer | ❌ | ✅ Read-Only | ❌ | ❌ |

**Notes:**
- Operators can add inventory and manage their own remnants
- All operators can view inventory for material planning
- Installers have read-only access for installation planning

## Implementation: Row Level Security (RLS) Policies

### Database Schema Assumptions

- `public.profiles` table has a `role` column with values: `'technical_officer'`, `'user_admin'`, `'operator'`, `'installer'`
- `public.profiles` table has an `id` column that matches `auth.uid()`
- All tables have appropriate foreign key relationships

### RLS Policies SQL

```sql
-- ============================================================================
-- Helper Function: Get User Role
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- Projects & Quotes (fabricator_positions)
-- ============================================================================
ALTER TABLE public.fabricator_positions ENABLE ROW LEVEL SECURITY;

-- Technical Officer: Full access
CREATE POLICY "technical_officer_full_access" ON public.fabricator_positions
  FOR ALL USING (
    get_user_role(auth.uid()) = 'technical_officer'
  );

-- User Admin: Full access
CREATE POLICY "user_admin_full_access" ON public.fabricator_positions
  FOR ALL USING (
    get_user_role(auth.uid()) = 'user_admin'
  );

-- Operator: Own and assigned projects
CREATE POLICY "operator_own_and_assigned" ON public.fabricator_positions
  FOR ALL USING (
    get_user_role(auth.uid()) = 'operator' AND (
      owner_user_id = auth.uid() OR
      assigned_operator_id = auth.uid()
    )
  );

-- Installer: Assigned projects only (read/update)
CREATE POLICY "installer_assigned_only" ON public.fabricator_positions
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'installer' AND
    assigned_installer_id = auth.uid()
  );
CREATE POLICY "installer_update_assigned" ON public.fabricator_positions
  FOR UPDATE USING (
    get_user_role(auth.uid()) = 'installer' AND
    assigned_installer_id = auth.uid()
  );

-- ============================================================================
-- Profiles & Calibrations (fabricator_profiles, profile_calibrations)
-- ============================================================================
ALTER TABLE public.fabricator_profiles ENABLE ROW LEVEL SECURITY;

-- Technical Officer & User Admin: Full access
CREATE POLICY "admin_full_profile_access" ON public.fabricator_profiles
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('technical_officer', 'user_admin')
  );

-- Operator: Own profiles + shared profiles
CREATE POLICY "operator_profile_access" ON public.fabricator_profiles
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'operator' AND (
      user_id = auth.uid() OR
      is_shared = TRUE
    )
  );
CREATE POLICY "operator_own_profile_modify" ON public.fabricator_profiles
  FOR ALL USING (
    get_user_role(auth.uid()) = 'operator' AND
    user_id = auth.uid()
  );

-- Installer: Read-only access
CREATE POLICY "installer_profile_read" ON public.fabricator_profiles
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'installer'
  );

-- Profile Calibrations
ALTER TABLE public.profile_calibrations ENABLE ROW LEVEL SECURITY;

-- Technical Officer & User Admin: Full access
CREATE POLICY "admin_full_calibration_access" ON public.profile_calibrations
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('technical_officer', 'user_admin')
  );

-- Operator: Own calibrations
CREATE POLICY "operator_own_calibrations" ON public.profile_calibrations
  FOR ALL USING (
    get_user_role(auth.uid()) = 'operator' AND
    user_id = auth.uid()
  );

-- Installer: Read-only
CREATE POLICY "installer_calibration_read" ON public.profile_calibrations
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'installer'
  );

-- ============================================================================
-- Optimization & Cut Lists (optimization_comparisons, cutting_plans)
-- ============================================================================
ALTER TABLE public.optimization_comparisons ENABLE ROW LEVEL SECURITY;

-- Technical Officer & User Admin: Full access
CREATE POLICY "admin_full_optimization_access" ON public.optimization_comparisons
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('technical_officer', 'user_admin')
  );

-- Operator: Own optimizations
CREATE POLICY "operator_own_optimizations" ON public.optimization_comparisons
  FOR ALL USING (
    get_user_role(auth.uid()) = 'operator' AND
    EXISTS (
      SELECT 1 FROM public.fabricator_positions fp
      WHERE fp.id = optimization_comparisons.position_id
      AND (fp.owner_user_id = auth.uid() OR fp.assigned_operator_id = auth.uid())
    )
  );

-- Installer: Assigned projects only (read)
CREATE POLICY "installer_optimization_read" ON public.optimization_comparisons
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'installer' AND
    EXISTS (
      SELECT 1 FROM public.fabricator_positions fp
      WHERE fp.id = optimization_comparisons.position_id
      AND fp.assigned_installer_id = auth.uid()
    )
  );

-- ============================================================================
-- Analytics Dashboards (calibration_analytics, workshop_metrics)
-- ============================================================================
ALTER TABLE public.calibration_analytics ENABLE ROW LEVEL SECURITY;

-- Technical Officer & User Admin: Full access
CREATE POLICY "admin_full_analytics_access" ON public.calibration_analytics
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('technical_officer', 'user_admin')
  );

-- Operator: Own data only
CREATE POLICY "operator_own_analytics" ON public.calibration_analytics
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'operator' AND
    user_id = auth.uid()
  );

-- Installer: No access
-- (No policy = no access)

-- ============================================================================
-- Users & Roles (profiles table)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Technical Officer: Full access
CREATE POLICY "technical_officer_user_management" ON public.profiles
  FOR ALL USING (
    get_user_role(auth.uid()) = 'technical_officer'
  );

-- User Admin: Can manage non-admin users
CREATE POLICY "user_admin_manage_users" ON public.profiles
  FOR ALL USING (
    get_user_role(auth.uid()) = 'user_admin' AND
    (role NOT IN ('technical_officer', 'user_admin') OR id = auth.uid())
  );

-- Operator & Installer: Own profile only
CREATE POLICY "user_own_profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "user_update_own_profile" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid() AND
    get_user_role(auth.uid()) IN ('operator', 'installer')
  );

-- ============================================================================
-- Inventory & Remnants (fabricator_profiles, material_remnants)
-- ============================================================================
-- Inventory (fabricator_profiles) - already covered above

-- Material Remnants
ALTER TABLE public.material_remnants ENABLE ROW LEVEL SECURITY;

-- Technical Officer & User Admin: Full access
CREATE POLICY "admin_full_remnant_access" ON public.material_remnants
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('technical_officer', 'user_admin')
  );

-- Operator: Read all, modify own
CREATE POLICY "operator_read_all_remnants" ON public.material_remnants
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'operator'
  );
CREATE POLICY "operator_modify_own_remnants" ON public.material_remnants
  FOR ALL USING (
    get_user_role(auth.uid()) = 'operator' AND
    owner_user_id = auth.uid()
  );

-- Installer: Read-only
CREATE POLICY "installer_remnant_read" ON public.material_remnants
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'installer'
  );

-- ============================================================================
-- Remnant Marketplace
-- ============================================================================
ALTER TABLE public.remnant_marketplace_listings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read listings
CREATE POLICY "all_read_listings" ON public.remnant_marketplace_listings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can create their own listings
CREATE POLICY "users_create_own_listings" ON public.remnant_marketplace_listings
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    seller_user_id = auth.uid()
  );

-- Users can update/delete their own listings
CREATE POLICY "users_manage_own_listings" ON public.remnant_marketplace_listings
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    seller_user_id = auth.uid()
  );

-- ============================================================================
-- Optimization Equalizer Preferences
-- ============================================================================
ALTER TABLE public.optimization_equalizer_preferences ENABLE ROW LEVEL SECURITY;

-- Users manage their own preferences
CREATE POLICY "users_manage_own_preferences" ON public.optimization_equalizer_preferences
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- Profile Machining Zones
-- ============================================================================
ALTER TABLE public.profile_machining_zones ENABLE ROW LEVEL SECURITY;

-- Users manage their own zones
CREATE POLICY "users_manage_own_zones" ON public.profile_machining_zones
  FOR ALL USING (auth.uid() = user_id);
```

## Client-Side Access Control

### Existing Implementation

The application already has some client-side access control mechanisms:

1. **ProtectedComponent** (`src/components/auth/ProtectedComponent.tsx`)
   - Supports `requireRole` prop for role-based access
   - Currently used for basic authentication checks
   - **Action Required**: Enhance to support the four defined roles

2. **FeatureGates** (`src/lib/subscription/FeatureGates.ts`)
   - Subscription-based feature access
   - Currently checks project creation limits
   - **Action Required**: Add role-based feature gates

3. **ProtectedRoute** (`src/components/auth/ProtectedRoute.tsx`)
   - Route-level authentication protection
   - **Action Required**: Add role-based route protection

### Components Requiring Role Checks

The following components should verify user roles before rendering sensitive information:

1. **Admin Dashboard** (`src/pages/AdminDashboard.tsx`)
   - **Current**: Protected by authentication only
   - **Required**: 
     - Add role check: Only `technical_officer` and `user_admin` should access
     - Hide financial/cross-user analytics from operators
     - Use `ProtectedComponent` with `requireRole={['technical_officer', 'user_admin']}`

2. **Personal Analytics Dashboard** (`src/components/fabricator/PersonalAnalyticsDashboard.tsx`)
   - **Current**: Shows all user's own data
   - **Required**: 
     - Operators: Show only own data (already implemented)
     - Technical Officers/User Admins: Show aggregated cross-user data
     - Installers: No access (hide component)

3. **User Management Components**
   - Should restrict user creation/deletion to Technical Officers and User Admins
   - Operators should not see user management UI

4. **Optimization Equalizer** (`src/components/fabricator/OptimizationEqualizer.tsx`)
   - **Current**: All authenticated users can access
   - **Required**: 
     - All roles can use (no change needed)
     - Consider: Operators see only their own saved strategies
     - Admins can view/manage all strategies

5. **Calibration Analytics** (via `CalibrationAnalytics.ts`)
   - **Current**: Data collection is automatic and user-scoped
   - **Required**: 
     - Operators: Can view own analytics (already enforced by RLS)
     - Technical Officers/User Admins: Can view aggregated analytics
     - Installers: No analytics access
   - **Implementation**: Add role check in `PersonalAnalyticsDashboard` to show aggregated view for admins

## Security Best Practices

1. **Never Trust Client-Side Checks Alone**: RLS policies are the primary security layer
2. **Principle of Least Privilege**: Users should only have access to what they need
3. **Audit Logging**: All sensitive operations should be logged
4. **Regular Policy Review**: Periodically review and test RLS policies
5. **Role Validation**: Always validate user roles server-side, not just client-side

## Testing RLS Policies

To test RLS policies:

1. Create test users with different roles
2. Attempt operations that should be denied
3. Verify that denied operations fail with appropriate errors
4. Test edge cases (e.g., shared profiles, assigned projects)

## Migration Script

The complete RLS policy migration script is provided above. Execute it in your Supabase SQL Editor after ensuring:

1. The `profiles` table has a `role` column
2. All referenced tables exist
3. Foreign key relationships are properly established

## Notes

- RLS policies are evaluated for every query, so keep them efficient
- Use `SECURITY DEFINER` functions sparingly and only for trusted operations
- Consider adding indexes on columns used in RLS policies for performance
- Test policies thoroughly before deploying to production

