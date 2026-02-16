# 🔬 Protocolo de Ejecución QA - Fase Experimental

**Duración total**: 48 horas (2 días)  
**Método**: Observación pasiva sin intervención

---

## ⏱️ Timeline Completo

```
Día 0 (Hoy):
  00:00 - Setup inicial
  01:00 - Verificación de entorno
  02:00 - Inicio de observación
  
Día 1 (24h después):
  02:00 - Checkpoint intermedio (solo mirar, no analizar)
  
Día 2 (48h después):
  02:00 - Fin de observación
  02:30 - Análisis SQL
  04:30 - Interpretación de resultados
  05:00 - Decisión: PASS/FAIL
```

---

## 📋 FASE 1: Setup Inicial (1-2 horas)

### Paso 1.1: Backup Completo

```bash
# Backup de base de datos
pg_dump healthos_dev > backup_pre_qa_$(date +%Y%m%d_%H%M%S).sql

# Backup de configuración
cp .env .env.backup_qa
cp .env.local .env.local.backup_qa
```

**✅ Verificación**: Archivo de backup existe y tiene tamaño > 0

---

### Paso 1.2: Ejecutar Setup SQL

```bash
# Conectar a DB
psql healthos_dev

# Ejecutar script de setup
\i .system/QA_SETUP_ENVIRONMENT.sql

# Verificar output
# Debe mostrar:
# ✅ Usuarios QA creados: 3
# ✅ Historial limpio: 0
# ✅ Notificaciones OFF
# ✅ Cron jobs pausados
```

**✅ Verificación**: Checklist final muestra todo en "✅ OK"

---

### Paso 1.3: Desactivar Servicios Externos

**Backend (NestJS)**:
```typescript
// services/api/src/app.module.ts
// Comentar temporalmente:

// @Module({
//   imports: [
//     ScheduleModule.forRoot(),  // ← DESACTIVAR
//     NotificationModule,        // ← DESACTIVAR
//     EmailModule,               // ← DESACTIVAR
//   ]
// })
```

**Verificar en logs**:
```bash
# Reiniciar API
npm run dev

# Buscar en logs:
# NO debe aparecer: "Cron job initialized"
# NO debe aparecer: "Email service ready"
# NO debe aparecer: "Notification hub started"
```

**✅ Verificación**: Logs NO mencionan servicios de notificación

---

### Paso 1.4: Crear Tokens de Acceso

```sql
-- Ejecutar en psql
SELECT 
    email,
    id as user_id
FROM "User"
WHERE email LIKE 'qa_%@healthos.test';

-- Copiar los IDs
-- Generar tokens JWT manualmente o vía endpoint /auth
```

**Guardar en archivo**:
```
# qa_tokens.txt
qa_curioso:   Bearer eyJhbGc...
qa_adherente: Bearer eyJhbGc...
qa_friccion:  Bearer eyJhbGc...
```

**✅ Verificación**: 3 tokens válidos guardados

---

### Paso 1.5: Snapshot de Estado Inicial

```sql
-- Ejecutar queries de snapshot
SELECT * FROM "QA_Snapshot" ORDER BY snapshot_date DESC LIMIT 10;

-- Debe mostrar:
-- User: 3 QA users
-- DayLog: 0 registros para QA users
-- BehavioralEvent: 0 eventos para QA users
```

**✅ Verificación**: Snapshot guardado con counts = 0

---

## 🧪 FASE 2: Simulación de Perfiles (24-48h)

### ⚠️ REGLAS CRÍTICAS

1. **NO toques la base de datos directamente**
2. **NO envíes emails/notificaciones manuales**
3. **NO refresques páginas constantemente**
4. **NO "ayudes" al sistema**
5. **Actúa como usuario real, no como desarrollador**

---

### Perfil A: QA Curioso (Explorador Pasivo)

**Objetivo**: Simular usuario que explora pero no se compromete.

#### Día 0 (Hora 0):
```
1. Login con token de qa_curioso
2. Navegar a /es/community
3. Leer 2-3 posts (scroll, no click)
4. Navegar a /es/community/products
5. Mirar 1 producto (no comprar)
6. Cerrar navegador
7. NO registrar ninguna acción
```

**Tiempo en app**: 5-8 minutos  
**Acciones**: 0

