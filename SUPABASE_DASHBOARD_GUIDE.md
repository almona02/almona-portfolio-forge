# Supabase Dashboard Settings Guide

## Finding Settings in Supabase Dashboard

### 1. Leaked Password Protection

**Location:** Authentication Settings

**Step-by-step:**
1. Open your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. In the left sidebar, click **"Authentication"** (under "Authentication & Authorization")
4. Click **"Policies"** tab at the top
5. Scroll down to find **"Password Protection"** section
6. Look for **"Leaked Password Protection"** toggle
7. Enable it

**Alternative path if not found:**
- Go to **Authentication** → **Settings** (gear icon)
- Look for **"Password Security"** or **"Password Protection"** section
- Enable **"Leaked Password Protection"**

**Note:** If you don't see this option, it might be:
- Already enabled by default in newer Supabase projects
- Available only in certain Supabase plans
- Located under **Authentication** → **Configuration** → **Password**

### 2. PostgreSQL Database Upgrade

**Location:** Database Settings / Project Settings

**Step-by-step:**

**Method 1: Via Project Settings**
1. Open your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. In the left sidebar, click **"Settings"** (gear icon at the bottom)
4. Click **"Infrastructure"** or **"Database"** in the settings menu
5. Look for **"Database Version"** or **"PostgreSQL Version"**
6. If an upgrade is available, you'll see an **"Upgrade"** or **"Update"** button
7. Click it and follow the upgrade wizard

**Method 2: Via Database Section**
1. In the left sidebar, click **"Database"** (under "Database")
2. Look for a banner or notification about available updates
3. Or check the **"Settings"** tab within Database section

**Method 3: Check Current Version**
1. Go to **Database** → **Settings**
2. Look for **"Database Version"** or **"PostgreSQL Version"**
3. Compare with latest available version
4. If outdated, contact Supabase support or check for upgrade option

**Note:** Database upgrades might:
- Require a maintenance window
- Be available only for certain plans
- Require contacting Supabase support
- Be automatic in some cases

### 3. Alternative: Check via SQL

You can check your current PostgreSQL version:

```sql
SELECT version();
```

This will show your current PostgreSQL version. Compare it with the latest available version on the PostgreSQL website.

### 4. If Settings Are Not Visible

**Possible reasons:**
1. **Plan limitations:** Some features are only available on paid plans
2. **Project type:** Some settings might not be available for certain project types
3. **UI updates:** Supabase regularly updates their dashboard - settings might have moved
4. **Permissions:** You might not have admin access to change these settings

**What to do:**
1. Check your Supabase plan/account type
2. Contact Supabase support: support@supabase.com
3. Check Supabase documentation: https://supabase.com/docs
4. Look for a search bar in the dashboard and search for "password protection" or "database upgrade"

### 5. Screenshot Locations (What to Look For)

**For Leaked Password Protection:**
- Look for icons: 🔒 (lock), ⚙️ (settings), or 🛡️ (shield)
- Look for text: "Password", "Security", "Protection", "Leaked"
- Check under: Authentication → Settings → Security

**For Database Upgrade:**
- Look for: "Version", "Upgrade", "Update", "Infrastructure"
- Check: Settings → Infrastructure → Database
- Look for: Version number (e.g., "PostgreSQL 15.4" or "17.4.1.064")

### 6. Quick Navigation Tips

**Using the Search Bar:**
- Most Supabase dashboards have a search function
- Try searching: "password protection", "leaked password", "database upgrade", "postgres version"

**Using Browser Find (Ctrl+F / Cmd+F):**
- Press Ctrl+F (Windows) or Cmd+F (Mac)
- Search for: "password", "upgrade", "version", "leaked"

### 7. Contact Support

If you still can't find these settings:

**Supabase Support:**
- Email: support@supabase.com
- Discord: https://discord.supabase.com
- GitHub: https://github.com/supabase/supabase/discussions
- Documentation: https://supabase.com/docs/guides/auth/password-security

**When contacting support, mention:**
- You're looking for "Leaked Password Protection" setting
- You need to upgrade PostgreSQL from version `supabase-postgres-17.4.1.064`
- You've checked Authentication → Settings and Database → Settings
- Your project plan/type

