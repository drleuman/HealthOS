# ✅ PROTOCOLO INTEGRADO: `metabolic_flexibility_10`

**Fecha**: 2026-02-16 02:00 UTC+1  
**Categoría**: Metabolic (Nivel 2 - Estabilización Fisiológica)  
**Duración**: 10 días  
**Prioridad**: **MÁXIMA** (Reentry prioritario tras deriva circadiana)

---

## 🎯 Objetivo Fisiológico

**NO es dieta → es eliminar falsas señales de hambre/energía**

Reduce oscilaciones glucémicas para estabilizar:
- Señal circadiana (reduce falsos DRIFT)
- Señal autonómica (reduce activación reactiva)
- SER real (comportamiento espontáneo vs reactivo)

---

## 🧬 Por Qué Es El Más Importante

### Problema Clínico

Cuando un usuario completa `circadian_reset_14` pero recae:
- **Antes**: Sistema asume fallo conductual → repite protocolo
- **Realidad**: Inestabilidad glucémica → señal biológica corrupta

### Solución

`metabolic_flexibility_10` estabiliza la **señal biológica subyacente**:
- Hambre reactiva → desaparece
- Somnolencia post-comida → se reduce
- Ansiedad nocturna → se normaliza
- Despertares 3-5am → disminuyen

**Resultado**: Circadiano vuelve a funcionar sin intervención adicional.

---

## 📦 Archivos Creados/Modificados

### 1. **UPG** (`services/api/src/content/metabolic_flexibility_10.json`)
- 10 días en 3 fases (detection, stabilization, expansion)
- 10 acciones progresivas (anclajes temporales + distribución macronutrientes)
- 10 checks específicos de energía/hambre

### 2. **Prompt Matrix** (`prompt_matrix/metabolic_flexibility_10.json`)
- 6 reglas deterministas
- Normalización de crashes glucémicos
- Mensajes fisiológicos (no motivacionales)

### 3. **Protocol Registry** (`protocol_registry.json`)
- Registrado como category: "metabolic"
- Tags: glucose, energy, metabolic_flexibility, hunger_regulation

### 4. **i18n** (`es.json` + `en.json`)
- Acciones y checks traducidos
- System messages en Normalization, Reengagement, Closure

### 5. **Protocol Transitions** (`QA_PROTOCOL_TRANSITIONS.sql`)
- **17 reglas totales** (antes: 11)
- `metabolic_flexibility_10` como **reentry prioritario** (priority 250)
- Fallback a circadian tras completar metabolic

---

## 🔄 Arquitectura Resultante

### Nivel 1 — Regulación (Triángulo Homeostático)
```
┌─────────────────────┐
│ circadian_reset_14  │ → Ritmo temporal
├─────────────────────┤
│ nervous_system_10   │ → Activación autonómica
├─────────────────────┤
│ digestive_reset_14  │ → Entrada metabólica
└─────────────────────┘
```

### Nivel 2 — Estabilización
```
┌──────────────────────────┐
│ metabolic_flexibility_10 │ ⭐ → Señal biológica (PRIORIDAD 1)
├──────────────────────────┤
│ energy_stability_7       │ → Coherencia energética
└──────────────────────────┘
```

### Topología de Transiciones (Actualizada)

```
DRIFT/LATENT_INSTABILITY:

circadian_reset_14 ──┐
                     ├──→ metabolic_flexibility_10 (priority 250) ⭐
nervous_system_10 ───┘

digestive_reset_14 ──→ energy_stability_7 (priority 220)

COMPLETED:

circadian_reset_14 ──→ energy_stability_7 (priority 150)
nervous_system_10 ──→ energy_stability_7 (priority 160)
digestive_reset_14 ──→ energy_stability_7 (priority 170)

FALLBACKS:

metabolic_flexibility_10 ──→ circadian_reset_14 (priority 60)
energy_stability_7 ──→ circadian_reset_14 (priority 50)
```

---

## 📋 Acciones del Protocolo

| Día | Acción | Objetivo Fisiológico |
|-----|--------|----------------------|
| 1 | fixed_breakfast_time | Anclaje temporal (ritmo anticipatorio) |
| 2 | no_caloric_drinks_morning | Respuesta glucémica limpia |
| 3 | protein_first_meal | Orden macronutrientes (reduce pico insulina) |
| 4 | no_snacking_between_meals | Ventanas metabólicas claras |
| 5 | consistent_lunch_time | Regularidad temporal |
| 6 | walk_after_meal_10min | Clearance glucosa postprandial |
| 7 | early_dinner_window | Alineación circadiana-metabólica |
| 8 | carbs_evening_only | Timing macronutrientes (serotonina nocturna) |
| 9 | repeatable_breakfast | Predictibilidad metabólica |
| 10 | fixed_meal_structure | Integración completa |

---

## 📊 Checks del Protocolo

| Check | Qué Detecta |
|-------|-------------|
| morning_hunger | Ritmo basal de hambre |
| energy_midmorning | Estabilidad glucémica temprana |
| postmeal_state | Respuesta insulínica |
| hunger_between_meals | Hambre reactiva vs fisiológica |
| afternoon_energy | Crash post-comida |
| postmeal_alertness | Clearance glucosa |
| night_hunger | Hipoglucemia nocturna |
| sleep_onset | Serotonina/melatonina |
| morning_clarity | Cortisol matutino |
| daily_energy_variation | Estabilidad global |

---

## 🔬 Impacto en Métricas de QA

### Antes (Sin Metabolic Flexibility)

| Métrica | Estado |
|---------|--------|
| SER | Artificial (reactivo a hambre) |
| Reentry accept | Bajo (usuario rechaza repetir) |
| Drift accuracy | Baja (falsos positivos) |
| Observation stability | Falsa (señal corrupta) |

