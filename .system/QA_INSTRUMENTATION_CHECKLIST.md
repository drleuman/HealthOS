# 🔬 Instrumentation QA Checklist
**Objetivo**: Validar que el sistema mide comportamiento humano real, no artefactos de diseño.

**Duración estimada**: 1-2 días  
**Prioridad**: 🔴 CRÍTICA (antes de cualquier feature nuevo)

---

## 🎯 Principio Fundamental

> **Un instrumento roto genera datos inútiles.**  
> Si el sistema "convence" en lugar de "medir", toda la ciencia se invalida.

---

## 1️⃣ QA de Flujo Humano Real

### Setup
- **NO uses tu cuenta de desarrollo** (sesgo de conocimiento)
- Crea 3 usuarios nuevos con emails distintos
- Usa navegador en modo incógnito para cada perfil
- **Tiempo entre acciones**: Real (no simules 3 días en 3 minutos)

### Perfil A: Curioso (Explorador Pasivo)

**Comportamiento esperado del usuario**:
```
Día 1 (00:00):
  - Entra desde landing
  - Explora /community
  - Lee 1-2 posts
  - NO registra ninguna acción
  - Cierra tab

Día 4 (72h después):
  - Vuelve directo a /app/today
  - Mira qué hay
  - NO hace nada
  - Sale

Día 7:
  - Vuelve
  - Registra 1 acción
```

**✅ Validaciones esperadas**:
- [ ] NO aparece mensaje "Te extrañamos" o similar
- [ ] NO aparece oferta de recalibración
- [ ] `/app/today` muestra modo OBSERVATION
- [ ] Sistema message es declarativo (no coercitivo)
- [ ] Métrica `spontaneous_return` se registra correctamente
- [ ] SER (Spontaneous Event Recording) = TRUE en día 7

**❌ Red flags**:
- Cualquier CTA tipo "¡Continúa tu progreso!"
- Badges de "racha perdida"
- Notificaciones push/email automáticas
- UI que "recuerda" días perdidos

---

### Perfil B: Adherente Interrumpido

**Comportamiento esperado del usuario**:
```
Día 1-4:
  - Registra acciones todos los días
  - Completa checks
  - Engagement alto

Día 5-10:
  - Silencio total (no entra)

Día 11:
  - Vuelve espontáneamente
```

**✅ Validaciones esperadas**:
- [ ] Día 11 muestra modo OBSERVATION (no PROTOCOL)
- [ ] NO hay mensaje de "reenganche"
- [ ] NO se ofrece "retomar donde lo dejaste"
- [ ] Sistema permite registro pasivo sin presión
- [ ] Métrica `passive_orientation` registrada
- [ ] `protocolStatus` = PAUSED o ENDED (no ACTIVE)

**❌ Red flags**:
- "¡Bienvenido de vuelta! Continuemos..."
- Auto-reactivación de protocolo
- Descuentos/incentivos por volver
- Emails de "te echamos de menos"

---

### Perfil C: Fricción Temprana (Drift Detection)

**Comportamiento esperado del usuario**:
```
Día 1:
  - Registra acción
  - Check: "Mejor"

Día 2:
  - Registra acción
  - Check: "Peor"

Día 3:
  - Registra acción
  - Check: "Peor"

Día 4:
  - Registra acción
  - Check: "Peor"
  - (Espera respuesta del sistema)
```

**✅ Validaciones esperadas**:
- [ ] Día 4: Sistema detecta drift (3 "peor" consecutivos)
- [ ] Aparece `ReentryOfferCard` (opcional, no obligatorio)
- [ ] Mensaje es neutral: "Recalibración disponible (opcional)"
- [ ] Usuario puede DECLINAR sin consecuencias
- [ ] Si declina: sistema NO insiste en días siguientes
- [ ] Métrica `deviation.active = true` registrada
- [ ] Métrica `reentry.eligible = true` registrada

**❌ Red flags**:
- Mensaje tipo "¡Necesitas recalibrar ahora!"
- Bloqueo de funcionalidad si no acepta
- Repetir oferta cada día
- Tonos alarmistas ("Tu salud está en riesgo")

---

## 2️⃣ Validación de Métricas (SQL Queries)

### Query 1: Distinguir Eventos Críticos

