# HealthOS Frontend MVP 🚀

Frontend minimalista ("terapéutico") para HealthOS enfocado en el loop diario de hábitos.

## Stack
- **Next.js 14** (App Router)
- **TypeScript**
- **CSS Modules** (Inline Styles for MVP speed)
- **No external UI libs** (Pure HTML/CSS)

## Estructura
```
apps/web/
├── app/
│   └── app/
│       ├── login/          # Auth
│       ├── onboarding/     # 5-step wizard
│       ├── today/          # Daily tasks (Main UI)
│       └── route/          # Progress visualization
├── lib/
│   └── api.ts              # API Client + Auth + Tracking
└── ...
```

## Setup Local

1. **Configurar entorno**:
   ```bash
   cp .env.local.example .env.local
   # Editar NEXT_PUBLIC_API_URL si es necesario (default: http://localhost:4000)
   ```

2. **Instalar dependencias**:
   ```bash
   pnpm install
   ```

3. **Correr desarrollo**:
   ```bash
   npm run dev
   # Frontend: http://localhost:3000
   ```

## Flujo de Usuario (Core Loop)

1. **Login**: Email magic link / passwordless (simulado en MVP con email directo)
2. **Onboarding**: Si es usuario nuevo, completa assessment de 5 pasos.
3. **Today**: Ve su foco único del día. Marca como "Hecho".
4. **Route**: Ve su progreso y días desbloqueados.
5. **Tool**: Si hay herramienta recomendada, click abre tienda con SSO.

## Tracking

Eventos instrumentados automáticamente:
- `day_started`
- `action_marked_done`
- `day_completed`
- `onboarding_completed`
- `tool_opened_store`

## Deployment

Listo para deploy en Vercel. Asegurar variables de entorno:
- `NEXT_PUBLIC_API_URL`: URL de producción de la API NestJS.

---
**Estado**: ✅ MVP Completed (Feb 2026)
