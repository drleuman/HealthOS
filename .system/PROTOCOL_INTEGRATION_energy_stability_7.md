# ✅ Protocol Integration: energy_stability_7

**Fecha**: 2026-02-16 01:35 UTC+1  
**Categoría**: Stability (Nivel 2)  
**Duración**: 7 días

---

## 🎯 Objetivo del Protocolo

**Puente entre circadiano ↔ digestivo ↔ sistema nervioso**

Detectar y estabilizar energía utilizable (no sueño ni motivación).

---

## 📦 Archivos Creados/Modificados

### 1. UPG (User Protocol Graph)
**Archivo**: `services/api/src/content/energy_stability_7.json`

- 7 días estructurados en 3 fases:
  - Detection (días 1-2)
  - Stabilization (días 3-5)
  - Integration (días 6-7)
- 7 acciones progresivas
- 7 checks específicos de energía

### 2. Prompt Matrix
**Archivo**: `services/api/src/behavioral/prompt_matrix/energy_stability_7.json`

- 5 reglas deterministas:
  - INACTIVITY_48H (priority 1000)
  - FAIL_2 (priority 900)
  - CRASH_NORMALIZE (priority 800)
  - LOW_MORNING (priority 780)
  - IMPROVEMENT (priority 500)

### 3. Protocol Registry
**Archivo**: `services/api/src/behavioral/protocol_registry.json`

- Registrado como category: "stability"
- Tags: energy, glucose, cortisol, fatigue
- Enabled: true

### 4. i18n - Español
**Archivo**: `apps/web/messages/es.json`

- Protocol.energy_stability_7.title
- Protocol.energy_stability_7.Actions (7 acciones)
- Protocol.energy_stability_7.Checks (7 checks)
- SystemMessages.Normalization.energy_crash
- SystemMessages.Normalization.low_morning_energy
- SystemMessages.Simplification.energy_reduce
- SystemMessages.Reengagement.energy_inactive
- SystemMessages.Closure.energy_stable

### 5. i18n - Inglés
**Archivo**: `apps/web/messages/en.json`

- Traducciones equivalentes en inglés

---

## 🧠 Arquitectura Resultante

### Nivel 1 — Regulación (Triángulo Homeostático)
1. **circadian_reset_14** → Ritmo temporal
2. **nervous_system_reset_10** → Activación autonómica
3. **digestive_reset_14** → Entrada metabólica

### Nivel 2 — Estabilidad (Nuevo)
4. **energy_stability_7** ⭐ → Puente energético

---

## 🔄 Topología de Re-entry

Ahora el sistema puede hacer:

```
circadian_reset_14 → (mejora sueño pero fatiga) → energy_stability_7
digestive_reset_14 → (mejora digestión pero bajones) → energy_stability_7
nervous_system_reset_10 → (menos ansiedad pero agotamiento) → energy_stability_7
```

**Sin esto**: Bucles de recalibración (reentry al mismo protocolo)  
**Con esto**: Topología navegable (reentry a protocolo puente)

---

## 📋 Acciones del Protocolo

| Día | Acción | Objetivo |
|-----|--------|----------|
| 1 | eat_within_60min | Ventana temporal de primera comida |
| 2 | protein_breakfast | Estabilidad glucosa-cortisol |
| 3 | no_sugar_isolated | Evitar picos |
| 4 | water_before_caffeine | Hidratación vs estimulación |
| 5 | eat_before_hunger | Prevenir hipoglucemia |
| 6 | steady_meal_timing | Regularidad temporal |
| 7 | repeat_best_day_pattern | Integración |

---

## 📊 Checks del Protocolo

| Check | Qué Mide |
|-------|----------|
| morning_energy | Energía al despertar |
| midday_crash | Bajón al mediodía |
| energy_stability | Estabilidad durante la mañana |
| afternoon_energy | Energía por la tarde |
| focus_clarity | Claridad mental |
| post_activity_energy | Energía tras actividad |
| overall_energy | Energía general del día |

---

## 🎯 Por Qué Es Crítico para el QA

### Problema Sin Este Protocolo

Durante el QA experimental:
- Sistema detecta deriva en usuario
- **NO tiene a dónde reencaminar**
- Resultado: reentries repetidos al mismo protocolo
- **Invalida la métrica clínica**

### Solución Con Este Protocolo

- Sistema detecta deriva
- **Tiene protocolo puente disponible**
- Resultado: reentry a energy_stability_7
- **Métrica clínica válida**

---

## ✅ Verificación de Integración

### Checklist de Archivos

- [x] UPG creado (`energy_stability_7.json`)
- [x] Prompt Matrix creado (`energy_stability_7.json`)
- [x] Protocol Registry actualizado
- [x] i18n español completo
- [x] i18n inglés completo

### Próximos Pasos

1. **Reiniciar servidor de desarrollo** (para cargar nuevo protocolo)
2. **Verificar compilación** (sin errores)
3. **Ejecutar QA_SETUP_ENVIRONMENT.sql** (ahora sí)
4. **Iniciar QA experimental** (con topología completa)

---

## 🚫 Protocolos NO Añadidos (Intencionalmente)

Evitados por ahora:
- ❌ Ejercicio
- ❌ Productividad
- ❌ Mindset
- ❌ Suplementos
- ❌ Biohacking avanzado
- ❌ Ayunos prolongados
- ❌ Dopamina detox

**Razón**: Todos dependen de estabilidad previa. Añadirlos ahora rompería la validez del instrumento.

---

## 📈 Siguientes Protocolos (Futuro)

### Nivel 2 — Estabilidad (Completar)
5. **cognitive_load_7** → Fatiga mental vs fisiológica
6. **sensory_reset_5** → Sobreestimulación basal

### Nivel 3 — Integración
7. **activity_reintegration_10** → Readaptación del movimiento

**Orden crítico**: NO añadir hasta validar que energy_stability_7 funciona en reentry.

---

## 🔬 Impacto en QA Experimental

### Antes
- 3 protocolos
- Bucles de recalibración
- Métricas clínicas inválidas

### Ahora
- 4 protocolos
- Topología navegable
- Métricas clínicas válidas
- **Mínimo necesario para piloto real**

---

**Estado**: ✅ **INTEGRADO Y LISTO**  
**Próximo paso**: Reiniciar dev server y proceder con QA
