-- ============================================
-- INSTRUMENTATION QA - SQL QUERIES
-- ============================================
-- Objetivo: Validar que el sistema mide comportamiento real
-- Base de datos: PostgreSQL (Prisma)
-- Fecha: 2026-02-16
-- ============================================

-- ============================================
-- QUERY 1: Event Type Distribution
-- ============================================
-- Verifica que los 6 eventos críticos existen y son distinguibles

SELECT 
    event_type,
    COUNT(*) as total_events,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM (
    -- Daily logs (acciones registradas)
    SELECT 
        'daily_log' as event_type,
        user_id,
        created_at
    FROM "DayLog"
    
    UNION ALL
    
    -- Spontaneous returns (vuelve sin trigger)
    SELECT 
        'spontaneous_return' as event_type,
        user_id,
        created_at
    FROM "UserSession"
    WHERE trigger_source IS NULL
      AND created_at > (
          SELECT MAX(created_at) 
          FROM "DayLog" dl 
          WHERE dl.user_id = "UserSession".user_id
      ) + INTERVAL '24 hours'
    
    UNION ALL
    
    -- Passive orientation (explora sin actuar)
    SELECT 
        'passive_orientation' as event_type,
        user_id,
        created_at
    FROM "UserSession"
    WHERE NOT EXISTS (
        SELECT 1 FROM "DayLog" dl
        WHERE dl.user_id = "UserSession".user_id
          AND dl.created_at BETWEEN "UserSession".created_at 
                                AND "UserSession".created_at + INTERVAL '1 hour'
    )
    
    UNION ALL
    
    -- Reentry accept
    SELECT 
        'reentry_accept' as event_type,
        user_id,
        created_at
    FROM "BehavioralEvent"
    WHERE type = 'reentry_decision'
      AND metadata->>'decision' = 'ACCEPT'
    
    UNION ALL
    
    -- Reentry decline
    SELECT 
        'reentry_decline' as event_type,
        user_id,
        created_at
    FROM "BehavioralEvent"
    WHERE type = 'reentry_decision'
      AND metadata->>'decision' = 'DECLINE'
    
    UNION ALL
    
    -- Protocol silence (integración - no vuelve)
    SELECT 
        'protocol_silence' as event_type,
        up.user_id,
        up.ended_at as created_at
    FROM "UserProtocol" up
    WHERE up.status = 'COMPLETED'
      AND up.end_reason = 'INTEGRATED'
      AND NOT EXISTS (
          SELECT 1 FROM "DayLog" dl
          WHERE dl.user_id = up.user_id
            AND dl.created_at > up.ended_at + INTERVAL '7 days'
      )
) events
GROUP BY event_type
ORDER BY total_events DESC;

-- ✅ CRITERIO DE ÉXITO:
-- - Todos los 6 tipos tienen count > 0
-- - reentry_decline > 0 (indica que la oferta es opcional)
-- - spontaneous_return > 0 (usuarios vuelven sin triggers)


-- ============================================
-- QUERY 2: SER (Spontaneous Event Recording) Ratio
-- ============================================
-- Mide qué % de eventos son espontáneos vs triggered

WITH user_events AS (
    SELECT 
        dl.user_id,
        dl.id as log_id,
        dl.created_at,
        -- Buscar si hay trigger en ventana de 1h antes
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM "Notification" n
                WHERE n.user_id = dl.user_id
                  AND n.sent_at BETWEEN dl.created_at - INTERVAL '1 hour' 
                                    AND dl.created_at
                  AND n.type IN ('reminder', 'prompt')
            ) THEN 'triggered'
            WHEN EXISTS (
                SELECT 1 FROM "EmailLog" e
                WHERE e.user_id = dl.user_id
                  AND e.sent_at BETWEEN dl.created_at - INTERVAL '2 hours' 
                                    AND dl.created_at
                  AND e.template IN ('daily_reminder', 'reengagement')
            ) THEN 'triggered'
            ELSE 'spontaneous'
        END as event_source
    FROM "DayLog" dl
),
user_ratios AS (
    SELECT 
        user_id,
        COUNT(*) as total_events,
        SUM(CASE WHEN event_source = 'spontaneous' THEN 1 ELSE 0 END) as spontaneous_count,
        SUM(CASE WHEN event_source = 'triggered' THEN 1 ELSE 0 END) as triggered_count,
        ROUND(
            SUM(CASE WHEN event_source = 'spontaneous' THEN 1 ELSE 0 END) * 100.0 / 
            NULLIF(COUNT(*), 0), 
            2
        ) as ser_percentage
    FROM user_events
    GROUP BY user_id
    HAVING COUNT(*) >= 3  -- Solo usuarios con al menos 3 eventos
)
SELECT 
    ROUND(AVG(ser_percentage), 2) as avg_ser_ratio,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ser_percentage), 2) as median_ser_ratio,
    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ser_percentage), 2) as p25_ser_ratio,
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ser_percentage), 2) as p75_ser_ratio,
    COUNT(CASE WHEN spontaneous_count > triggered_count THEN 1 END) as users_mostly_spontaneous,
    COUNT(CASE WHEN ser_percentage >= 70 THEN 1 END) as users_above_70pct,
    COUNT(*) as total_users_analyzed
