# Frontend MVP - Iteración F1: Auth + Ruta Protegida ✅

## Objetivo
Implementar login con JWT y protección de rutas.

## Entregables

### 1. API Client Wrapper (`lib/api.ts`)
- ✅ Fetch con autenticación automática
- ✅ Retry una vez en errores de red
- ✅ Manejo de 401 → redirect a login
- ✅ Token storage en localStorage + memoria
- ✅ Métodos: login, get, post
- ✅ trackEvent helper (fire-and-forget)

### 2. Auth Storage
- ✅ Token guardado en localStorage
- ✅ Token en memoria para requests
- ✅ Auto-clear en 401

### 3. Login Page (`/app/login`)
- ✅ Input de email
- ✅ Llamada a POST /auth/login
- ✅ Guarda JWT en storage
- ✅ Redirect a /app/today
- ✅ Loading state
- ✅ Error handling

### 4. Route Protection
- ✅ `ProtectedRoute` component
- ✅ Verifica autenticación
- ✅ Redirect a /app/login si no autenticado
- ✅ Aplicado a /app/today y /app/route

## Estructura de Archivos

```
apps/web/
├── lib/
│   └── api.ts                    # API client wrapper
├── app/
│   └── app/
│       ├── page.tsx              # Root redirect
│       ├── ProtectedRoute.tsx    # Route guard
│       ├── login/
│       │   └── page.tsx          # Login page
│       ├── today/
│       │   └── page.tsx          # Protected (placeholder)
│       └── route/
│           └── page.tsx          # Protected (placeholder)
├── .env.local                    # Environment config
└── .env.local.example            # Environment template
```

## Cómo Probar

### 1. Iniciar API
```bash
# Terminal 1: API debe estar corriendo
cd f:\HEALTHOS
npx pnpm --filter @healthos/api dev
# API en http://localhost:4000
```

### 2. Iniciar Frontend
```bash
# Terminal 2: Iniciar Next.js
cd f:\HEALTHOS\apps\web
npm run dev
# Frontend en http://localhost:3000
```

### 3. Abrir en Navegador
```
http://localhost:3000/app
```

## Test Cases

### ✅ Test 1: Login Funciona
1. Abrir http://localhost:3000/app/login
2. Ingresar email: `test@example.com`
3. Click "Continuar"
4. **Esperado**: Redirect a /app/today
5. **Verificar**: Token guardado en localStorage

```javascript
// En DevTools Console:
localStorage.getItem('healthos_token')
// Debe retornar: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### ✅ Test 2: Sin Token → Redirect a Login
1. Abrir DevTools Console
2. Ejecutar: `localStorage.removeItem('healthos_token')`
3. Navegar a http://localhost:3000/app/today
4. **Esperado**: Redirect automático a /app/login

### ✅ Test 3: Con Token → Acceso a Rutas Protegidas
1. Login exitoso (Test 1)
2. Navegar a http://localhost:3000/app/today
3. **Esperado**: Página carga (muestra "Hoy")
4. Navegar a http://localhost:3000/app/route
5. **Esperado**: Página carga (muestra "Tu Ruta")

### ✅ Test 4: API 401 → Auto Logout
1. Login exitoso
2. En DevTools Console, corromper token:
   ```javascript
   localStorage.setItem('healthos_token', 'invalid-token')
   ```
3. Recargar página
4. **Esperado**: API retorna 401, redirect a /app/login

### ✅ Test 5: Root Redirect
1. Navegar a http://localhost:3000/app
2. **Sin token**: Redirect a /app/login
3. **Con token**: Redirect a /app/today

## API Endpoints Utilizados

### POST /auth/login
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "mock-uuid",
    "email": "test@example.com",
    "plan": "member"
  }
}
```

## Troubleshooting

### Error: "Cannot reach API"
```bash
# Verificar que API esté corriendo
curl http://localhost:4000/health
# Debe retornar: {"status":"ok",...}
```

### Error: "CORS blocked"
```bash
# Verificar APP_ORIGIN en API
# En services/api/.env:
APP_ORIGIN=http://localhost:3000
```

### Error: "Token not saved"
```bash
# Verificar localStorage en DevTools
# Application → Local Storage → http://localhost:3000
# Debe existir: healthos_token
```

## Estado Actual

### ✅ Completado
- [x] API client con auth
- [x] Token storage
- [x] Login page
- [x] Protected routes
- [x] Auto redirect en 401
- [x] Loading states
- [x] Error handling

### 🔄 Siguiente Iteración (F2)
- [ ] Onboarding wizard (5 pasos)
- [ ] Submit a POST /assessment
- [ ] Track onboarding_completed
- [ ] Redirect a /app/today

## Notas Técnicas

### Por qué localStorage + memoria?
- **localStorage**: Persiste entre recargas
- **Memoria**: Evita leer localStorage en cada request
- **Trade-off**: No es 100% seguro (XSS), pero es MVP aceptable

### Por qué fire-and-forget en trackEvent?
- Tracking nunca debe bloquear UX
- Si falla, solo se pierde métrica (no funcionalidad)
- Retry automático no vale la pena para eventos

### Por qué redirect en cliente?
- Next.js App Router usa client-side navigation
- Más rápido que server-side redirect
- Mantiene estado de React

---

## ✅ Iteración F1 Complete

**Auth + route protection funcionando**. Listo para Iteración F2: Onboarding wizard.
