# 🔍 Pre-Flight Technical Checklist
**Objetivo**: Validar que el entorno NO está contaminado por infraestructura automática.

**Duración**: 5-10 minutos  
**Criticidad**: 🔴 BLOQUEANTE (si falla, el QA es inválido)

---

## ⚠️ Principio Fundamental

> **El experimento mide comportamiento humano en ausencia de estímulo.**

Cualquier automatismo = investigador hablando al sujeto = datos inválidos.

---

## 1️⃣ Verificar CORS en Producción

### Problema
Si hay fallos intermitentes de OPTIONS, el usuario parecerá "no volver" cuando en realidad es un error de red.

### Test Manual

1. Abrir navegador (Chrome/Firefox, NO Postman)
2. Navegar a: `https://healthos-ten.vercel.app/es/app/today`
3. Abrir DevTools → Network tab
4. Buscar request a `/user/today`

### Criterios de Éxito

| Campo | Valor Esperado | Qué Verificar |
|-------|----------------|---------------|
| `status` | 200 | Request exitosa |
| `preflight OPTIONS` | 204 o 200 | CORS configurado |
| `access-control-allow-origin` | `https://healthos-ten.vercel.app` | Dominio exacto (no `*`) |
| `access-control-allow-credentials` | `true` | Cookies permitidas |

### ❌ Red Flags
- `status: 0` → CORS bloqueando
- `preflight: failed` → OPTIONS no configurado
- `allow-origin: *` → Inseguro, cookies no funcionan
- `credentials: false` → Auth no funciona

### Cómo Verificar en DevTools

```
Network tab → Click en request /user/today → Headers tab

Response Headers:
✅ access-control-allow-origin: https://healthos-ten.vercel.app
✅ access-control-allow-credentials: true
✅ access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
```

### Si Falla
```typescript
// services/api/src/main.ts
app.enableCors({
  origin: 'https://healthos-ten.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

## 2️⃣ Verificar Polling Silencioso

### Problema
Dashboards que hacen polling rompen SER sin querer. La app "recuerda" al usuario que existe.

### Test Manual

1. Abrir navegador
2. Navegar a: `https://healthos-ten.vercel.app/es/app/today`
3. DevTools → Network → Filtro: `Fetch/XHR`
4. **Dejar la página abierta 60 segundos SIN TOCAR NADA**
5. Observar si aparecen requests automáticas

### Criterios de Éxito

```
✅ 0 requests automáticas después de carga inicial
✅ Solo requests cuando usuario hace click/navega
```

### ❌ Red Flags

```
❌ Requests cada 5s, 10s, 30s → Polling activo
❌ /user/today cada X segundos → Auto-refresh
❌ /notifications/check → Polling de notificaciones
❌ WebSocket connections → Real-time updates
```

### Componentes a Revisar

```typescript
// Buscar en código:
grep -r "setInterval" apps/web/
grep -r "setTimeout" apps/web/
grep -r "useEffect.*\[\]" apps/web/  // Sin deps = loop infinito
grep -r "polling" apps/web/
grep -r "refetch" apps/web/
```

### Si Falla
- Eliminar `setInterval` de componentes
- Desactivar auto-refetch en queries
- Remover WebSocket connections

---

## 3️⃣ Verificar Timezone del Servidor

### Problema
Si el servidor está en UTC y la lógica espera Europe/Madrid, los cálculos de inactividad/drift quedan sesgados.

### Test en Servidor (Plesk)

```bash
# SSH al servidor
ssh user@your-server.com

# Verificar timezone
date
# Esperado: "... CET" o "... CEST"

# Verificar configuración
timedatectl
# Esperado: Time zone: Europe/Madrid (CET, +0100)
```

### Test en Código (API)

```bash
# En desarrollo local
curl http://localhost:3001/health

# Debe retornar:
{
  "status": "ok",
  "timestamp": "2026-02-16T00:45:00+01:00",  # ← +01:00 = CET
  "timezone": "Europe/Madrid"
}
```