FROM user_ratios;

-- ✅ CRITERIO DE ÉXITO:
-- - avg_ser_ratio > 70%
-- - median_ser_ratio > 80%
-- - users_above_70pct > 60% del total


-- ============================================
-- QUERY 3: Drift Detection Accuracy
-- ============================================
-- Verifica que drift se detecta correctamente (3 "worse" consecutivos)

WITH check_sequences AS (
    SELECT 
        user_id,
        protocol_id,
        day,
        check_value,
        created_at,
        LAG(check_value, 1) OVER (PARTITION BY user_id, protocol_id ORDER BY day) as prev_1,
        LAG(check_value, 2) OVER (PARTITION BY user_id, protocol_id ORDER BY day) as prev_2,
        CASE 
            WHEN check_value = 'worse' 
             AND LAG(check_value, 1) OVER (PARTITION BY user_id, protocol_id ORDER BY day) = 'worse'
             AND LAG(check_value, 2) OVER (PARTITION BY user_id, protocol_id ORDER BY day) = 'worse'
            THEN TRUE 
            ELSE FALSE 
        END as should_trigger_drift
    FROM "DayLog"
    WHERE check_value IS NOT NULL
),
drift_events AS (
    SELECT 
        user_id,
        created_at,
        metadata->>'day' as day
    FROM "BehavioralEvent"
    WHERE type = 'drift_detected'
)
SELECT 
    cs.user_id,
    cs.day,
    cs.check_value,
    cs.prev_1,
    cs.prev_2,
    cs.should_trigger_drift,
    CASE 
        WHEN de.user_id IS NOT NULL THEN TRUE 
        ELSE FALSE 
    END as drift_was_triggered,
    CASE 
        WHEN cs.should_trigger_drift = TRUE AND de.user_id IS NOT NULL THEN 'TRUE_POSITIVE'
        WHEN cs.should_trigger_drift = TRUE AND de.user_id IS NULL THEN 'FALSE_NEGATIVE'
        WHEN cs.should_trigger_drift = FALSE AND de.user_id IS NOT NULL THEN 'FALSE_POSITIVE'
        ELSE 'TRUE_NEGATIVE'
    END as detection_result
FROM check_sequences cs
LEFT JOIN drift_events de 
    ON cs.user_id = de.user_id 
   AND cs.day::text = de.day
WHERE cs.should_trigger_drift = TRUE
   OR de.user_id IS NOT NULL
ORDER BY cs.user_id, cs.day;

-- ✅ CRITERIO DE ÉXITO:
-- - FALSE_NEGATIVE = 0 (detecta todos los drifts)
-- - FALSE_POSITIVE = 0 (no detecta drifts inexistentes)


-- ============================================
-- QUERY 4: Reentry Offer Behavior
-- ============================================
-- Verifica que reentry no se ofrece repetidamente tras rechazo

WITH reentry_offers AS (
    SELECT 
        user_id,
        created_at as offered_at,
        metadata->>'decision' as decision,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as offer_number
    FROM "BehavioralEvent"
    WHERE type = 'reentry_decision'
),
user_offer_stats AS (
    SELECT 
        user_id,
        COUNT(*) as total_offers,
        COUNT(CASE WHEN decision = 'DECLINE' THEN 1 END) as times_declined,
        COUNT(CASE WHEN decision = 'ACCEPT' THEN 1 END) as times_accepted,
        MIN(offered_at) as first_offer,
        MAX(offered_at) as last_offer,
        EXTRACT(DAY FROM MAX(offered_at) - MIN(offered_at)) as days_span
    FROM reentry_offers
    GROUP BY user_id
)
SELECT 
    user_id,
    total_offers,
    times_declined,
    times_accepted,
    first_offer,
    last_offer,
    days_span,
    CASE 
        WHEN total_offers > 1 AND days_span < 7 THEN '🚨 TOO_FREQUENT'
        WHEN total_offers > 3 AND days_span < 14 THEN '⚠️ POTENTIALLY_PUSHY'
        ELSE '✅ ACCEPTABLE'
    END as offer_pattern
FROM user_offer_stats
WHERE total_offers > 1
ORDER BY total_offers DESC, days_span ASC;

-- ✅ CRITERIO DE ÉXITO:
-- - Ningún usuario con offer_pattern = 'TOO_FREQUENT'
-- - Si times_declined > 0, entonces days_span > 7


-- ============================================
-- QUERY 5: Protocol Completion Patterns
-- ============================================
-- Analiza cómo terminan los protocolos (integración vs abandono)

SELECT 
    end_reason,
    COUNT(*) as total,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
    ROUND(AVG(days_active), 1) as avg_days_active,
    COUNT(DISTINCT user_id) as unique_users
