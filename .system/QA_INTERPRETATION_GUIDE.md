# 🔬 Guía de Interpretación de Resultados - QA Experimental

**Objetivo**: Entender qué significa cada métrica y cómo detectar sesgos ocultos.

---

## 📊 Tabla de Interpretación de Fallos

### 1. SER (Spontaneous Event Recording) < 70%

**Qué significa**:
- Más del 30% de eventos son "triggered" (provocados por el sistema)
- La UI está influyendo activamente en el comportamiento

**Causas comunes**:
- Emails de recordatorio demasiado frecuentes
- Notificaciones push activas
- Mensajes tipo "¡Registra hoy!"
- Badges de racha visible

**Cómo confirmar**:
```sql
-- Ver qué está triggereando eventos
SELECT 
    trigger_source,
    COUNT(*) as events,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM "DayLog"
WHERE trigger_source IS NOT NULL
GROUP BY trigger_source
ORDER BY events DESC;
```

**Acción correctiva**:
- Desactivar notificaciones automáticas
- Eliminar CTAs de "recordatorio"
- Hacer UI más pasiva

---

### 2. Decline Rate < 20%

**Qué significa**:
- Menos del 20% de usuarios rechazan la oferta de recalibración
- La oferta es demasiado atractiva/coercitiva

**Causas comunes**:
- Copy tipo "¡Necesitas recalibrar!"
- Color rojo/urgente en el card
- No hay botón de "Declinar" visible
- Declinar tiene consecuencias negativas

**Cómo confirmar**:
```sql
-- Ver ratio de aceptación vs rechazo
SELECT 
    metadata->>'decision' as decision,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM "BehavioralEvent"
WHERE type = 'reentry_decision'
GROUP BY decision;
```

**Acción correctiva**:
- Cambiar copy a "Recalibración disponible (opcional)"
- Usar color neutral (amber, no red)
- Hacer botón "Declinar" igual de visible que "Aceptar"
- Permitir cerrar sin elegir

---

### 3. Muchos Reentry Offers (>3 en 14 días)

**Qué significa**:
- El algoritmo de drift detection es demasiado sensible
- Se ofrece recalibración repetidamente

**Causas comunes**:
- Umbral de drift muy bajo (ej: 2 "peor" en vez de 3)
- No hay cooldown después de declinar
- Se re-ofrece cada día tras rechazo

**Cómo confirmar**:
```sql
-- Ver usuarios con múltiples ofertas
SELECT 
    user_id,
    COUNT(*) as total_offers,
    MIN(created_at) as first_offer,
    MAX(created_at) as last_offer,
    EXTRACT(DAY FROM MAX(created_at) - MIN(created_at)) as days_span
FROM "BehavioralEvent"
WHERE type = 'reentry_decision'
GROUP BY user_id
HAVING COUNT(*) > 3 AND EXTRACT(DAY FROM MAX(created_at) - MIN(created_at)) < 14
ORDER BY total_offers DESC;
```

**Acción correctiva**:
- Aumentar umbral de drift (3 → 4 "peor" consecutivos)
- Añadir cooldown de 7 días después de declinar
- No re-ofrecer si ya declinó 2 veces

---

### 4. Cero Reentry Offers

**Qué significa**:
- El algoritmo es demasiado conservador
- No detecta drift cuando debería

**Causas comunes**:
- Umbral muy alto (ej: 5 "peor" consecutivos)
- Lógica de detección rota
- Usuarios no completan checks

**Cómo confirmar**:
```sql
-- Ver si hay secuencias de "peor" sin detección
SELECT 
    user_id,
    day,
    check_value,
    LAG(check_value, 1) OVER (PARTITION BY user_id ORDER BY day) as prev_1,
    LAG(check_value, 2) OVER (PARTITION BY user_id ORDER BY day) as prev_2
FROM "DayLog"
WHERE check_value = 'worse'
ORDER BY user_id, day;
```