### Criterios de Éxito

```
✅ Servidor: Europe/Madrid (CET/CEST)
✅ API timestamps: +01:00 (invierno) o +02:00 (verano)
✅ DB timestamps: TIMESTAMP WITH TIME ZONE
```

### ❌ Red Flags

```
❌ Servidor en UTC
❌ Timestamps sin timezone (+00:00)
❌ DB usa TIMESTAMP (sin timezone)
```

### Si Falla

```bash
# Configurar timezone en servidor
sudo timedatectl set-timezone Europe/Madrid

# Reiniciar servicios
sudo systemctl restart postgresql
sudo systemctl restart nginx
pm2 restart all
```

---

## 4️⃣ Verificar Cron Jobs Activos

### Problema
Un cron olvidado puede enviar emails, crear notificaciones, o recalcular estados automáticamente.

### Test en Servidor

```bash
# Ver procesos Node activos
ps aux | grep node

# Buscar:
❌ scheduler
❌ worker
❌ queue
❌ cron
❌ retry
```

### Test en Código

```bash
# Buscar schedulers en código
grep -r "@Cron" services/api/src/
grep -r "@Interval" services/api/src/
grep -r "schedule.scheduleJob" services/api/src/
grep -r "node-cron" services/api/src/
```

### Test en DB

```sql
-- Ver tareas programadas activas
SELECT * FROM "ScheduledTask" WHERE enabled = true;

-- Esperado: 0 rows (todas desactivadas para QA)
```

### Criterios de Éxito

```
✅ 0 procesos con "scheduler" en nombre
✅ 0 decoradores @Cron en código activo
✅ 0 ScheduledTask con enabled=true
```

### Si Falla

```typescript
// services/api/src/app.module.ts
// Comentar temporalmente:
// ScheduleModule.forRoot(),
```

---

## 5️⃣ Test de Usuario Fantasma (Crítico)

### Problema
Detectar actores automáticos ocultos que modifican estado sin intervención humana.

### Procedimiento

#### Paso 1: Crear Usuario Probe
```sql
INSERT INTO "User" (id, email, name, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'qa_probe@healthos.test',
    'QA Probe',
    NOW(),
    NOW()
);
```

#### Paso 2: Snapshot Inicial
```sql
-- Guardar estado inicial
CREATE TEMP TABLE probe_snapshot AS
SELECT 
    (SELECT COUNT(*) FROM "DayLog" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as logs,
    (SELECT COUNT(*) FROM "BehavioralEvent" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as events,
    (SELECT COUNT(*) FROM "Notification" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as notifications,
    (SELECT COUNT(*) FROM "UserSession" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as sessions,
    NOW() as snapshot_time;

SELECT * FROM probe_snapshot;
-- Esperado: logs=0, events=0, notifications=0, sessions=0
```

#### Paso 3: Acción Única
1. Login con qa_probe
2. Navegar a `/es/app/today`
3. **NO hacer nada más**
4. Cerrar navegador

#### Paso 4: Esperar 10 Minutos
**NO tocar nada. Solo esperar.**

#### Paso 5: Verificar Cambios
```sql
-- Comparar con snapshot
SELECT 
    (SELECT COUNT(*) FROM "DayLog" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as logs_now,
    (SELECT COUNT(*) FROM "BehavioralEvent" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as events_now,
    (SELECT COUNT(*) FROM "Notification" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as notifications_now,
    (SELECT COUNT(*) FROM "UserSession" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as sessions_now,
    NOW() as check_time;

-- Comparar con probe_snapshot
SELECT 
    ps.logs as before_logs,
    (SELECT COUNT(*) FROM "DayLog" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as after_logs,
    ps.events as before_events,
    (SELECT COUNT(*) FROM "BehavioralEvent" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as after_events,
    ps.notifications as before_notifications,
    (SELECT COUNT(*) FROM "Notification" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as after_notifications
FROM probe_snapshot ps;
```

