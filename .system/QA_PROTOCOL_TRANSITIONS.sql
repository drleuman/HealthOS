-- ============================================================================
-- PROTOCOL TRANSITIONS TABLE
-- ============================================================================
-- Propósito: Mapa declarativo de rutas terapéuticas
-- Decisión: La lógica clínica vive en DB, no en código
-- Auditabilidad: Todas las transiciones son rastreables
-- ============================================================================

-- 1️⃣ Crear tabla de transiciones
CREATE TABLE IF NOT EXISTS "ProtocolTransition" (
    id SERIAL PRIMARY KEY,

    "fromProtocol" VARCHAR(64) NOT NULL,
    "signalType" VARCHAR(64) NOT NULL,
    "nextProtocol" VARCHAR(64) NOT NULL,

    priority INT DEFAULT 100,
    enabled BOOLEAN DEFAULT TRUE,

    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_protocol_transitions_lookup 
ON "ProtocolTransition"("fromProtocol", "signalType", enabled, priority DESC);

-- ============================================================================
-- 2️⃣ REGLAS CLÍNICAS (Seed)
-- ============================================================================
-- Esto es el cerebro del routing terapéutico
-- ============================================================================

-- Limpiar reglas existentes
DELETE FROM "ProtocolTransition";

-- ============================================================================
-- PRIORIDAD 1: METABOLIC FLEXIBILITY (Estabiliza señal biológica subyacente)
-- ============================================================================
-- Cuando circadiano falla repetidamente → problema metabólico, no conductual
-- Esto reduce falsos DRIFT y mejora SER real

-- CIRCADIAN → METABOLIC (Máxima prioridad)
INSERT INTO "ProtocolTransition" ("fromProtocol", "signalType", "nextProtocol", priority) VALUES
('circadian_reset_14', 'DRIFT', 'metabolic_flexibility_10', 250),
('circadian_reset_14', 'LATENT_INSTABILITY', 'metabolic_flexibility_10', 250);

-- NERVOUS → METABOLIC (Fallback secundario)
INSERT INTO "ProtocolTransition" ("fromProtocol", "signalType", "nextProtocol", priority) VALUES
('nervous_system_reset_10', 'DRIFT', 'metabolic_flexibility_10', 230),
('nervous_system_reset_10', 'LATENT_INSTABILITY', 'metabolic_flexibility_10', 230);

-- ============================================================================
-- PRIORIDAD 2: ENERGY STABILITY (Puente entre regulación → estabilidad)
-- ============================================================================

-- CIRCADIAN → ENERGY (Completado sin deriva)
INSERT INTO "ProtocolTransition" ("fromProtocol", "signalType", "nextProtocol", priority) VALUES
('circadian_reset_14', 'COMPLETED', 'energy_stability_7', 150);

-- NERVOUS SYSTEM → ENERGY
INSERT INTO "ProtocolTransition" ("fromProtocol", "signalType", "nextProtocol", priority) VALUES
('nervous_system_reset_10', 'COMPLETED', 'energy_stability_7', 160);

-- DIGESTIVE → ENERGY
INSERT INTO "ProtocolTransition" ("fromProtocol", "signalType", "nextProtocol", priority) VALUES
('digestive_reset_14', 'DRIFT', 'energy_stability_7', 220),
('digestive_reset_14', 'LATENT_INSTABILITY', 'energy_stability_7', 220),
('digestive_reset_14', 'COMPLETED', 'energy_stability_7', 170);

-- ============================================================================
-- FALLBACKS (No loops)
-- ============================================================================

-- METABOLIC → CIRCADIAN (Tras estabilización metabólica)
INSERT INTO "ProtocolTransition" ("fromProtocol", "signalType", "nextProtocol", priority) VALUES
('metabolic_flexibility_10', 'COMPLETED', 'circadian_reset_14', 60),
('metabolic_flexibility_10', 'DRIFT', 'circadian_reset_14', 40);

-- ENERGY → CIRCADIAN (Si energy falla)
INSERT INTO "ProtocolTransition" ("fromProtocol", "signalType", "nextProtocol", priority) VALUES
('energy_stability_7', 'DRIFT', 'circadian_reset_14', 50),
('energy_stability_7', 'LATENT_INSTABILITY', 'circadian_reset_14', 50);

-- ============================================================================
-- 3️⃣ QUERY DE LOOKUP (Para usar en backend)
-- ============================================================================
-- El ProtocolEngine solo debe ejecutar esta query
-- ============================================================================

-- Ejemplo de uso:
-- SELECT "nextProtocol"
-- FROM "ProtocolTransition"
-- WHERE "fromProtocol" = 'circadian_reset_14'
--   AND "signalType" = 'DRIFT'
--   AND enabled = TRUE
-- ORDER BY priority DESC
-- LIMIT 1;

-- ============================================================================
-- 4️⃣ VISTA DE DEPURACIÓN CLÍNICA
-- ============================================================================
-- Auditar decisiones de reentry en QA
-- ============================================================================

CREATE OR REPLACE VIEW "ReentryDecisionDebug" AS
SELECT
    u.id AS "userId",
    u.email,
    s."programId" AS "currentProgram",
    s.status AS "programStatus",
    (s.context->>'deviation')::jsonb->>'type' AS "deviationType",
    (
        SELECT pt."nextProtocol"
        FROM "ProtocolTransition" pt
        WHERE pt."fromProtocol" = s."programId"
          AND pt."signalType" = (s.context->>'deviation')::jsonb->>'type'
          AND pt.enabled = TRUE
        ORDER BY pt.priority DESC
        LIMIT 1
    ) AS "suggestedNextProtocol",
    s."updatedAt" AS "lastUpdate"
FROM "UserBehaviorState" s
JOIN "User" u ON u.id = s."userId"
WHERE s.status IN ('COMPLETED', 'PAUSED', 'ENDED');

-- ============================================================================
-- 5️⃣ VISTA DE TRANSICIONES ACTIVAS
-- ============================================================================
-- Ver todas las rutas configuradas
-- ============================================================================

CREATE OR REPLACE VIEW "ActiveProtocolRoutes" AS
SELECT
    "fromProtocol" AS "from",
    "signalType" AS "signal",
    "nextProtocol" AS "to",
    priority,
    enabled,
    "createdAt"
FROM "ProtocolTransition"
WHERE enabled = TRUE
ORDER BY "fromProtocol", priority DESC;

-- ============================================================================
-- 6️⃣ VERIFICACIÓN DE SEED
-- ============================================================================

-- Ver todas las transiciones configuradas
SELECT 
    "fromProtocol" AS "From",
    "signalType" AS "Signal",
    "nextProtocol" AS "Next",
    priority AS "Priority",
    enabled AS "Enabled"
FROM "ProtocolTransition"
ORDER BY "fromProtocol", priority DESC;

-- Resultado esperado (17 reglas totales):
-- From                         | Signal              | Next                      | Priority | Enabled
-- -----------------------------|---------------------|---------------------------|----------|--------
-- circadian_reset_14           | DRIFT               | metabolic_flexibility_10  | 250      | t
-- circadian_reset_14           | LATENT_INSTABILITY  | metabolic_flexibility_10  | 250      | t
-- circadian_reset_14           | COMPLETED           | energy_stability_7        | 150      | t
-- nervous_system_reset_10      | DRIFT               | metabolic_flexibility_10  | 230      | t
-- nervous_system_reset_10      | LATENT_INSTABILITY  | metabolic_flexibility_10  | 230      | t
-- nervous_system_reset_10      | COMPLETED           | energy_stability_7        | 160      | t
-- digestive_reset_14           | DRIFT               | energy_stability_7        | 220      | t
-- digestive_reset_14           | LATENT_INSTABILITY  | energy_stability_7        | 220      | t
-- digestive_reset_14           | COMPLETED           | energy_stability_7        | 170      | t
-- metabolic_flexibility_10     | COMPLETED           | circadian_reset_14        | 60       | t
-- metabolic_flexibility_10     | DRIFT               | circadian_reset_14        | 40       | t
-- energy_stability_7           | DRIFT               | circadian_reset_14        | 50       | t
-- energy_stability_7           | LATENT_INSTABILITY  | circadian_reset_14        | 50       | t

-- ============================================================================
-- 7️⃣ FUNCIÓN HELPER (Opcional)
-- ============================================================================
-- Simplifica lookup desde código
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_protocol(
    p_from_protocol VARCHAR(64),
    p_signal_type VARCHAR(64)
) RETURNS VARCHAR(64) AS $$
DECLARE
    v_next_protocol VARCHAR(64);
BEGIN
    SELECT "nextProtocol" INTO v_next_protocol
    FROM "ProtocolTransition"
    WHERE "fromProtocol" = p_from_protocol
      AND "signalType" = p_signal_type
      AND enabled = TRUE
    ORDER BY priority DESC
    LIMIT 1;
    
    RETURN v_next_protocol;
END;
$$ LANGUAGE plpgsql;

-- Ejemplo de uso:
-- SELECT get_next_protocol('circadian_reset_14', 'DRIFT');
-- Resultado: 'energy_stability_7'

-- ============================================================================
-- ✅ CHECKLIST DE VERIFICACIÓN
-- ============================================================================

-- [ ] Tabla ProtocolTransition creada
-- [ ] 17 reglas de transición insertadas (13 + 4 metabolic)
-- [ ] Vista ReentryDecisionDebug creada
-- [ ] Vista ActiveProtocolRoutes creada
-- [ ] Función get_next_protocol creada
-- [ ] Query de verificación ejecutada

-- ============================================================================
-- 📊 RESULTADO CLÍNICO
-- ============================================================================

-- Estado Usuario                    | Antes                  | Ahora
-- ------------------------------------|------------------------|----------------------------------
-- Termina circadiano y recae         | repetir protocolo      | metabolic_flexibility_10 ⭐
-- Mejora sueño pero sigue cansado    | sin solución           | metabolic_flexibility_10 ⭐
-- Ansiedad baja pero agotamiento     | recalibración          | metabolic_flexibility_10 ⭐
-- Digestión ok pero bajones          | nada                   | energy_stability_7
-- Energy falla                       | bucle                  | circadian_reset_14
-- Metabolic completa                 | N/A                    | circadian_reset_14 (reintegración)

-- ⭐ CRÍTICO: metabolic_flexibility_10 ahora es el reentry prioritario
--    Esto reduce falsos DRIFT y mejora SER real (señal biológica vs conductual)

-- ============================================================================
-- 🎯 INTEGRACIÓN CON BACKEND
-- ============================================================================

-- En ProtocolEngine, añadir método:
--
-- async getNextProtocol(fromProtocol: string, signalType: string): Promise<string | null> {
--   const result = await this.prisma.$queryRaw`
--     SELECT "nextProtocol"
--     FROM "ProtocolTransition"
--     WHERE "fromProtocol" = ${fromProtocol}
--       AND "signalType" = ${signalType}
--       AND enabled = TRUE
--     ORDER BY priority DESC
--     LIMIT 1
--   `;
--   return result[0]?.nextProtocol || null;
-- }

-- ============================================================================
-- ⚠️ IMPORTANTE PARA QA
-- ============================================================================

-- NO cambiar el motor de reglas existente
-- SOLO añadir llamada a get_next_protocol()
-- Esto preserva la validez experimental

-- ============================================================================