#### Día 3 (Hora 72):
```
1. Login con token de qa_curioso
2. Navegar a /es/app/today
3. Leer system message
4. Mirar acciones disponibles
5. NO hacer nada
6. Cerrar navegador
```

**Tiempo en app**: 2-3 minutos  
**Acciones**: 0

#### Día 7 (Hora 168):
```
1. Login con token de qa_curioso
2. Navegar a /es/app/today
3. Registrar 1 acción (cualquiera)
4. NO completar check
5. Cerrar navegador
```

**Tiempo en app**: 3-4 minutos  
**Acciones**: 1

**✅ Esperado**:
- `spontaneous_return` registrado en día 3 y 7
- `passive_orientation` en día 0 y 3
- `daily_log` solo en día 7
- NO reentry offers
- NO drift detection

---

### Perfil B: QA Adherente (Sigue Protocolo)

**Objetivo**: Simular usuario comprometido que luego se ausenta.

#### Días 1-4 (Horas 0, 24, 48, 72):
```
Cada día:
1. Login con token de qa_adherente
2. Navegar a /es/app/today
3. Registrar TODAS las acciones del día
4. Completar check con "Mejor" o "Igual"
5. Cerrar navegador
```

**Tiempo en app**: 8-12 minutos/día  
**Acciones**: 3-4/día

#### Días 5-10 (Horas 96-240):
```
SILENCIO TOTAL
- NO entrar
- NO registrar
- NO interactuar
```

**Tiempo en app**: 0  
**Acciones**: 0

#### Día 11 (Hora 264):
```
1. Login con token de qa_adherente
2. Navegar a /es/app/today
3. Mirar qué hay
4. NO registrar nada
5. Cerrar navegador
```

**Tiempo en app**: 2-3 minutos  
**Acciones**: 0

**✅ Esperado**:
- `daily_log` días 1-4
- `protocol_silence` después de día 4
- `spontaneous_return` en día 11
- uiMode = OBSERVATION en día 11
- NO reentry offers (no hay drift)
- protocolStatus = PAUSED o ENDED

---

### Perfil C: QA Fricción (Reporta Peor)

**Objetivo**: Simular usuario con experiencia negativa → drift.

#### Día 1 (Hora 0):
```
1. Login con token de qa_friccion
2. Navegar a /es/app/today
3. Registrar 1 acción
4. Completar check: "Mejor"
5. Cerrar navegador
```

**Tiempo en app**: 5-7 minutos  
**Acciones**: 1

#### Día 2 (Hora 24):
```
1. Login con token de qa_friccion
2. Navegar a /es/app/today
3. Registrar 1 acción
4. Completar check: "Peor"
5. Cerrar navegador
```

**Tiempo en app**: 5-7 minutos  
**Acciones**: 1

#### Día 3 (Hora 48):
```
1. Login con token de qa_friccion
2. Navegar a /es/app/today
3. Registrar 1 acción
4. Completar check: "Peor"
5. Cerrar navegador
```

**Tiempo en app**: 5-7 minutos  
**Acciones**: 1

#### Día 4 (Hora 72):
```
1. Login con token de qa_friccion
2. Navegar a /es/app/today
3. Registrar 1 acción
4. Completar check: "Peor"
5. ESPERAR: ¿Aparece ReentryOfferCard?
6. SI aparece:
   - Leer mensaje (¿es neutral?)
   - Click "Declinar"
7. Cerrar navegador
```

**Tiempo en app**: 6-8 minutos  
**Acciones**: 1

**✅ Esperado**:
- `daily_log` días 1-4
- `drift_detected` después de día 4
- `ReentryOfferCard` visible en día 4
- `reentry_decline` registrado
- Mensaje es neutral (no alarmista)
- Botón "Declinar" visible y funcional

---

## 🚫 Checkpoint Intermedio (Día 1, Hora 24)

### Qué PUEDES hacer:
- Verificar que el servidor sigue corriendo
- Ver logs de errores (si hay crashes)
- Confirmar que DB está accesible

### Qué NO PUEDES hacer:
- ❌ Ejecutar queries de análisis
- ❌ Mirar tablas de datos
- ❌ "Corregir" comportamientos
- ❌ Enviar notificaciones manuales
- ❌ Modificar estados en DB

**Solo verificar que el sistema está vivo. Nada más.**

---

## 📊 FASE 3: Análisis (Día 2, Hora 48)