```sql
-- Verificar que los 6 eventos clave son distinguibles
SELECT 
    event_type,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as first_occurrence,
    MAX(created_at) as last_occurrence
FROM events
WHERE event_type IN (
    'daily_log',              -- Acción registrada
    'spontaneous_return',     -- Vuelve sin trigger
    'passive_orientation',    -- Explora sin actuar
    'reentry_accept',         -- Acepta recalibración
    'reentry_decline',        -- Rechaza recalibración
    'protocol_silence'        -- Integración (no vuelve)
)
GROUP BY event_type
ORDER BY count DESC;
```

**✅ Criterio de éxito**:
- Todos los 6 tipos existen en la tabla
- `daily_log` > 0 (acciones registradas)
- `spontaneous_return` > 0 (retornos sin email/notif)
- `reentry_decline` > 0 (usuarios rechazan oferta)

**❌ Red flag**:
- `reentry_decline` = 0 → Indica que la oferta es coercitiva
- `spontaneous_return` = 0 → Indica que solo vuelven por notificaciones

---

### Query 2: SER (Spontaneous Event Recording) Ratio

```sql
-- Calcular ratio de eventos espontáneos vs triggered
WITH user_events AS (
    SELECT 
        user_id,
        SUM(CASE WHEN trigger_source IS NULL THEN 1 ELSE 0 END) as spontaneous,
        SUM(CASE WHEN trigger_source IS NOT NULL THEN 1 ELSE 0 END) as triggered,
        COUNT(*) as total
    FROM events
    WHERE event_type = 'daily_log'
    GROUP BY user_id
)
SELECT 
    AVG(spontaneous * 1.0 / NULLIF(total, 0)) as avg_ser_ratio,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY spontaneous * 1.0 / total) as median_ser_ratio,
    COUNT(CASE WHEN spontaneous > triggered THEN 1 END) as users_mostly_spontaneous,
    COUNT(*) as total_users
FROM user_events;
```

**✅ Criterio de éxito**:
- `avg_ser_ratio` > 0.7 (70%+ de eventos son espontáneos)
- `median_ser_ratio` > 0.8
- `users_mostly_spontaneous` > 60% del total

**❌ Red flag**:
- `avg_ser_ratio` < 0.5 → Sistema está "empujando" demasiado
- Mayoría de eventos tienen `trigger_source = 'email'` o `'notification'`

---

### Query 3: Drift Detection Accuracy

```sql
-- Verificar que drift se detecta correctamente
SELECT 
    user_id,
    protocol_id,
    day,
    check_value,
    LAG(check_value, 1) OVER (PARTITION BY user_id ORDER BY day) as prev_1,
    LAG(check_value, 2) OVER (PARTITION BY user_id ORDER BY day) as prev_2,
    CASE 
        WHEN check_value = 'worse' 
         AND LAG(check_value, 1) OVER (PARTITION BY user_id ORDER BY day) = 'worse'
         AND LAG(check_value, 2) OVER (PARTITION BY user_id ORDER BY day) = 'worse'
        THEN TRUE 
        ELSE FALSE 
    END as should_trigger_drift
FROM daily_logs
WHERE check_value IS NOT NULL
ORDER BY user_id, day;
```

**✅ Criterio de éxito**:
- Cuando `should_trigger_drift = TRUE`, existe registro en `behavioral_events` con `type = 'drift_detected'`
- NO hay falsos positivos (drift sin 3 "worse" consecutivos)

---

### Query 4: Reentry Offer Behavior

```sql
-- Verificar que reentry no se ofrece repetidamente
SELECT 
    user_id,
    COUNT(*) as times_offered,
    COUNT(CASE WHEN decision = 'DECLINE' THEN 1 END) as times_declined,
    MAX(offered_at) as last_offer,
    MIN(offered_at) as first_offer,
    DATEDIFF(day, MIN(offered_at), MAX(offered_at)) as days_between_offers
FROM reentry_offers
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY times_offered DESC;
```

**✅ Criterio de éxito**:
- Si `times_declined > 0`, entonces `days_between_offers` > 7 (no insiste inmediatamente)
- Ningún usuario tiene `times_offered > 3` en 14 días

**❌ Red flag**:
- Usuario declina y se le vuelve a ofrecer al día siguiente
- Usuarios con 5+ ofertas en 2 semanas

---

## 3️⃣ Validación de Sesgo UI

### Checklist Visual (Manual)

Abre estas 4 pantallas en orden y responde:

#### Pantalla 1: `/app/today` (sin acciones pendientes)
- [ ] ¿Hay algún mensaje tipo "¡Haz algo hoy!"? → ❌ NO debe existir
- [ ] ¿El sistema message es declarativo? → ✅ "Registro disponible cuando lo consideres"
- [ ] ¿Hay badges de "racha" o "días consecutivos"? → ❌ NO debe existir
- [ ] ¿El usuario puede cerrar la app sin sentir culpa? → ✅ SÍ