**Acción correctiva**:
- Reducir umbral (5 → 3 "peor")
- Verificar lógica de detección en código
- Asegurar que checks se registran correctamente

---

### 5. Uso Diario Perfecto (100% adherencia)

**Qué significa**:
- Todos los usuarios registran acciones todos los días
- **Esto es una red flag** → La interfaz es coercitiva

**Por qué es malo**:
- Comportamiento humano real NO es perfecto
- Si todos son "adherentes", la UI está presionando
- Los datos no reflejan espontaneidad

**Cómo confirmar**:
```sql
-- Ver distribución de días activos
WITH user_activity AS (
    SELECT 
        user_id,
        COUNT(DISTINCT DATE(created_at)) as days_active,
        EXTRACT(DAY FROM MAX(created_at) - MIN(created_at)) + 1 as days_enrolled
    FROM "DayLog"
    GROUP BY user_id
)
SELECT 
    CASE 
        WHEN days_active * 1.0 / days_enrolled > 0.9 THEN '90-100% (SOSPECHOSO)'
        WHEN days_active * 1.0 / days_enrolled > 0.7 THEN '70-90%'
        WHEN days_active * 1.0 / days_enrolled > 0.5 THEN '50-70%'
        ELSE '< 50%'
    END as adherence_bucket,
    COUNT(*) as users
FROM user_activity
WHERE days_enrolled >= 7
GROUP BY adherence_bucket
ORDER BY adherence_bucket DESC;
```

**Acción correctiva**:
- Eliminar mensajes de "racha"
- Eliminar badges de "días consecutivos"
- Hacer que saltarse días sea visualmente neutral

---

## 🎯 Patrones Esperados en un Buen Instrumento

### ✅ Distribución Saludable de Eventos

```
daily_log:           60-70%  (mayoría de eventos)
spontaneous_return:  15-20%  (vuelven sin trigger)
passive_orientation: 5-10%   (exploran sin actuar)
reentry_accept:      3-5%    (algunos aceptan)
reentry_decline:     3-5%    (algunos rechazan)
protocol_silence:    5-10%   (se integran y no vuelven)
```

### ✅ Distribución Saludable de Adherencia

```
90-100%: 10-15% (muy adherentes)
70-90%:  20-25% (adherentes)
50-70%:  30-35% (moderados)
< 50%:   30-40% (exploradores/integrados)
```

**Si ves esto** → El instrumento es neutral.

### ✅ Patrones de Sesión Esperados

```
< 1 hora:    5-10%   (re-checks rápidos)
1-6 horas:   10-15%  (mismo día)
6-24 horas:  25-30%  (diario)
1-3 días:    30-35%  (espontáneo)
3-7 días:    15-20%  (retorno tardío)
> 7 días:    5-10%   (reenganche)
```

**Si ves esto** → Comportamiento orgánico.

---

## ⚠️ Errores Comunes del Operador

### 1. Mirar DB en Tiempo Real

**Problema**: Introduces sesgo al "ayudar" al sistema.

**Ejemplo**:
- Ves que usuario no registró → Envías recordatorio manual
- Ves drift → Activas recalibración manualmente
- Ves silencio → "Despiertas" al usuario

**Solución**: NO toques nada durante 24h.

---

### 2. Refrescar Constantemente

**Problema**: Generas tráfico artificial.

**Ejemplo**:
- Recargas `/app/today` cada 5 minutos
- Verificas que el sistema "funciona"
- Creas sesiones falsas

**Solución**: Usa los 3 usuarios QA, no tu cuenta.

---

### 3. Forzar Estados

**Problema**: Rompes la validez experimental.

**Ejemplo**:
- Insertas `DayLog` manualmente en DB
- Cambias `uiMode` directamente
- Modificas `behaviorState` para "probar"

**Solución**: Solo interactúa vía UI como usuario real.

---

### 4. Interpretar Silencio como Fallo

**Problema**: Asumes que "no usar = roto".

