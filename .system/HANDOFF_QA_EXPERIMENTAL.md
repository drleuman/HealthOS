# 🎯 HANDOFF: Desarrollo → Validación Experimental

**Fecha**: 2026-02-16 00:40 UTC+1  
**Status**: 🔒 **CÓDIGO CONGELADO** → 🔬 **QA EXPERIMENTAL READY**

---

## 📦 Paquete de Entrega

### Documentos Generados (5 archivos)

1. **`QA_INSTRUMENTATION_CHECKLIST.md`** (8/10)
   - Checklist completo de validación
   - 3 perfiles de usuario
   - Criterios de aprobación

2. **`QA_INSTRUMENTATION_QUERIES.sql`** (9/10)
   - 7 queries SQL de análisis
   - Validación de métricas clave
   - Summary health score

3. **`QA_INTERPRETATION_GUIDE.md`** (9/10)
   - Tabla de interpretación de fallos
   - Patrones esperados vs red flags
   - Errores comunes del operador

4. **`QA_SETUP_ENVIRONMENT.sql`** (8/10)
   - Script de preparación de entorno
   - Desactivación de estímulos
   - Creación de usuarios limpios

5. **`QA_EXECUTION_PROTOCOL.md`** (10/10)
   - Timeline completo (48h)
   - Simulación detallada de 3 perfiles
   - Protocolo de análisis post-test

---

## 🎯 Objetivo del QA

**Validar que el sistema mide comportamiento humano real, no artefactos de diseño.**

### Pregunta Central
> ¿El instrumento sesga el comportamiento que intenta medir?

### Criterios de Éxito
- SER (Spontaneous Event Recording) > 70%
- Reentry decline rate > 20%
- Drift detection accuracy > 95%
- Ninguna pantalla usa lenguaje coercitivo

---

## 📋 Checklist Pre-Ejecución

### Antes de empezar el QA:

- [ ] **Backup completo de DB** (`pg_dump`)
- [ ] **Ejecutar `QA_SETUP_ENVIRONMENT.sql`**
- [ ] **Desactivar notificaciones** (en código)
- [ ] **Desactivar cron jobs** (en código)
- [ ] **Desactivar emails automáticos** (en código)
- [ ] **Crear 3 usuarios QA** (qa_curioso, qa_adherente, qa_friccion)
- [ ] **Verificar historial limpio** (0 registros previos)
- [ ] **Generar tokens de acceso** (guardar en archivo)
- [ ] **Snapshot de estado inicial** (en tabla QA_Snapshot)

### Durante el QA (48h):

- [ ] **NO tocar la base de datos**
- [ ] **NO enviar notificaciones manuales**
- [ ] **NO refrescar constantemente**
- [ ] **NO "ayudar" al sistema**
- [ ] **Actuar como usuario real**

### Después del QA:

- [ ] **Ejecutar 7 queries SQL**
- [ ] **Comparar con patrones esperados**
- [ ] **Revisar screenshots de UI**
- [ ] **Documentar hallazgos**
- [ ] **Decisión: PASS/FAIL**

---

## 🧪 Perfiles de Usuario a Simular

### Perfil A: QA Curioso
- **Comportamiento**: Explora, no se compromete
- **Días activos**: 0, 3, 7
- **Acciones**: 0, 0, 1
- **Esperado**: spontaneous_return, passive_orientation

### Perfil B: QA Adherente
- **Comportamiento**: Sigue protocolo, luego silencio
- **Días activos**: 1-4, luego pausa hasta día 11
- **Acciones**: 3-4/día (días 1-4), 0 (día 11)
- **Esperado**: protocol_silence, spontaneous_return, uiMode=OBSERVATION

### Perfil C: QA Fricción
- **Comportamiento**: Reporta "peor" → drift
- **Días activos**: 1-4
- **Checks**: "Mejor", "Peor", "Peor", "Peor"
- **Esperado**: drift_detected, ReentryOfferCard, reentry_decline

---

## 📊 Métricas Clave a Validar

### 1. SER (Spontaneous Event Recording)
```sql
-- Query 2 en QA_INSTRUMENTATION_QUERIES.sql
-- Esperado: > 70%
```

**Qué mide**: % de eventos espontáneos vs triggered  
**Por qué importa**: Si < 70%, la UI está influyendo

### 2. Decline Rate
```sql
-- Query 4 en QA_INSTRUMENTATION_QUERIES.sql
-- Esperado: > 20%
```

**Qué mide**: % de usuarios que rechazan reentry  
**Por qué importa**: Si < 20%, la oferta es coercitiva

### 3. Drift Detection Accuracy
```sql
-- Query 3 en QA_INSTRUMENTATION_QUERIES.sql
-- Esperado: 0 falsos positivos, 0 falsos negativos
```

**Qué mide**: Precisión del algoritmo de detección  
**Por qué importa**: Si falla, genera ofertas incorrectas

