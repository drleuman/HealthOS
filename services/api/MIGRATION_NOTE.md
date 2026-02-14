# Migration Note: Behavior Engine

To ensure a clean and safe deployment of the Behavioral Insight Engine, follow these steps:

## Local/Dev
If you have already applied previous `behavior_engine` migrations and they are causing conflicts:

1. Delete existing behavior migrations:
   `rm -rf prisma/migrations/20240213_behavior_engine*`
2. Run migration dev:
   `npx prisma migrate dev --name behavior_engine_final`
   (Prisma will detect the new squash and ask to reset if needed)

## Staging/Production
Since we are adding new tables:
1. Run: `npx prisma migrate deploy`
   This will apply the `20240214_behavior_engine_squashed` migration cleanly.
2. The tables are new, so no data loss will occur on existing user data.
3. The `DEFAULT` and `NOT NULL` constraints are handled by the clean table creation.
