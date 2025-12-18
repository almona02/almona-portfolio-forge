# Run Jobs Table Migration on Railway

## Method 1: Railway Dashboard (Easiest)

1. Go to Railway Dashboard → Your Project
2. Click on **PostgreSQL** service
3. Click **"Connect"** button
4. Copy the connection string
5. Use a PostgreSQL client (like pgAdmin, DBeaver, or psql) to connect
6. Run the SQL from `python_backend/migrations/042_create_jobs_table.sql`

## Method 2: Railway CLI

```bash
# Install Railway CLI if not installed
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run the migration SQL
railway run psql $DATABASE_URL -f python_backend/migrations/042_create_jobs_table.sql
```

## Method 3: Direct Connection (Using psql)

```bash
# Connect directly using the connection string
psql "postgresql://postgres:tzFTgUBFdMOqIJUEnhpzSaoboHPDnvAH@yamabiko.proxy.rlwy.net:19764/railway"

# Then paste the SQL from the migration file
```

## Method 4: Python Script (Fixed)

Run the updated script:
```bash
cd python_backend
python run_jobs_migration.py
```