### 4. Event Distribution
```sql
-- Query 1 en QA_INSTRUMENTATION_QUERIES.sql
-- Esperado: Los 6 tipos existen
```

**Qué mide**: Diversidad de comportamientos capturados  
**Por qué importa**: Si falta alguno, el sistema no mide completo

---

## 🚦 Criterios de Decisión

### ✅ SI PASA (todos los criterios):
```
→ Instrumento VÁLIDO
→ Proceder a: Cohort Analytics Panel
→ Reactivar servicios normales
→ Documentar hallazgos
```

### ❌ SI FALLA (algún criterio):
```
→ Instrumento SESGADO
→ Identificar causa específica
→ Corregir código/copy
→ Revertir DB a snapshot
→ Repetir QA desde inicio
```

---

## ⚠️ Principios Críticos

### 1. El Silencio es Datos Válidos
**NO interpretes ausencia como fallo.**

Un usuario que completa el protocolo y no vuelve = **integración exitosa**.

### 2. El Operador También Introduce Sesgo
**NO "ayudes" al sistema durante el test.**

Si envías un recordatorio manual, invalidas el SER.

### 3. Éxito ≠ Retención
**El objetivo NO es maximizar engagement.**

El objetivo es **medir comportamiento real sin influenciarlo**.

### 4. Espera 48h Antes de Analizar
**NO mires resultados en tiempo real.**

Analizar constantemente introduce sesgo de observador.

---

## 🎬 Próximos Pasos Inmediatos

### Ahora (Día 0):
1. Leer `QA_EXECUTION_PROTOCOL.md` completo
2. Ejecutar `QA_SETUP_ENVIRONMENT.sql`
3. Verificar que servicios externos están OFF
4. Crear tokens de acceso para 3 usuarios QA
5. Iniciar simulación de perfiles

### Día 1 (24h después):
- Checkpoint: Solo verificar que el servidor está vivo
- NO analizar datos

### Día 2 (48h después):
1. Ejecutar `QA_INSTRUMENTATION_QUERIES.sql`
2. Comparar con `QA_INTERPRETATION_GUIDE.md`
3. Revisar screenshots de UI
4. Documentar hallazgos
5. Decisión: PASS/FAIL

---

## 📁 Estructura de Archivos

```
.system/
├── QA_INSTRUMENTATION_CHECKLIST.md    (Checklist general)
├── QA_INSTRUMENTATION_QUERIES.sql     (7 queries SQL)
├── QA_INTERPRETATION_GUIDE.md         (Cómo interpretar)
├── QA_SETUP_ENVIRONMENT.sql           (Setup inicial)
├── QA_EXECUTION_PROTOCOL.md           (Protocolo 48h)
├── PHASE_CLOSURE_DEVELOPMENT.md       (Cierre de desarrollo)
├── MILESTONE_COMPLETE.md              (Resumen de hito)
└── SMOKE_TEST_community_routes.md     (Tests HTTP)
```

---

## 🔒 Compromisos de No-Código

### Durante QA, NO se permite:
- ❌ Nuevos features
- ❌ Refactors
- ❌ Optimizaciones
- ❌ Fixes "rápidos"
- ❌ Cambios de copy

### Después de QA PASS, SÍ se permite:
- ✅ Cohort Analytics Panel (interno)
- ✅ Documentación científica
- ✅ Exportación de datos

### Después de QA FAIL, SOLO se permite:
- ✅ Correcciones de sesgo identificadas
- ✅ Ajustes de copy a neutral
- ✅ Desactivación de triggers

---

## 📞 Punto de Contacto

**Cuando termines el QA**, trae:
1. Output de las 7 queries SQL
2. Screenshots de las 4 pantallas clave
3. Observaciones cualitativas
4. Decisión preliminar (PASS/FAIL)

**Entonces interpretamos juntos** y decidimos siguiente paso.

---

## ✅ Confirmación de Handoff

- [x] Desarrollo estructural completado
- [x] Código compila sin errores
- [x] Tests de rutas HTTP pasan
- [x] Documentación QA generada
- [x] Scripts SQL preparados
- [x] Protocolo de ejecución documentado
- [x] Criterios de decisión claros
- [ ] **QA experimental ejecutado** ← TU SIGUIENTE PASO
- [ ] **Resultados validados** ← BLOQUEANTE
- [ ] **Decisión tomada** ← BLOQUEANTE

---

**Firmado**: Antigravity AI  
**Fecha**: 2026-02-16 00:40 UTC+1  
**Fase actual**: 🔬 **VALIDACIÓN EXPERIMENTAL**  
**Próxima fase**: 📊 **COHORT ANALYTICS** (si QA pasa)

---

## 🎯 Recordatorio Final

> **"Si el instrumento sesga, los datos mienten."**

No estás construyendo un producto de engagement.  
Estás construyendo un instrumento de medición científica.

**La validez > La retención.**

---

**Buena suerte con el QA. Nos vemos en 48 horas.** 🔬
