# 🔄 Protocol Transitions Integration Guide

**Fecha**: 2026-02-16 01:45 UTC+1  
**Propósito**: Routing terapéutico declarativo basado en DB

---

## 🎯 Principio Fundamental

> **La lógica clínica vive en la base de datos, no en el código.**

Esto garantiza:
- ✅ Auditabilidad clínica completa
- ✅ Cambios sin deploy
- ✅ Trazabilidad de decisiones
- ✅ Validez experimental preservada

---

## 📦 Archivos Creados/Modificados

### 1. **SQL Script** (`.system/QA_PROTOCOL_TRANSITIONS.sql`)
- Tabla `ProtocolTransition`
- 11 reglas de transición (seed)
- Vista `ReentryDecisionDebug`
- Vista `ActiveProtocolRoutes`
- Función `get_next_protocol()`

### 2. **Prisma Schema** (`services/api/prisma/schema.prisma`)
- Modelo `ProtocolTransition`
- Índice optimizado para lookup

---

## 🗄️ Estructura de la Tabla

```sql
CREATE TABLE "ProtocolTransition" (
    id SERIAL PRIMARY KEY,
    "fromProtocol" VARCHAR(64) NOT NULL,
    "signalType" VARCHAR(64) NOT NULL,
    "nextProtocol" VARCHAR(64) NOT NULL,
    priority INT DEFAULT 100,
    enabled BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📋 Reglas Clínicas (Seed)

### Nivel 1 → Nivel 2 (Regulación → Estabilidad)

| From Protocol | Signal Type | Next Protocol | Priority |
|---------------|-------------|---------------|----------|
| circadian_reset_14 | DRIFT | energy_stability_7 | 200 |
| circadian_reset_14 | LATENT_INSTABILITY | energy_stability_7 | 200 |
| circadian_reset_14 | COMPLETED | energy_stability_7 | 150 |
| nervous_system_reset_10 | DRIFT | energy_stability_7 | 210 |
| nervous_system_reset_10 | LATENT_INSTABILITY | energy_stability_7 | 210 |
| nervous_system_reset_10 | COMPLETED | energy_stability_7 | 160 |
| digestive_reset_14 | DRIFT | energy_stability_7 | 220 |
| digestive_reset_14 | LATENT_INSTABILITY | energy_stability_7 | 220 |
| digestive_reset_14 | COMPLETED | energy_stability_7 | 170 |

### Fallback (No Loops)

| From Protocol | Signal Type | Next Protocol | Priority |
|---------------|-------------|---------------|----------|
| energy_stability_7 | DRIFT | circadian_reset_14 | 50 |
| energy_stability_7 | LATENT_INSTABILITY | circadian_reset_14 | 50 |

---

## 🔌 Integración en Backend

### Paso 1: Generar Cliente Prisma

```bash
cd services/api
npx prisma generate
```

### Paso 2: Ejecutar Migración

```bash
# Opción A: Ejecutar SQL directamente
psql healthos_dev < ../../.system/QA_PROTOCOL_TRANSITIONS.sql

# Opción B: Crear migración Prisma
npx prisma migrate dev --name add_protocol_transitions
```

### Paso 3: Añadir Método en ProtocolEngine

**Archivo**: `services/api/src/behavioral/protocol.engine.ts`

```typescript
// Añadir método para obtener siguiente protocolo
async getNextProtocol(
  fromProtocol: string,
  signalType: string
): Promise<string | null> {
  const result = await this.prisma.protocolTransition.findFirst({
    where: {
      fromProtocol,
      signalType,
      enabled: true,
    },
    orderBy: {
      priority: 'desc',
    },
    select: {
      nextProtocol: true,
    },
  });

  return result?.nextProtocol || null;
}
```

### Paso 4: Usar en Lógica de Reentry

**Archivo**: `services/api/src/behavioral/protocol.engine.ts`

```typescript
// En el método que maneja reentry/drift
async handleProtocolTransition(
  userId: string,
  currentProtocol: string,
  signal: 'DRIFT' | 'LATENT_INSTABILITY' | 'COMPLETED'
): Promise<string | null> {
  // 1. Consultar siguiente protocolo desde DB
  const nextProtocol = await this.getNextProtocol(currentProtocol, signal);

  if (!nextProtocol) {
    this.logger.warn(
      `No transition rule found for ${currentProtocol} -> ${signal}`
    );
    return null;
  }

  // 2. Verificar cooldown (lógica existente)
  const hasCooldown = await this.checkCooldown(userId, nextProtocol);
  if (hasCooldown) {
    this.logger.info(`Cooldown active for ${nextProtocol}, skipping`);
    return null;
  }

  // 3. Retornar protocolo sugerido
  return nextProtocol;
}
```

---

## 📊 Vistas de Depuración

### Vista 1: Decisiones de Reentry

```sql
SELECT * FROM "ReentryDecisionDebug";
```

**Output**:
```
userId | email | currentProgram | programStatus | deviationType | suggestedNextProtocol | lastUpdate
-------|-------|----------------|---------------|---------------|----------------------|------------
abc123 | user@example.com | circadian_reset_14 | COMPLETED | DRIFT | energy_stability_7 | 2026-02-16
```

### Vista 2: Rutas Activas

```sql
SELECT * FROM "ActiveProtocolRoutes";
```

**Output**:
```
from | signal | to | priority | enabled | createdAt
-----|--------|----|---------|---------|-----------
circadian_reset_14 | DRIFT | energy_stability_7 | 200 | t | 2026-02-16
```

---

## 🧪 Testing en QA

### Test 1: Verificar Lookup Básico

```sql
SELECT get_next_protocol('circadian_reset_14', 'DRIFT');
-- Esperado: 'energy_stability_7'
```

### Test 2: Verificar Prioridad

```sql
-- Si hubiera múltiples reglas, debe retornar la de mayor prioridad
SELECT "nextProtocol", priority
FROM "ProtocolTransition"
WHERE "fromProtocol" = 'circadian_reset_14'
  AND "signalType" = 'DRIFT'
  AND enabled = TRUE
