'use client';

import React, { useState, useEffect } from 'react';
import { Page, Card, Button, Input, Property } from '../components/ui';

interface OpsState {
    status: 'COLLECTING' | 'STABLE';
    trustLevel: 'UNUSABLE' | 'LIMITED' | 'USABLE';
    operatorMode: 'LOCKED' | 'OBSERVE' | 'INTERPRET';
    action: 'WAIT' | 'INVESTIGATE' | 'INTERPRET';
    nextCheck: string;
    reason: string;
    validSample: number;
    effectiveN: number;
    candidatesN: number;
    biasRatio: number;
    contamination: number;
    activeUsers24h: number;
    lastDigestAt: string | null;
}

const OpsAlert = ({ title, children, type = 'warning' }: { title: string, children: React.ReactNode, type?: 'warning' | 'danger' }) => (
    <div style={{
        background: type === 'danger' ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255, 193, 7, 0.1)',
        borderLeft: `2px solid ${type === 'danger' ? 'var(--danger)' : 'var(--warning)'}`,
        padding: '12px 16px',
        marginBottom: '12px',
        borderRadius: '0 4px 4px 0'
    }}>
        <div style={{
            color: type === 'danger' ? 'var(--danger)' : 'var(--warning)',
            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px'
        }}>
            {title}
        </div>
        <div style={{ fontSize: '13px', opacity: 0.9 }}>{children}</div>
    </div>
);

// Semantic helpers to hide raw numbers
const getSemanticBias = (ratio: number) => ratio < 0.15 ? "NOMINAL" : (ratio < 0.3 ? "ELEVATED" : "CRITICAL");
const getSemanticSample = (n: number) => n < 8 ? "INSUFFICIENT" : (n < 15 ? "PARTIAL" : "ROBUST");

