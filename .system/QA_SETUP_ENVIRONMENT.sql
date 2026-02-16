-- ============================================
-- QA ENVIRONMENT SETUP - PRE-TEST PREPARATION
-- ============================================
-- Objetivo: Congelar el sistema para QA experimental
-- EJECUTAR ANTES de iniciar pruebas de perfiles
-- ============================================

-- ============================================
-- PASO 1: DESACTIVAR ESTÍMULOS EXTERNOS
-- ============================================

-- A. Desactivar notificaciones automáticas
-- (Si tienes tabla de configuración de notificaciones)
UPDATE "SystemConfig"
SET value = 'false'
WHERE key IN (
    'notifications_enabled',
    'email_reminders_enabled',
    'push_notifications_enabled',
    'auto_reengagement_enabled'
);

-- B. Pausar cron jobs / scheduled tasks
-- (Marcar como disabled temporalmente)
UPDATE "ScheduledTask"
SET enabled = false
WHERE task_type IN (
    'daily_reminder',
    'reengagement_check',
    'drift_notification',
    'weekly_summary'
);

-- C. Desactivar webhooks externos
UPDATE "WebhookConfig"
SET active = false
WHERE trigger_event IN (
    'user_inactive',
    'protocol_drift',
    'reentry_eligible'
);

-- ============================================
-- PASO 2: CREAR USUARIOS DE PRUEBA LIMPIOS
-- ============================================

