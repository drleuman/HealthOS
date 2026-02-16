# Pre-Flight Execution Guide - Criterios Exactos

**Fecha**: 2026-02-16  
**Criticidad**: 🔴 BLOQUEANTE ABSOLUTO

---

## ⚠️ Principio

**Un solo FAIL invalida todo el QA experimental.**

Razón: Medirías infraestructura, no comportamiento humano.

---

## 1️⃣ CORS en Producción (LA MÁS CRÍTICA)

### Procedimiento

1. Abrir navegador: `https://healthos-ten.vercel.app/es/app/today`
2. Login con credenciales válidas
3. Abrir DevTools (F12)
4. Pestaña **Network**
5. Filtrar por: `today`
6. Seleccionar request: `GET /user/today`
7. Pestaña **Headers** → **Response Headers**

### ✅ PASS: Debe verse EXACTAMENTE

```
access-control-allow-origin: https://healthos-ten.vercel.app
access-control-allow-credentials: true
vary: Origin
```

### ❌ FAIL: Si ves CUALQUIERA de estos

- `access-control-allow-origin: *`
- Más de un dominio en `allow-origin`
- Falta `allow-credentials: true`
- Preflight OPTIONS devuelve 403 o 301
- Aparece `www.` cuando la página no lo usa
- Aparece el dominio de Plesk en lugar de Vercel

### 🚨 Por Qué Es Crítico

Si CORS falla intermitentemente:
- El navegador reintenta silenciosamente
- Parecerá "retorno espontáneo"
- SER ratio queda corrupto
- **TODO EL QA ES INVÁLIDO**

---

## 2️⃣ Timezone del Servidor

### Procedimiento

```bash
# SSH a Plesk
ssh user@your-server.com

# Ejecutar
date
timedatectl | grep "Time zone"
```

### ✅ PASS: Debe devolver

```
Time zone: Europe/Madrid (CET, +0100)
```

O en invierno:
```
Time zone: Europe/Madrid (CEST, +0200)
```

### ❌ FAIL: Si ves

- `UTC`
- `Etc/UTC`
- `Europe/Berlin` (sí, también falla para tu lógica)
- Desfase de 1 hora
- Cualquier timezone que NO sea `Europe/Madrid`

### 🚨 Por Qué Es Crítico

Si timezone está mal:
- Cálculo de inactividad incorrecto
- Drift detection se dispara en momentos incorrectos
- `spontaneous_return` mal clasificado
- **Métricas temporales inválidas**

---

## 3️⃣ Procesos Activos

### Procedimiento

```bash
# SSH a Plesk
ssh user@your-server.com

# Ejecutar
ps aux | grep node
```

### ✅ PASS: Debe verse

Solo el proceso web principal:
```
passenger/node index.js
```

O similar (1 proceso único del servidor API).

### ❌ FAIL: Si ves CUALQUIERA de estos

- `worker.js`
- `scheduler.js`
- `queue.js`
- `bull`
- `agenda`
- `cron`
- `pm2 cluster`
- Más de 1 instancia del server

### 🚨 Por Qué Es Crítico

Si hay 2 instancias:
- Usuario puede recibir doble evaluación
- Rompe histéresis (estado inconsistente)
- Eventos duplicados
- **Lógica conductual rota**

---

## 4️⃣ Usuario Fantasma (LA TRAMPA MÁS IMPORTANTE)

### Procedimiento

#### Paso 1: Crear Usuario
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
SELECT 
    (SELECT COUNT(*) FROM "DayLog" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as daily_log,
    (SELECT COUNT(*) FROM "UserBehaviorState" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as behavior_state,
    (SELECT COUNT(*) FROM "BehavioralEvent" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as events,
    (SELECT COUNT(*) FROM "Notification" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as messages,
    (SELECT COUNT(*) FROM "UserSession" WHERE user_id = (SELECT id FROM "User" WHERE email = 'qa_probe@healthos.test')) as sessions,
    NOW() as snapshot_time;

-- Esperado: Todos en 0
```

#### Paso 3: Acción Única
1. Login con `qa_probe@healthos.test`
2. Cargar `/es/app/today`
3. **NO hacer nada más**
4. Cerrar navegador

#### Paso 4: Esperar 10 Minutos
**NO tocar nada. Solo esperar.**

#### Paso 5: Verificar Cambios
```sql
-- Comparar con snapshot
SELECT 
    u.email,
    (SELECT COUNT(*) FROM "DayLog" WHERE user_id = u.id) as daily_log_now,
    (SELECT COUNT(*) FROM "UserBehaviorState" WHERE user_id = u.id) as behavior_state_now,
    (SELECT COUNT(*) FROM "BehavioralEvent" WHERE user_id = u.id) as events_now,
    (SELECT COUNT(*) FROM "Notification" WHERE user_id = u.id) as messages_now,
    (SELECT COUNT(*) FROM "UserSession" WHERE user_id = u.id) as sessions_now,
    u.updated_at as last_updated
FROM "User" u
WHERE u.email = 'qa_probe@healthos.test';
```

### ✅ PASS: Resultado Esperado

```
daily_log: 0 → 0 (sin cambios)
behavior_state: 0 → 0 (sin cambios)
events: 0 → 0 (sin cambios)
messages: 0 → 0 (sin cambios)
sessions: 0 → 1 (solo la sesión manual)
updated_at: SIN CAMBIOS (timestamp original)
```

### ❌ FAIL: Si ves CUALQUIERA de estos

- `last_seen` cambia automáticamente
- Aparece `daily_log` automático
- Aparece mensaje del sistema
- Aparece `recalculation`
- Aparece `reentry` offer
- Aparece cualquier `update` en tablas relacionadas
- `sessions` > 1 (indica polling)

### 🚨 Por Qué Es Crítico

Si falla:
- Tienes un proceso de "presencia implícita"
- El sistema "habla" al usuario sin que lo veas
- Medirás engagement falso
- **SER ratio completamente inválido**

---

## 📋 Formato de Reporte

Después de ejecutar las 4 verificaciones, reportar SOLO:

```
CORS: PASS/FAIL (+ detalle si fail)
Timezone: PASS/FAIL
Procesos: PASS/FAIL
Ghost user: PASS/FAIL
```

**NO enviar**:
- Logs completos
- Screenshots
- Outputs largos

**Solo el veredicto de cada check.**

---

## 🚦 Criterio de Decisión

### Si TODOS son PASS:
```
✅ ENTORNO LIMPIO
→ Proceder con QA_SETUP_ENVIRONMENT.sql
→ Iniciar experimento de 48h
```

### Si ALGUNO es FAIL:
```
❌ ENTORNO CONTAMINADO
→ Corregir infraestructura
→ Repetir pre-flight completo
→ NO ejecutar QA hasta que TODOS pasen
```

---

## 🎯 Recordatorio Final

Esto decide si los próximos días miden:
- ✅ Psicología humana (comportamiento espontáneo)
- ❌ Bugs de infraestructura (artefactos técnicos)

**Un solo FAIL = Experimento inválido.**

---

**Fecha**: 2026-02-16 00:55 UTC+1  
**Estado**: ⏳ **ESPERANDO EJECUCIÓN MANUAL**  
**Próximo paso**: Usuario ejecuta 4 verificaciones y reporta resultados