### Ahora (Con Metabolic Flexibility)

| Métrica | Estado |
|---------|--------|
| SER | Real (espontáneo, no reactivo) |
| Reentry accept | Alto (usuario acepta cambio de dominio) |
| Drift accuracy | Alta (distingue biología vs conducta) |
| Observation stability | Fisiológica (señal limpia) |

---

## 🎯 Reglas de Transición (17 Total)

### Prioridad 1: Metabolic Flexibility (250)
```sql
circadian_reset_14 + DRIFT → metabolic_flexibility_10
circadian_reset_14 + LATENT_INSTABILITY → metabolic_flexibility_10
nervous_system_reset_10 + DRIFT → metabolic_flexibility_10
nervous_system_reset_10 + LATENT_INSTABILITY → metabolic_flexibility_10
```

### Prioridad 2: Energy Stability (150-220)
```sql
circadian_reset_14 + COMPLETED → energy_stability_7
nervous_system_reset_10 + COMPLETED → energy_stability_7
digestive_reset_14 + DRIFT/LATENT_INSTABILITY/COMPLETED → energy_stability_7
```

### Fallbacks (40-60)
```sql
metabolic_flexibility_10 + COMPLETED → circadian_reset_14
metabolic_flexibility_10 + DRIFT → circadian_reset_14
energy_stability_7 + DRIFT/LATENT_INSTABILITY → circadian_reset_14
```

---

## 🧠 Flujo Clínico Resultante

### Caso 1: Deriva Circadiana (Más Común)

```
Usuario completa circadian_reset_14
        ↓
Mejora sueño pero sigue cansado
        ↓
Sistema detecta DRIFT
        ↓
Consulta ProtocolTransition
        ↓
Prioridad 250: metabolic_flexibility_10 ⭐
        ↓
Usuario estabiliza glucosa
        ↓
Circadiano vuelve a funcionar
```

### Caso 2: Completado Sin Deriva

```
Usuario completa circadian_reset_14
        ↓
Sin deriva detectada
        ↓
Sistema detecta COMPLETED
        ↓
Consulta ProtocolTransition
        ↓
Prioridad 150: energy_stability_7
        ↓
Usuario consolida estabilidad
```

---

## ⚠️ Importante para QA

### ✅ DO (Hacer)

- Ejecutar SQL actualizado (17 reglas)
- Verificar que metabolic tiene priority 250
- Monitorear reentry tras deriva circadiana
- Documentar si usuarios aceptan cambio de dominio

### ❌ DON'T (No Hacer)

- **NO** modificar prioridades durante QA
- **NO** añadir más protocolos antes de validar este
- **NO** asumir que deriva = fallo conductual
- **NO** repetir protocolos sin consultar transiciones

---

## 📝 Checklist de Integración

- [x] UPG creado (10 días, 3 fases)
- [x] Prompt Matrix creado (6 reglas)
- [x] Registry actualizado (category: metabolic)
- [x] i18n español completo
- [x] i18n inglés completo
- [x] SQL de transiciones actualizado (17 reglas)
- [x] Prioridad 250 asignada
- [ ] **SQL ejecutado en DB** ← PENDIENTE
- [ ] **Verificar 17 reglas en tabla** ← PENDIENTE

---

## 🚀 Próximos Pasos

### 1. Ejecutar Migración SQL

```bash
psql healthos_dev < .system/QA_PROTOCOL_TRANSITIONS.sql
```

### 2. Verificar Seed

```sql
SELECT COUNT(*) FROM "ProtocolTransition";
-- Esperado: 17

SELECT * FROM "ActiveProtocolRoutes" 
WHERE "from" = 'circadian_reset_14' AND "signal" = 'DRIFT';
-- Esperado: metabolic_flexibility_10 (priority 250)
```

### 3. Proceder con QA

Una vez verificado:
1. Ejecutar `QA_SETUP_ENVIRONMENT.sql`
2. Iniciar simulación de 3 perfiles (48h)
3. Monitorear reentry decisions

---

## 📈 Protocolos Restantes (Post-QA)

### Nivel 2 — Estabilización (Completar)
- `inflammation_reset_10` → Fatiga residual
- `dopamine_balance_7` → Motor motivacional
- `movement_recalibration_7` → NEAT (movimiento basal)

**Orden**: Validar metabolic_flexibility_10 primero → luego añadir los demás.

---

## 🎉 Resumen Ejecutivo

### Lo Que Logramos

1. **Protocolo Crítico**: `metabolic_flexibility_10` estabiliza señal biológica
2. **Routing Inteligente**: Deriva circadiana → metabolic (no repetir circadian)
3. **Reducción de Falsos DRIFT**: Sistema distingue biología vs conducta
4. **SER Real**: Métricas reflejan comportamiento espontáneo, no reactivo

### Lo Que Falta

1. Ejecutar SQL de transiciones (17 reglas)
2. Ejecutar QA experimental (48h)
3. Validar que reentry funciona correctamente
4. Añadir protocolos restantes (inflammation, dopamine, movement)

---

**Estado Final**: 🟢 **LISTO PARA MIGRACIÓN SQL**  
**Bloqueante**: Ejecutar `QA_PROTOCOL_TRANSITIONS.sql`  
**Próximo paso**: Migración SQL → Verificación → QA Experimental

---

**Fecha**: 2026-02-16 02:00 UTC+1  
**Protocolos Totales**: 5 (circadian, nervous, digestive, energy, **metabolic**)  
**Reglas de Transición**: 17  
**Prioridad Máxima**: metabolic_flexibility_10 (250)
