# Database Setup

This project uses PostgreSQL with different configurations for local development and production.

## Local Development (Docker)

### Prerequisites

- Docker and Docker Compose installed on your machine

### Quick Start

1. **Start PostgreSQL container:**

   ```bash
   bun docker:up
   ```

   This starts PostgreSQL in the background on port 5432.

2. **Copy environment file:**

   ```bash
   cp .env.sample .env
   ```

   The DATABASE_URL is already configured for local Docker setup.

3. **Run your bot:**
   ```bash
   bun dev
   ```

### Docker Commands

- `bun docker:up` - Start PostgreSQL container in detached mode
- `bun docker:down` - Stop PostgreSQL container
- `bun docker:logs` - View PostgreSQL logs (follow mode)
- `bun docker:restart` - Restart PostgreSQL container
- `bun docker:clean` - Stop container and remove volumes (⚠️ deletes all data)

### Database Connection Details

When running locally with Docker:

- **Host:** localhost
- **Port:** 5432
- **Database:** townswars
- **User:** townswars
- **Password:** dev_password_change_in_production
- **Connection String:** `postgresql://townswars:dev_password_change_in_production@localhost:5432/townswars`

### Accessing PostgreSQL CLI

To connect to the database using `psql`:

```bash
docker exec -it townswars-postgres psql -U townswars -d townswars
```

## Production (Render.com)

### Setup

1. **Create a PostgreSQL database on Render:**

   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "PostgreSQL"
   - Choose a name and region
   - Select a plan (free tier available)

2. **Get the connection string:**

   - After creation, go to the database dashboard
   - Copy the "Internal Database URL" (if your bot is also hosted on Render)
   - Or copy the "External Database URL" (if hosting elsewhere)

3. **Configure environment variable:**
   - In your Render web service dashboard
   - Go to "Environment" tab
   - Add `DATABASE_URL` with your PostgreSQL connection string
   - Render will automatically use this instead of the local .env value

### Connection String Format

Render provides connection strings in this format:

```
postgresql://username:password@hostname:5432/database_name
```

Your bot will automatically use the `DATABASE_URL` environment variable in production.

## Data Persistence

### Local Development

- Data is stored in a Docker volume named `postgres_data`
- Data persists across container restarts
- Use `bun docker:clean` to completely remove all data and start fresh

### Production

- Render manages backups automatically (on paid plans)
- Free tier databases may have limited retention
- Consider implementing your own backup strategy for critical data

## Troubleshooting

### Container won't start

```bash
# Check if port 5432 is already in use
lsof -i :5432

# Or on Linux
netstat -tuln | grep 5432

# Stop any existing PostgreSQL processes or change the port in docker-compose.yml
```

### Can't connect to database

```bash
# Check container status
docker ps

# View container logs
bun docker:logs

# Restart the container
bun docker:restart
```

### Reset everything

```bash
# Stop and remove all data
bun docker:clean

# Start fresh
bun docker:up
```

## Next Steps

After setting up the database, you'll want to:

1. Install a PostgreSQL client library (e.g., `drizzle-orm`, `prisma`, or `pg`)
2. Create database schemas/migrations
3. Update `src/index.ts` to connect to the database

Example using Drizzle ORM:

```bash
bun add drizzle-orm postgres
bun add -d drizzle-kit
```