### Paso 3.1: Ejecutar Queries SQL (30 min)

```bash
# Conectar a DB
psql healthos_dev

# Ejecutar queries de análisis
\i .system/QA_INSTRUMENTATION_QUERIES.sql

# Exportar resultados
\o qa_results.txt
-- Ejecutar cada query manualmente
\o
```

**Guardar outputs** en archivo de texto.

---

### Paso 3.2: Revisar Métricas Clave (1h)

Abrir `QA_INTERPRETATION_GUIDE.md` y comparar:

#### Query 1: Event Distribution
```
✅ daily_log > 0
✅ spontaneous_return > 0
✅ reentry_decline > 0 (al menos 1 de qa_friccion)
```

#### Query 2: SER Ratio
```
✅ avg_ser_ratio > 70%
✅ median_ser_ratio > 80%
```

#### Query 3: Drift Detection
```
✅ qa_friccion tiene drift_detected = TRUE en día 4
✅ qa_curioso NO tiene drift
✅ qa_adherente NO tiene drift
```

#### Query 4: Reentry Offers
```
✅ qa_friccion tiene 1 offer
✅ qa_friccion declinó
✅ NO hay re-offers inmediatas
```

---

### Paso 3.3: Validación UI (30 min)

Revisar screenshots/videos de las sesiones:

#### ReentryOfferCard (qa_friccion, día 4):
- [ ] Mensaje es neutral ("Recalibración disponible (opcional)")
- [ ] Color es amber/warning (no red/error)
- [ ] Botón "Declinar" visible
- [ ] Botón "Aceptar" NO es más prominente
- [ ] Usuario puede cerrar sin elegir

#### TodayView (qa_adherente, día 11):
- [ ] uiMode = OBSERVATION
- [ ] NO hay mensaje tipo "¡Vuelve!"
- [ ] NO hay badge de "racha perdida"
- [ ] System message es declarativo

#### TodayView (qa_curioso, día 7):
- [ ] NO hay presión por no haber actuado antes
- [ ] Registro de acción es neutral
- [ ] NO hay gamificación visible

---

### Paso 3.4: Decisión Final (30 min)

#### SI TODOS LOS CRITERIOS PASAN:
```
✅ INSTRUMENTO VÁLIDO
→ Proceder a Cohort Analytics Panel
→ Documentar hallazgos
→ Reactivar servicios normales
```

#### SI ALGÚN CRITERIO FALLA:
```
❌ INSTRUMENTO SESGADO
→ Identificar causa específica
→ Corregir código/copy
→ Revertir DB a snapshot
→ Repetir QA desde inicio
```

---

## 🔄 Revertir Después del QA

### Si QA pasó (limpiar usuarios de prueba):
```sql
-- Borrar usuarios QA
DELETE FROM "User" WHERE email LIKE 'qa_%@healthos.test';

-- Reactivar servicios
UPDATE "SystemConfig" SET value = 'true' WHERE key LIKE '%notification%';
UPDATE "ScheduledTask" SET enabled = true;
UPDATE "WebhookConfig" SET active = true;
```

### Si QA falló (restaurar todo):
```bash
# Restaurar DB completa
psql healthos_dev < backup_pre_qa_YYYYMMDD_HHMMSS.sql

# Restaurar configuración
cp .env.backup_qa .env
cp .env.local.backup_qa .env.local
```

---

## 📝 Documentar Resultados

Crear archivo `QA_RESULTS_YYYYMMDD.md`:

```markdown
# QA Results - YYYY-MM-DD

## Métricas
- SER Ratio: XX%
- Decline Rate: XX%
- Drift Detection: PASS/FAIL
- Reentry Offers: X total

## Hallazgos
- [Listar observaciones]

## Decisión
- [ ] PASS → Proceder
- [ ] FAIL → Corregir y repetir

## Acciones Correctivas (si aplica)
- [Listar cambios necesarios]
```

---

## ⚠️ Recordatorios Finales

1. **NO analices en tiempo real** → Espera 48h completas
2. **NO "ayudes" al sistema** → Deja que funcione solo
3. **El silencio es válido** → No es un bug
4. **Usuarios que se van = éxito** → No es retención
5. **Decline > 0 es bueno** → Indica libertad real

---

**Fecha de creación**: 2026-02-16  
**Duración total**: 48 horas  
**Próxima revisión**: Después de ejecutar
