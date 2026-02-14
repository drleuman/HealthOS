# Migration Safety Policy (HealthOS)

## 🚨 Critical Rules for Production

1.  **NEVER use `prisma db push` in production.**
    *   `db push` can cause data loss by resetting the schema.
    *   It is strictly for local prototyping.

2.  **ALWAYS use Migrations.**
    *   **Dev**: `prisma migrate dev` (creates history).
    *   **Prod**: `prisma migrate deploy` (applies history safely).

## Workflow

### 1. Local Development (Changing Schema)
```bash
# Make changes to schema.prisma
npx prisma migrate dev --name describe_your_change
```
*   This creates a SQL file in `prisma/migrations`.
*   Commit this file to git.

### 2. Production Deployment
The CI/CD pipeline or release script must run:
```bash
npx prisma migrate deploy
```
*   This checks the `_prisma_migrations` table.
*   Applies only new, committed migrations.

## Troubleshooting
If production drift occurs (database schema doesn't match migration history):
*   Do **NOT** force push.
*   Create a new migration locally that reconciles the difference.
*   Or use `prisma migrate resolve` if a migration failed mid-way.