-- A. Crear usuario QA: Curioso (explorador pasivo)
INSERT INTO "User" (id, email, name, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'qa_curioso@healthos.test',
    'QA Curioso',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- B. Crear usuario QA: Adherente (sigue protocolo)
INSERT INTO "User" (id, email, name, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'qa_adherente@healthos.test',
    'QA Adherente',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- C. Crear usuario QA: Fricción (reporta peor)
INSERT INTO "User" (id, email, name, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'qa_friccion@healthos.test',
    'QA Fricción',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- PASO 3: LIMPIAR HISTORIAL CONDUCTUAL
-- ============================================

-- IMPORTANTE: Solo borrar datos de comportamiento, NO catálogos

-- A. Borrar estados conductuales previos
DELETE FROM "UserBehaviorState"
WHERE user_id IN (
    SELECT id FROM "User" WHERE email LIKE 'qa_%@healthos.test'
);

-- B. Borrar logs de acciones
DELETE FROM "DayLog"
WHERE user_id IN (
    SELECT id FROM "User" WHERE email LIKE 'qa_%@healthos.test'
);

-- C. Borrar eventos conductuales
DELETE FROM "BehavioralEvent"
WHERE user_id IN (
    SELECT id FROM "User" WHERE email LIKE 'qa_%@healthos.test'
);

-- D. Borrar contexto de reentry
DELETE FROM "ReentryContext"
WHERE user_id IN (
    SELECT id FROM "User" WHERE email LIKE 'qa_%@healthos.test'
);

-- E. Borrar sesiones previas
DELETE FROM "UserSession"
WHERE user_id IN (
    SELECT id FROM "User" WHERE email LIKE 'qa_%@healthos.test'
);

-- F. Borrar protocolos activos
DELETE FROM "UserProtocol"
WHERE user_id IN (
    SELECT id FROM "User" WHERE email LIKE 'qa_%@healthos.test'
);

-- G. Borrar notificaciones enviadas
DELETE FROM "Notification"
WHERE user_id IN (
    SELECT id FROM "User" WHERE email LIKE 'qa_%@healthos.test'
);

-- ============================================
-- PASO 4: VERIFICAR ESTADO LIMPIO
-- ============================================

-- Verificar que usuarios QA no tienen historial
SELECT 
    u.email,
    (SELECT COUNT(*) FROM "DayLog" WHERE user_id = u.id) as day_logs,
    (SELECT COUNT(*) FROM "BehavioralEvent" WHERE user_id = u.id) as events,
    (SELECT COUNT(*) FROM "UserProtocol" WHERE user_id = u.id) as protocols,
    (SELECT COUNT(*) FROM "UserSession" WHERE user_id = u.id) as sessions
FROM "User" u
WHERE u.email LIKE 'qa_%@healthos.test';

-- ✅ ESPERADO: Todos los counts = 0

-- ============================================
-- PASO 5: CREAR TOKENS DE ACCESO (OPCIONAL)
-- ============================================

-- Si necesitas tokens JWT para login directo:
-- (Ajusta según tu implementación de auth)

-- Generar tokens de sesión para cada usuario QA
-- (Esto depende de tu sistema de auth - ejemplo genérico)

SELECT 
    id,
    email,
    'Bearer ' || encode(
        hmac(
            json_build_object(
                'sub', id::text,
                'email', email,
                'iat', extract(epoch from now())::bigint,
                'exp', extract(epoch from now() + interval '30 days')::bigint
            )::text,
            current_setting('app.jwt_secret'),
            'sha256'
        ),
        'base64'
    ) as auth_token
FROM "User"
WHERE email LIKE 'qa_%@healthos.test';

-- Guarda estos tokens para usar en headers de API

-- ============================================
-- PASO 6: SNAPSHOT DE ESTADO INICIAL
-- ============================================

-- Crear snapshot para poder revertir después del QA
CREATE TABLE IF NOT EXISTS "QA_Snapshot" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date TIMESTAMP DEFAULT NOW(),
    table_name TEXT,
    record_count BIGINT,
    metadata JSONB
);

-- Registrar estado inicial
INSERT INTO "QA_Snapshot" (table_name, record_count, metadata)
SELECT 
    'User' as table_name,
    COUNT(*) as record_count,
    json_build_object(
        'qa_users', (SELECT COUNT(*) FROM "User" WHERE email LIKE 'qa_%@healthos.test'),
        'total_users', COUNT(*)
    ) as metadata
FROM "User";

INSERT INTO "QA_Snapshot" (table_name, record_count, metadata)
SELECT 
    'DayLog' as table_name,
    COUNT(*) as record_count,
    json_build_object('total_logs', COUNT(*)) as metadata
FROM "DayLog";

INSERT INTO "QA_Snapshot" (table_name, record_count, metadata)
SELECT 
    'BehavioralEvent' as table_name,
    COUNT(*) as record_count,
    json_build_object('total_events', COUNT(*)) as metadata
FROM "BehavioralEvent";

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Checklist de preparación
SELECT 
    '✅ Usuarios QA creados' as check_item,
    (SELECT COUNT(*) FROM "User" WHERE email LIKE 'qa_%@healthos.test') as count,
    CASE WHEN (SELECT COUNT(*) FROM "User" WHERE email LIKE 'qa_%@healthos.test') = 3 
         THEN '✅ OK' 
         ELSE '❌ FALTA' 
    END as status
UNION ALL
SELECT 
    '✅ Historial limpio',
    (SELECT COUNT(*) FROM "DayLog" WHERE user_id IN (SELECT id FROM "User" WHERE email LIKE 'qa_%@healthos.test')),
    CASE WHEN (SELECT COUNT(*) FROM "DayLog" WHERE user_id IN (SELECT id FROM "User" WHERE email LIKE 'qa_%@healthos.test')) = 0 
         THEN '✅ OK' 
         ELSE '❌ HAY DATOS' 
    END
UNION ALL
SELECT 
    '✅ Notificaciones OFF',
    (SELECT COUNT(*) FROM "SystemConfig" WHERE key LIKE '%notification%' AND value = 'false'),
    CASE WHEN (SELECT COUNT(*) FROM "SystemConfig" WHERE key LIKE '%notification%' AND value = 'false') > 0 
         THEN '✅ OK' 
         ELSE '⚠️ VERIFICAR' 
    END
UNION ALL
SELECT 
    '✅ Cron jobs pausados',
    (SELECT COUNT(*) FROM "ScheduledTask" WHERE enabled = false),
    CASE WHEN (SELECT COUNT(*) FROM "ScheduledTask" WHERE enabled = false) > 0 
         THEN '✅ OK' 
         ELSE '⚠️ VERIFICAR' 
    END;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
⚠️ ANTES DE EJECUTAR:
1. Haz backup de la base de datos completa
2. Verifica que estás en entorno de desarrollo (NO producción)
3. Confirma que tienes las tablas mencionadas

⚠️ DESPUÉS DE EJECUTAR:
1. NO toques la DB manualmente durante el QA
2. NO ejecutes seeds automáticos
3. NO envíes emails/notificaciones manualmente
4. Espera 24h antes de analizar resultados

⚠️ PARA REVERTIR DESPUÉS DEL QA:
DELETE FROM "User" WHERE email LIKE 'qa_%@healthos.test';
UPDATE "SystemConfig" SET value = 'true' WHERE key LIKE '%notification%';
UPDATE "ScheduledTask" SET enabled = true;
UPDATE "WebhookConfig" SET active = true;

✅ CRITERIO DE ÉXITO:
- 3 usuarios QA creados
- 0 registros de comportamiento previo
- Todos los estímulos externos desactivados
- Snapshot de estado inicial guardado
*/