**Ejemplo**:
- Usuario no entra en 3 días → "Algo está mal"
- Usuario explora pero no registra → "UI confusa"
- Usuario se va después de completar → "Perdimos usuario"

**Solución**: **El silencio es datos válidos**.

---

## 🔍 Resultado Esperado de un Buen Instrumento

### Lo que DEBERÍAS ver (incómodo pero correcto):

1. **Usuarios dejan de entrar**
   - Algunos completan protocolo y no vuelven
   - Esto es **integración exitosa**, no fallo

2. **Muchos silencios**
   - Días sin registros
   - Semanas sin actividad
   - Esto es **comportamiento real**, no abandono

3. **Pocos registros**
   - No todos los días tienen eventos
   - No todos los usuarios son adherentes
   - Esto es **espontaneidad**, no desengagement

4. **Algunos vuelven sin motivo claro**
   - No hay trigger visible
   - No hay email/notificación
   - Esto es **spontaneous return**, la métrica clave

### Lo que NO deberías ver (red flags):

1. **Uso constante y predecible**
   - Todos entran a la misma hora
   - Todos registran todos los días
   - Esto indica **UI coercitiva**

2. **Cero rechazos de reentry**
   - Todos aceptan recalibración
   - Nadie declina ofertas
   - Esto indica **presión de diseño**

3. **Patrones de bot**
   - Sesiones cada 24h exactas
   - Acciones a la misma hora
   - Esto indica **recordatorios automáticos**

4. **Cero integraciones**
   - Nadie completa y se va
   - Todos siguen "enganchados"
   - Esto indica **gamificación oculta**

---

## 📋 Checklist de Interpretación

Después de ejecutar las queries SQL, pregunta:

### Métricas Cuantitativas
- [ ] SER > 70%? → Si NO: UI influye demasiado
- [ ] Decline rate > 20%? → Si NO: Oferta coercitiva
- [ ] Drift detection accuracy > 95%? → Si NO: Algoritmo roto
- [ ] Usuarios con >3 offers en 14d = 0? → Si NO: Demasiado insistente

### Patrones Cualitativos
- [ ] ¿Hay usuarios que completan y NO vuelven? → Debería haber
- [ ] ¿Hay días sin registros? → Debería haber
- [ ] ¿Hay retornos espontáneos (sin trigger)? → Debería haber
- [ ] ¿Hay usuarios que exploran sin actuar? → Debería haber

### Sesgo del Operador
- [ ] ¿Tocaste la DB durante el test? → NO deberías
- [ ] ¿Enviaste emails/notificaciones manuales? → NO deberías
- [ ] ¿Refrescaste constantemente? → NO deberías
- [ ] ¿Interpretaste silencio como fallo? → NO deberías

---

## 🎬 Protocolo de Análisis (Post-24h)

### Fase 1: Ejecutar Queries (30 min)
1. `QA_INSTRUMENTATION_QUERIES.sql` → Query 1-7
2. Exportar resultados a CSV
3. NO interpretar aún

### Fase 2: Revisar Patrones (1h)
1. Leer distribuciones
2. Identificar outliers
3. Buscar red flags obvias

### Fase 3: Interpretación (2h)
1. Comparar con "Patrones Esperados"
2. Identificar causas de desviaciones
3. Documentar hallazgos

### Fase 4: Decisión (30 min)
- **SI todo pasa** → Proceder a Cohort Analytics
- **SI algo falla** → Corregir sesgos y repetir QA

---

## 🎯 Recordatorio Final

> **"El silencio es señal, no ruido."**

Un instrumento que mide bien NO maximiza engagement.  
Un instrumento que mide bien permite que el usuario **se vaya cuando se integra**.

**Éxito ≠ Retención**  
**Éxito = Validez de medición**

---

**Fecha**: 2026-02-16  
**Autor**: Antigravity AI  
**Propósito**: Evitar interpretaciones erróneas de resultados experimentales