export default function OpsDashboard() {
    const [secret, setSecret] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [protocolConfirmed, setProtocolConfirmed] = useState(false);
    const [state, setState] = useState<OpsState | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showTechnical, setShowTechnical] = useState(false);
    const [freeze, setFreeze] = useState(false);
    const [timeToNext, setTimeToNext] = useState<string>("--:--:--");

    // Anti-Monitoring & Load Logic
    useEffect(() => {
        const checkMonitoringFrequency = () => {
            const now = Date.now();
            const log = JSON.parse(localStorage.getItem('ops_access_log') || '[]');
            const recent = log.filter((t: number) => now - t < 10 * 60 * 1000); // last 10 mins

            if (recent.length > 6) {
                setFreeze(true);
                return false;
            }

            recent.push(now);
            localStorage.setItem('ops_access_log', JSON.stringify(recent));
            return true;
        };

        const storedSecret = sessionStorage.getItem('ops_secret');
        const storedAck = localStorage.getItem('ops_protocol_ack');
        const ackValid = storedAck && (Date.now() - parseInt(storedAck) < 12 * 60 * 60 * 1000); // 12h validity

        if (storedSecret) {
            if (checkMonitoringFrequency()) {
                setSecret(storedSecret);
                fetchState(storedSecret);
                if (ackValid) setProtocolConfirmed(true);
            }
        }
    }, []);

    // Countdown Timer
    useEffect(() => {
        if (!state?.nextCheck) return;

        const timer = setInterval(() => {
            // Parse "2026-02-15 09:00 AM..."
            const datePart = state.nextCheck.split(' AM')[0]; // Simple parse, usually reliable for ISO-like
            if (!datePart) return;

            // This is rough parsing, robust implementation would use dateStr from backend
            // For now, we trust the effect is just visual
            const diff = new Date(state.nextCheck).getTime() - Date.now();
            // fallback if date parsing fails in browser:
            if (isNaN(diff)) { setTimeToNext("PENDING"); return; }

            if (diff <= 0) {
                setTimeToNext("READY");
            } else {
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setTimeToNext(`${h}h ${m}m`);
            }
        }, 60000);

        return () => clearInterval(timer);
    }, [state]);

    const fetchState = async (key: string) => {
        setLoading(true);
        setError('');
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_ORIGIN || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
            const res = await fetch(`${baseUrl}/internal/ops/state`, {
                headers: { 'x-analytics-secret': key }
            });

            if (res.status === 401) {
                setError('Invalid Secret');
                setIsAuthenticated(false);
                sessionStorage.removeItem('ops_secret');
            } else if (!res.ok) {
                throw new Error('Failed to fetch state');
            } else {
                const data = await res.json();
                setState(data);
                setIsAuthenticated(true);
                sessionStorage.setItem('ops_secret', key);
            }
        } catch (err) {
            setError('Connection Error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        fetchState(secret);
    };

    const confirmProtocol = () => {
        setProtocolConfirmed(true);
        localStorage.setItem('ops_protocol_ack', Date.now().toString());
    };

    const handleLogout = () => {
        setSecret('');
        setIsAuthenticated(false);
        setState(null);
        sessionStorage.removeItem('ops_secret');
    };

    if (freeze) {
        return (
            <Page>
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
                    <div>
                        <h1 style={{ color: 'var(--danger)', fontSize: '24px', marginBottom: '16px' }}>SYSTEM LOCK</h1>
                        <p style={{ maxWidth: '300px', margin: '0 auto', opacity: 0.8 }}>
                            Monitoring frequency exceeds protocol limits (6 checks / 10m).
                            <br /><br />
                            Access suspended to prevent intervention bias.
                        </p>
                    </div>
                </div>
            </Page>
        );
    }

    if (!isAuthenticated) {
        return (
            <Page>
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: '100px' }}>
                    <Card style={{ width: '100%', maxWidth: '320px' }}>
                        <h2 style={{ marginBottom: '16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)', textAlign: 'center' }}>
                            HealthOS Instrument
                        </h2>
                        <form onSubmit={handleLogin}>
                            <Input label="ACCESS KEY" type="password" value={secret} onChange={setSecret} placeholder="••••••••" required />
                            <Button type="submit" disabled={loading} className="full-width" style={{ marginTop: '16px' }}>
                                {loading ? 'VERIFYING...' : 'UNLOCK'}
                            </Button>
                            {error && <p style={{ color: 'var(--danger)', marginTop: '16px', fontSize: '13px', textAlign: 'center' }}>{error}</p>}
                        </form>
                    </Card>
                </div>
            </Page>
        );
    }

    if (!state) return null;

    if (!protocolConfirmed) {
        return (
            <Page>
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <Card style={{ maxWidth: '400px', textAlign: 'center', padding: '32px' }}>
                        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Protocol Acknowledgement</h2>
                        <p style={{ fontSize: '14px', lineHeight: 1.6, opacity: 0.8, marginBottom: '24px' }}>
                            I confirm that I will not intervene, modify data, or contact users outside of the explicit instructions provided by this instrument.
                        </p>
                        <Button onClick={confirmProtocol} className="full-width">
                            I CONFIRM
                        </Button>
                    </Card>
                </div>
            </Page>
        );
    }

    const { operatorMode } = state;
    const isLocked = operatorMode === 'LOCKED';
    const canInterpret = operatorMode === 'INTERPRET';

    // UI Colors & config
    const trustColor = state.trustLevel === 'USABLE' ? 'var(--success)' : (state.trustLevel === 'LIMITED' ? 'var(--warning)' : 'var(--danger)');

    return (
        <Page>
            <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)', marginBottom: '4px' }}>
                            MODE: <span style={{ color: 'var(--text)' }}>{operatorMode}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: state.status === 'STABLE' ? 'var(--success)' : 'var(--muted)' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--faint)' }}>{state.status}</span>
                        </div>
                    </div>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>LOCK</button>
                </div>

                {/* ZONE 1: VERDICT */}
                <div style={{ textAlign: 'center', marginBottom: '48px', opacity: isLocked ? 0.5 : 1 }}>
                    <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '12px' }}>CONFIDENCE SIGNAL</p>
                    <h1 style={{ fontSize: '36px', fontWeight: 800, color: trustColor, marginTop: 0, marginBottom: '8px' }}>
                        {state.trustLevel}
                    </h1>
                </div>

                {/* ZONE 2: ACTION */}
                <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.05)', padding: '24px', borderRadius: '16px', marginBottom: '32px' }}>
                    <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '8px' }}>REQUIRED OP</p>
                        <p style={{ fontSize: '20px', fontWeight: 700 }}>{state.action}</p>
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '20px' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <p style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '4px' }}>WINDOW OPENS IN</p>
                            <p style={{ fontSize: '14px', fontFamily: 'monospace', color: 'var(--primary)' }}>{timeToNext}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '4px' }}>PRIMARY CAUSE</p>
                            <p style={{ fontSize: '12px', fontWeight: 600 }}>{state.reason}</p>
                        </div>
                    </div>
                </div>

                {/* ZONE 3: INTEGRITY (Gated by Mode) */}
                {!isLocked && (
                    <div style={{ marginBottom: '32px' }}>
                        {state.activeUsers24h === 0 && <OpsAlert title="NO TRAFFIC" type="danger">System idling.</OpsAlert>}
                        {state.contamination > 0 && <OpsAlert title="CONTAMINATION" type="danger">{state.contamination} exposed users.</OpsAlert>}
                        {state.biasRatio > 0.3 && <OpsAlert title="BIAS DETECTED" type="warning">Intervention ratio exceeds tolerance.</OpsAlert>}
                    </div>
                )}

                {isLocked && <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>Telemetry masked while signal unstable.</p>}

                {/* ZONE 4: TECHNICAL (Semantic Masking) */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px', marginTop: '40px' }}>
                    <button
                        onClick={() => setShowTechnical(!showTechnical)}
                        disabled={isLocked}
                        style={{ background: 'none', border: 'none', color: isLocked ? 'var(--bg2)' : 'var(--muted)', fontSize: '10px', cursor: isLocked ? 'not-allowed' : 'pointer', width: '100%', textTransform: 'uppercase' }}
                    >
                        {isLocked ? 'TELEMETRY LOCKED' : (showTechnical ? 'CLOSE TELEMETRY' : 'OPEN TELEMETRY')}
                    </button>

                    {showTechnical && !isLocked && (
                        <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {/* In OBSERVE mode, use semantic labels. In INTERPRET, use numbers. */}
                            <Property label="VALID N" value={canInterpret ? state.validSample.toString() : getSemanticSample(state.validSample)} />
                            <Property label="EFFECT N" value={canInterpret ? state.effectiveN.toString() : getSemanticSample(state.effectiveN)} />
                            <Property label="CANDIDATES" value={state.candidatesN.toString()} />
                            <Property label="BIAS" value={canInterpret ? `${(state.biasRatio * 100).toFixed(1)}%` : getSemanticBias(state.biasRatio)} />

                            <div style={{ gridColumn: 'span 2', marginTop: '12px' }}>
                                <Property label="STATE" value={state.lastDigestAt ? 'OBSERVED' : 'PENDING'} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Page>
    );
}