FROM (
    SELECT 
        user_id,
        status,
        CASE 
            WHEN status = 'COMPLETED' AND end_reason = 'INTEGRATED' THEN 'INTEGRATED'
            WHEN status = 'COMPLETED' AND end_reason = 'FINISHED' THEN 'FINISHED'
            WHEN status = 'PAUSED' THEN 'PAUSED'
            WHEN status = 'CANCELLED' THEN 'CANCELLED'
            ELSE 'ACTIVE'
        END as end_reason,
        EXTRACT(DAY FROM COALESCE(ended_at, NOW()) - started_at) as days_active
    FROM "UserProtocol"
) protocol_outcomes
GROUP BY end_reason
ORDER BY total DESC;

-- ✅ CRITERIO DE ÉXITO:
-- - INTEGRATED > 0 (algunos usuarios se integran y dejan de necesitar el sistema)
-- - PAUSED > CANCELLED (pausar es más común que cancelar = buen diseño)


-- ============================================
-- QUERY 6: Session Patterns (Spontaneity Check)
-- ============================================
-- Analiza patrones de sesión para detectar comportamiento orgánico

WITH session_gaps AS (
    SELECT 
        user_id,
        created_at as session_start,
        LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at) as prev_session,
        EXTRACT(EPOCH FROM (
            created_at - LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at)
        )) / 3600 as hours_since_last
    FROM "UserSession"
)
SELECT 
    CASE 
        WHEN hours_since_last < 1 THEN '< 1 hour'
        WHEN hours_since_last < 6 THEN '1-6 hours'
        WHEN hours_since_last < 24 THEN '6-24 hours'
        WHEN hours_since_last < 72 THEN '1-3 days'
        WHEN hours_since_last < 168 THEN '3-7 days'
        ELSE '> 7 days'
    END as gap_category,
    COUNT(*) as session_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM session_gaps
WHERE hours_since_last IS NOT NULL
GROUP BY gap_category
ORDER BY 
    CASE gap_category
        WHEN '< 1 hour' THEN 1
        WHEN '1-6 hours' THEN 2
        WHEN '6-24 hours' THEN 3
        WHEN '1-3 days' THEN 4
        WHEN '3-7 days' THEN 5
        ELSE 6
    END;

-- ✅ CRITERIO DE ÉXITO:
-- - Distribución variada (no todos en "< 1 hour" = bot-like)
-- - "1-3 days" y "3-7 days" > 30% combinados (retornos espontáneos)


-- ============================================
-- QUERY 7: Minimal Mode Activation Patterns
-- ============================================
-- Verifica que minimal mode se activa apropiadamente

SELECT 
    metadata->>'level' as minimal_level,
    metadata->>'reason' as activation_reason,
    COUNT(*) as activations,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(AVG(
        EXTRACT(DAY FROM created_at - (
            SELECT MIN(dl.created_at) 
            FROM "DayLog" dl 
            WHERE dl.user_id = "BehavioralEvent".user_id
        ))
    ), 1) as avg_days_into_protocol
FROM "BehavioralEvent"
WHERE type = 'minimal_mode_activated'
GROUP BY minimal_level, activation_reason
ORDER BY activations DESC;

-- ✅ CRITERIO DE ÉXITO:
-- - Hay activaciones de L1 y L2
-- - Razones son variadas (no solo una causa)
-- - avg_days_into_protocol > 3 (no se activa inmediatamente)


-- ============================================
-- SUMMARY QUERY: Overall Health Score
-- ============================================
-- Resumen ejecutivo de la salud del instrumento

WITH metrics AS (
    SELECT 
        (SELECT COUNT(DISTINCT user_id) FROM "DayLog") as total_active_users,
        (SELECT COUNT(*) FROM "DayLog") as total_events,
        (SELECT COUNT(*) FROM "BehavioralEvent" WHERE type = 'reentry_decision' AND metadata->>'decision' = 'DECLINE') as total_declines,
        (SELECT COUNT(*) FROM "BehavioralEvent" WHERE type = 'reentry_decision') as total_reentry_offers,
        (SELECT COUNT(*) FROM "UserProtocol" WHERE status = 'COMPLETED' AND end_reason = 'INTEGRATED') as integrated_users
)
SELECT 
    total_active_users,
    total_events,
    ROUND(total_events * 1.0 / NULLIF(total_active_users, 0), 2) as avg_events_per_user,
    total_reentry_offers,
    total_declines,
    ROUND(total_declines * 100.0 / NULLIF(total_reentry_offers, 0), 2) as decline_rate_pct,
    integrated_users,
    CASE 
        WHEN total_declines * 100.0 / NULLIF(total_reentry_offers, 0) > 20 
         AND integrated_users > 0 
        THEN '✅ HEALTHY'
        WHEN total_declines * 100.0 / NULLIF(total_reentry_offers, 0) > 10 
        THEN '⚠️ ACCEPTABLE'
        ELSE '🚨 NEEDS_REVIEW'
    END as instrument_health
FROM metrics;

-- ✅ CRITERIO DE ÉXITO GLOBAL:
-- - decline_rate_pct > 20% (usuarios realmente eligen)
-- - integrated_users > 0 (algunos completan y se van = éxito)
-- - instrument_health = 'HEALTHY'
