# Security Note: Secret Rotation

**IMPORTANT:** This repository must never contain real secrets, API keys, or credentials in the git history.

## If you suspect a secret has been committed:
1. **Rotate the secret immediately** in the respective service dashboard (e.g., AWS, Stripe, Database).
2. Remove the secret from the codebase and history.
3. Update your local `.env` file with the new secret.

## Local Development
- Use `.env.example` as a template.
- Copy it to `.env` (or `.env.local` for frontend) and fill in real values.
- **Never commit `.env` files.**

## Verification
Run `git status --ignored` to ensure your configuration files are being properly ignored.