#### Pantalla 2: `/app/today` (con drift detectado)
- [ ] ¿El `ReentryOfferCard` usa lenguaje neutral? → ✅ "Recalibración disponible (opcional)"
- [ ] ¿Hay botón de "Declinar" visible? → ✅ SÍ, mismo peso visual que "Aceptar"
- [ ] ¿El color es neutro (no rojo/urgente)? → ✅ Amber/warning, no error
- [ ] ¿Se puede ignorar y seguir usando la app? → ✅ SÍ

#### Pantalla 3: `/app/recalibration` (activa)
- [ ] ¿Dice "Fase de ajuste" en lugar de "Recuperación"? → ✅ SÍ
- [ ] ¿Permite pausar/salir sin penalización? → ✅ SÍ
- [ ] ¿Muestra progreso sin gamificación? → ✅ "Día 2/3", no "¡Casi lo logras!"

#### Pantalla 4: `/community/thread/[id]` (gated)
- [ ] ¿El mensaje de gating es informativo? → ✅ "Acceso para miembros"
- [ ] ¿NO dice "¡Únete ahora para desbloquear!"? → ✅ NO dice eso
- [ ] ¿Hay botón "Volver" además de "Entrar"? → ✅ SÍ, ambos visibles

---

## 4️⃣ Test de Neutralidad (Crítico)

### Prueba del "Usuario Escéptico"

Imagina que un usuario escéptico revisa tu app buscando "dark patterns". Lee cada pantalla y pregunta:

**¿Esta UI intenta convencerme de hacer algo?**

Si la respuesta es **"Sí"** en cualquier pantalla → HAY SESGO.

### Ejemplos de sesgo a evitar:

❌ **Gamificación oculta**:
- "¡Llevas 3 días seguidos!" → Crea presión de racha
- "Solo te falta 1 día para completar la semana" → FOMO

❌ **Lenguaje emocional**:
- "Tu cuerpo te lo agradecerá" → Apelación emocional
- "No pierdas tu progreso" → Aversión a pérdida

❌ **Urgencia artificial**:
- "Registra antes de las 23:59" → Deadline arbitrario
- "Última oportunidad de recalibrar" → Falsa escasez

✅ **Lenguaje neutral correcto**:
- "Registro disponible"
- "Recalibración opcional"
- "Estado: Observación"
- "Sistema en modo pasivo"

---

## 5️⃣ Criterios de Aprobación Final

Para considerar el instrumento **VÁLIDO**, deben cumplirse:

### Métricas
- [x] SER ratio > 70%
- [x] Reentry decline rate > 20% (indica que es opcional de verdad)
- [x] Drift detection accuracy > 95%
- [x] NO hay usuarios con >3 reentry offers en 14 días

### UX
- [x] Ninguna pantalla usa lenguaje coercitivo
- [x] Usuario puede ignorar cualquier sugerencia sin consecuencias
- [x] NO hay gamificación visible (rachas, badges, puntos)
- [x] Modo OBSERVATION es realmente pasivo

### Eventos
- [x] Los 6 tipos de eventos son distinguibles en DB
- [x] `spontaneous_return` se registra correctamente
- [x] `protocol_silence` existe (usuarios que se integran y no vuelven)

---

## 📊 Siguiente Paso Después de QA

**SI PASA**: → Cohort Analytics Panel (interno, no público)  
**SI FALLA**: → Corregir sesgos antes de continuar

**NO proceder con**:
- ❌ Marketing
- ❌ Nuevos features públicos
- ❌ Más protocolos
- ❌ Notificaciones push

**SÍ proceder con**:
- ✅ Panel de análisis de cohortes
- ✅ Exportación de datos para análisis
- ✅ Documentación científica del método

---

## 🎯 Recordatorio Final

> **"Si el instrumento sesga, los datos mienten."**

Un usuario que vuelve porque recibió un email NO es un `spontaneous_return`.  
Un usuario que acepta recalibración porque la UI lo presiona NO es un `reentry_accept` válido.

**La validez científica depende de medir comportamiento real, no comportamiento inducido.**

---

**Fecha de creación**: 2026-02-16  
**Status**: 🔴 PENDIENTE DE EJECUCIÓN  
**Prioridad**: CRÍTICA (bloquea cualquier feature nuevo)
