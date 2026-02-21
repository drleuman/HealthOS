#!/usr/bin/env node
/**
 * HealthOS System Check (cron-friendly)
 * - Checks API health and latency
 * - Optional protected endpoint check (Bearer)
 * - Sends Telegram alert on failure
 * - Posts an event to /events for persistence
 */

const {
    CHECK_NAME = "healthos-system-check",
    API_BASE_URL,
    HEALTH_PATH = "/health",
    EVENTS_PATH = "/events",

    // Optional: check a protected endpoint
    PROTECTED_PATH = "",
    PROTECTED_BEARER_TOKEN = "",

    // Telegram notifier
    TELEGRAM_BOT_TOKEN = "",
    TELEGRAM_CHAT_ID = "",

    // thresholds
    MAX_LATENCY_MS = "1500",
    TIMEOUT_MS = "5000",
    ENVIRONMENT = "production",
} = process.env;

if (!API_BASE_URL) {
    console.error("Missing env: API_BASE_URL");
    process.exit(2);
}

const maxLatencyMs = Number(MAX_LATENCY_MS);
const timeoutMs = Number(TIMEOUT_MS);

function nowIso() {
    return new Date().toISOString();
}

function withTimeout(promise, ms, label) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return Promise.race([
        promise(ctrl.signal),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${ms}ms (${label})`)), ms + 50)
        ),
    ]).finally(() => clearTimeout(timer));
}

async function httpGet(url) {
    const start = Date.now();
    const res = await withTimeout(
        (signal) => fetch(url, { method: "GET", signal, headers: { "Accept": "application/json" } }),
        timeoutMs,
        `GET ${url}`
    );
    const latencyMs = Date.now() - start;
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
    return { ok: res.ok, status: res.status, latencyMs, json, text };
}

async function httpGetProtected(url, bearer) {
    const start = Date.now();
    const res = await withTimeout(
        (signal) =>
            fetch(url, {
                method: "GET",
                signal,
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${bearer}`,
                },
            }),
        timeoutMs,
        `GET (protected) ${url}`
    );
    const latencyMs = Date.now() - start;
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
    return { ok: res.ok, status: res.status, latencyMs, json, text };
}

async function telegramNotify(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return { sent: false };
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body = {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        disable_web_page_preview: true,
    };

    const res = await withTimeout(
        (signal) =>
            fetch(url, {
                method: "POST",
                signal,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        timeoutMs,
        "Telegram sendMessage"
    );

    return { sent: res.ok, status: res.status };
}

async function postEvent(payload) {
    const url = new URL(EVENTS_PATH, API_BASE_URL).toString();

    const res = await withTimeout(
        (signal) =>
            fetch(url, {
                method: "POST",
                signal,
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(payload),
            }),
        timeoutMs,
        `POST ${url}`
    );

    return { ok: res.ok, status: res.status };
}

function formatAlert(title, details) {
    const lines = [
        `[${ENVIRONMENT}] ${title}`,
        `check: ${CHECK_NAME}`,
        `time: ${nowIso()}`,
        ...details,
    ];
    return lines.join("\n");
}

async function main() {
    const results = [];
    let failed = false;

    const healthUrl = new URL(HEALTH_PATH, API_BASE_URL).toString();
    const health = await httpGet(healthUrl);
    results.push({ name: "health", ...health });

    if (!health.ok) failed = true;
    if (health.latencyMs > maxLatencyMs) failed = true;

    if (PROTECTED_PATH && PROTECTED_BEARER_TOKEN) {
        const protectedUrl = new URL(PROTECTED_PATH, API_BASE_URL).toString();
        const prot = await httpGetProtected(protectedUrl, PROTECTED_BEARER_TOKEN);
        results.push({ name: "protected", ...prot });

        if (!prot.ok) failed = true;
        if (prot.latencyMs > maxLatencyMs) failed = true;
    }

    const severity =
        failed ? (results.some(r => r.status >= 500 || r.status === 0) ? "critical" : "warn") : "info";

    const eventPayload = {
        event: failed ? "system_check_failed" : "system_check_ok",
        context: {
            ts: nowIso(),
            source: "cron",
            env: ENVIRONMENT,
            severity,
            check: CHECK_NAME,
            maxLatencyMs,
            results: results.map((r) => ({
                name: r.name,
                ok: r.ok,
                status: r.status,
                latencyMs: r.latencyMs,
            })),
        }
    };

    try {
        await postEvent(eventPayload);
    } catch (e) {
        console.error("Event post failed:", e?.message || e);
    }

    if (!failed) {
        console.log(JSON.stringify({ ok: true, ...eventPayload }, null, 2));
        process.exit(0);
    }

    const details = results.map((r) => {
        const statusPart = `status=${r.status}`;
        const latencyPart = `latency=${r.latencyMs}ms`;
        const okPart = r.ok ? "ok" : "fail";
        return `- ${r.name}: ${okPart} ${statusPart} ${latencyPart}`;
    });

    const msg = formatAlert("SYSTEM CHECK FAILED", details);

    try {
        const tg = await telegramNotify(msg);
        console.error("Telegram:", tg);
    } catch (e) {
        console.error("Telegram notify failed:", e?.message || e);
    }

    console.error(JSON.stringify({ ok: false, ...eventPayload }, null, 2));
    process.exit(1);
}

main().catch((e) => {
    console.error("Fatal:", e?.stack || e);
    process.exit(2);
});