ORDER BY priority DESC;
```

### Test 3: Verificar Fallback

```sql
SELECT get_next_protocol('energy_stability_7', 'DRIFT');
-- Esperado: 'circadian_reset_14'
```

### Test 4: Verificar No-Loop

```sql
-- Energy NO debe apuntar a sí mismo
SELECT COUNT(*) FROM "ProtocolTransition"
WHERE "fromProtocol" = 'energy_stability_7'
  AND "nextProtocol" = 'energy_stability_7';
-- Esperado: 0
```

---

## 📈 Resultado Clínico

### Antes de Protocol Transitions

| Estado Usuario | Comportamiento del Sistema |
|----------------|----------------------------|
| Termina circadiano y recae | Repetir circadian_reset_14 |
| Mejora sueño pero sigue cansado | Sin solución |
| Ansiedad baja pero agotamiento | Recalibración genérica |
| Digestión ok pero bajones | Nada |

### Después de Protocol Transitions

| Estado Usuario | Comportamiento del Sistema |
|----------------|----------------------------|
| Termina circadiano y recae | → energy_stability_7 |
| Mejora sueño pero sigue cansado | → energy_stability_7 |
| Ansiedad baja pero agotamiento | → energy_stability_7 |
| Digestión ok pero bajones | → energy_stability_7 |
| Energy falla | → circadian_reset_14 (fallback) |

---

## ⚠️ Importante para QA Experimental

### ✅ DO (Hacer)

- Ejecutar `QA_PROTOCOL_TRANSITIONS.sql` **ANTES** del QA
- Verificar que las 11 reglas están insertadas
- Usar vistas de depuración para auditar decisiones
- Documentar transiciones observadas

### ❌ DON'T (No Hacer)

- **NO** cambiar el motor de reglas existente
- **NO** hardcodear lógica de transición en código
- **NO** modificar reglas durante el QA (invalidaría resultados)
- **NO** añadir nuevos protocolos sin actualizar transiciones

---

## 🔄 Workflow de Integración

### 1. Preparación (Ahora)

```bash
# Generar cliente Prisma
cd services/api
npx prisma generate

# Ejecutar SQL
psql healthos_dev < ../../.system/QA_PROTOCOL_TRANSITIONS.sql

# Verificar seed
psql healthos_dev -c "SELECT COUNT(*) FROM \"ProtocolTransition\";"
# Esperado: 11
```

### 2. Código (Mínimo Cambio)

```typescript
// En ProtocolEngine, añadir SOLO este método:
async getNextProtocol(fromProtocol: string, signalType: string) {
  return await this.prisma.protocolTransition.findFirst({
    where: { fromProtocol, signalType, enabled: true },
    orderBy: { priority: 'desc' },
    select: { nextProtocol: true },
  })?.nextProtocol || null;
}

// Usar en lógica existente de reentry:
const suggestedProtocol = await this.getNextProtocol(
  currentState.programId,
  detectedSignal
);
```

### 3. Validación (Post-QA)

```sql
-- Ver qué transiciones se usaron
SELECT
  "fromProtocol",
  "signalType",
  "nextProtocol",
  COUNT(*) as times_used
FROM "ReentryDecisionDebug"
GROUP BY "fromProtocol", "signalType", "nextProtocol"
ORDER BY times_used DESC;
```

---

## 📝 Checklist de Integración

- [ ] Modelo `ProtocolTransition` añadido a `schema.prisma`
- [ ] `npx prisma generate` ejecutado
- [ ] `QA_PROTOCOL_TRANSITIONS.sql` ejecutado en DB
- [ ] 11 reglas verificadas en tabla
- [ ] Método `getNextProtocol()` añadido a `ProtocolEngine`
- [ ] Lógica de reentry actualizada para usar DB lookup
- [ ] Vistas de depuración accesibles
- [ ] Tests de lookup ejecutados

---

## 🎯 Próximo Paso

**Ejecutar migración y seed**:

```bash
# Desde services/api
npx prisma generate
psql healthos_dev < ../../.system/QA_PROTOCOL_TRANSITIONS.sql
```

**Luego verificar**:

```sql
SELECT * FROM "ActiveProtocolRoutes";
```

---

**Fecha**: 2026-02-16 01:45 UTC+1  
**Estado**: ✅ **SCHEMA Y SQL LISTOS**  
**Próximo**: Ejecutar migración → Añadir método en backend