### Criterios de Éxito

```
✅ logs: 0 → 0 (sin cambios)
✅ events: 0 → 0 (sin cambios)
✅ notifications: 0 → 0 (sin cambios)
✅ sessions: 0 → 1 (solo la sesión manual)
```

### ❌ Red Flags

```
❌ logs aumentó → Algo está registrando automáticamente
❌ events aumentó → Actor automático creando eventos
❌ notifications aumentó → Sistema enviando notificaciones
❌ sessions > 1 → Polling o auto-refresh
```

### Si Falla: Buscar Culpables

```sql
-- Ver qué se creó automáticamente
SELECT 
    table_name,
    created_at,
    metadata
FROM (
    SELECT 'DayLog' as table_name, created_at, NULL as metadata FROM "DayLog" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')
    UNION ALL
    SELECT 'BehavioralEvent', created_at, metadata::text FROM "BehavioralEvent" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')
    UNION ALL
    SELECT 'Notification', created_at, NULL FROM "Notification" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')
) combined
WHERE created_at > (SELECT snapshot_time FROM probe_snapshot)
ORDER BY created_at;
```

---

## 📋 Checklist de Aprobación

Antes de ejecutar `QA_SETUP_ENVIRONMENT.sql`:

- [ ] **CORS verificado**: 200, credentials=true, origin correcto
- [ ] **Polling verificado**: 0 requests automáticas en 60s
- [ ] **Timezone verificado**: Europe/Madrid en servidor y API
- [ ] **Cron jobs verificados**: 0 procesos activos, 0 tasks enabled
- [ ] **Usuario fantasma verificado**: 0 cambios en 10 minutos

### Si TODOS pasan:
```
✅ ENTORNO LIMPIO
→ Proceder con QA_SETUP_ENVIRONMENT.sql
```

### Si ALGUNO falla:
```
❌ ENTORNO CONTAMINADO
→ Corregir infraestructura
→ Repetir pre-flight
→ NO ejecutar QA hasta que pase
```

---

## 🎯 Por Qué Esto Importa

Tu experimento NO mide software.  
Tu experimento mide: **comportamiento humano en ausencia de estímulo**.

Cualquier automatismo = meter un investigador en la habitación hablando al sujeto.

### Ejemplos de Contaminación Real

| Automatismo | Efecto en Métrica | Resultado |
|-------------|-------------------|-----------|
| Email cada 24h | SER < 50% | Todos los retornos son triggered |
| Polling cada 10s | sessions infladas | Parece que usuario está activo |
| Cron recalcula estado | events automáticos | Drift falso positivo |
| Timezone UTC | inactivity mal calculada | Reentry ofertas incorrectas |
| CORS falla | usuarios "no vuelven" | SER bajo por error de red |

---

## 📝 Reporte de Pre-Flight

Después de ejecutar los 5 tests, documentar:

```markdown
# Pre-Flight Results - YYYY-MM-DD

## 1. CORS
- Status: PASS/FAIL
- Details: [...]

## 2. Polling
- Status: PASS/FAIL
- Requests detectadas: X

## 3. Timezone
- Status: PASS/FAIL
- Servidor: [timezone]
- API: [timezone]

## 4. Cron Jobs
- Status: PASS/FAIL
- Procesos activos: X

## 5. Usuario Fantasma
- Status: PASS/FAIL
- Cambios detectados: [...]

## Decisión
- [ ] PASS → Proceder con QA
- [ ] FAIL → Corregir y repetir
```

---

**Fecha**: 2026-02-16  
**Criticidad**: 🔴 BLOQUEANTE  
**Tiempo estimado**: 5-10 minutos  
**Próximo paso**: Solo si TODOS pasan → `QA_SETUP_ENVIRONMENT.sql`
