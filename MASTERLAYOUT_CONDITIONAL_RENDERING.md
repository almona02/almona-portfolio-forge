# MasterLayout Conditional Rendering Fix

## Problem
The MasterLayout was showing workflow-specific UI elements (workflow stepper, project intelligence panel, workflow buttons) on ALL fabricator pages, including non-workflow pages like Projects, Customers, and Inventory.

## Solution
Made MasterLayout conditionally render workflow-specific elements only on workflow pages.

## Changes Made

### 1. Added Conditional Logic
- `shouldShowWorkflowStepper`: Only true on workflow pages (`/fabricator/workflow/` or `/fabricator-workflow`)
- `shouldShowProjectIntelligence`: Only true on workflow pages

### 2. Conditionally Hidden Elements

#### Workflow Stepper (5-Phase Progress Bar)
- **Before**: Always visible
- **After**: Only visible on workflow pages
- **Location**: Lines 270-309

#### Project Intelligence Sidebar
- **Before**: Always visible when sidebar is open
- **After**: Only visible on workflow pages when sidebar is open
- **Location**: Line 324

#### Workflow Header Buttons
- **Before**: "Save Draft" and "Continue →" always visible
- **After**: Only visible on workflow pages
- **Location**: Lines 261-266

#### Workflow Toolbar
- **Before**: Canvas toolbar with grid controls always visible
- **After**: Only visible on workflow pages
- **Location**: Line 422

#### Header Project Info
- **Before**: Always showed specific project name and client
- **After**: Shows "Fabricator Workspace" / "Project Management" on non-workflow pages
- **Location**: Lines 250-253

### 3. Padding Adjustment
- **Workflow pages**: `p-8` (more padding for design workspace)
- **Non-workflow pages**: `p-4` (less padding for content pages)
- **Location**: Line 456

## Result
- **Workflow pages** (`/fabricator/workflow/*`): Show full workflow UI with stepper, project intelligence, and workflow controls
- **Non-workflow pages** (`/fabricator/projects`, `/fabricator/customers`, etc.): Show clean layout with just the header and content area

## Pages Affected
- ✅ `/fabricator/projects` - Now shows clean layout
- ✅ `/fabricator/customers` - Now shows clean layout
- ✅ `/fabricator/inventory` - Now shows clean layout
- ✅ `/fabricator/workflow/engineering-bay` - Still shows full workflow UI
- ✅ `/fabricator/workflow/quality-control` - Still shows full workflow UI

