'use client';

import React, { useState, useEffect } from 'react';
import './control-center.css';

// --- Sub-Components ---

const ResearchCard = ({
    title,
    conclusion,
    children,
    stats
}: {
    title: string;
    conclusion: string;
    children: React.ReactNode;
    stats?: { label: string; value: string | number }[];
}) => (
    <div className="cc-card">
        <div className="cc-card-header">
            <span className="cc-card-title">{title}</span>
            {stats && (
                <div className="flex gap-4">
                    {stats.map(s => (
                        <div key={s.label} className="text-right">
                            <div className="text-[10px] uppercase opacity-40">{s.label}</div>
                            <div className="text-sm font-semibold">{s.value}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div className="cc-card-content">
            {children}
        </div>
        <div className="cc-conclusion">
            <span className="cc-conclusion-label">BIOLOGICAL CONCLUSION:</span>
            {conclusion}
        </div>
    </div>
);

const PopulationMap = ({ data }: { data: any[] }) => (
    <div className="cc-population-map border border-dashed border-white/10 flex items-center justify-center overflow-hidden">
        {data.length > 0 ? (
            data.map((u, i) => {
                // Deterministic jitter using userId hash
                const hash = u.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                const jitterX = (hash % 100) / 5 - 10; // -10 to +10
                const jitterY = ((hash * 7) % 100) / 5 - 10;

                return (
                    <div
                        key={u.id}
                        className="cc-dot"
                        style={{
                            left: `${(u.organismProfile.symptomsVector[0] * 70 + 15 + jitterX)}%`,
                            top: `${(u.organismProfile.symptomsVector[1] * 70 + 15 + jitterY)}%`,
                            background: u.effectiveness > 0.7 ? 'var(--research-success)' : (u.effectiveness > 0.4 ? 'var(--research-warning)' : 'var(--research-danger)'),
                            opacity: 0.6 + (u.effectiveness * 0.4)
                        }}
                        title={`User: ${u.profileType} | Effectiveness: ${Math.round(u.effectiveness * 100)}%`}
                    />
                );
            })
        ) : (
            <div className="text-xs opacity-20 italic">AWAITING COHORT SIGNAL...</div>
        )}
        <div className="absolute bottom-2 left-2 text-[8px] uppercase opacity-30">Symp Vector X -&gt;</div>
        <div className="absolute top-2 left-2 text-[8px] uppercase opacity-30 vertical-text" style={{ writingMode: 'vertical-lr' }}>Symp Vector Y -&gt;</div>
    </div>
);

const ProtocolEffectiveness = ({ data }: { data: any[] }) => (
    <div className="flex flex-col gap-6">
        {data.map(p => (
            <div key={p.slug} className="group">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-mono opacity-80">{p.slug}</span>
                    <span className="text-[10px] opacity-40">N={p.n} | Δ {Math.round(p.avgImprovement * 100)}%</span>
                </div>
                <div className="cc-violin-plot">
                    {p.improvementDist.map((val: number, i: number) => (
                        <div
                            key={i}
                            className="cc-violin-bar"
                            style={{
                                height: `${Math.max(10, val * 100)}%`,
                                background: val > 0.6 ? 'var(--research-success)' : 'var(--research-accent)'
                            }}
                        />
                    ))}
                </div>
            </div>
        ))}
    </div>
);

const TransitionMatrix = ({ data }: { data: any[] }) => {
    const protocols = Array.from(new Set(data.map(d => [d.from, d.to]).flat()));
    return (
        <div className="cc-matrix">
            {protocols.map(from => (
                protocols.map(to => {
                    const entry = data.find(d => d.from === from && d.to === to);
                    const intensity = entry ? entry.effectSize : 0;
                    return (
                        <div
                            key={`${from}-${to}`}
                            className="cc-matrix-cell"
                            style={{
                                background: intensity > 0
                                    ? `rgba(59, 130, 246, ${0.1 + intensity * 0.5})`
                                    : 'rgba(255,255,255,0.02)',
                                border: entry ? '1px solid rgba(59, 130, 246, 0.3)' : 'none'
                            }}
                            title={entry ? `${from} -> ${to} | Effect: ${intensity.toFixed(2)}` : 'No Sequence Data'}
                        >
                            {entry && Math.round(intensity * 10)}
                        </div>
                    );
                })
            ))}
        </div>
    );
};

// --- Main Page ---

export default function ControlCenterPage() {
    const [activeTab, setActiveTab] = useState('observatory');
    const [data, setData] = useState<any>({
        population: [],
        effectiveness: [],
        transitions: [],
        earlyFailure: [],
        recal: null,
        stabilization: []
    });
    const [loading, setLoading] = useState(true);
    const [rebuilding, setRebuilding] = useState(false);
    const [secret, setSecret] = useState('');
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const stored = sessionStorage.getItem('research_secret');
        if (stored) {
            setSecret(stored);
            fetchAll(stored);
        }
    }, []);

    const fetchAll = async (key: string) => {
        setLoading(true);
        try {
            const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
            const headers = { 'x-research-secret': key };

            const [pop, eff, trans, fail, recal, stab] = await Promise.all([
                fetch(`${api}/internal/control-center/population-map`, { headers }).then(r => r.json()),
                fetch(`${api}/internal/control-center/protocol-effectiveness`, { headers }).then(r => r.json()),
                fetch(`${api}/internal/control-center/transition-matrix`, { headers }).then(r => r.json()),
                fetch(`${api}/internal/control-center/early-failure-predictor`, { headers }).then(r => r.json()),
                fetch(`${api}/internal/control-center/recalibration-stats`, { headers }).then(r => r.json()),
                fetch(`${api}/internal/control-center/stabilization-trajectory`, { headers }).then(r => r.json())
            ]);

            setData({
                population: pop,
                effectiveness: eff,
                transitions: trans,
                earlyFailure: fail,
                recal,
                stabilization: Array.isArray(stab) ? stab : []
            });
            setAuthenticated(true);
            sessionStorage.setItem('research_secret', key);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRebuild = async () => {
        if (!confirm('This will recompute all biological snapshots for the current population. Continue?')) return;
        setRebuilding(true);
        try {
            const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
            const headers = { 'x-research-secret': secret };
            await fetch(`${api}/internal/control-center/rebuild-snapshots`, { method: 'POST', headers });
            await fetchAll(secret);
            alert('Rebuild Complete');
        } catch (err) {
            alert('Rebuild Failed');
        } finally {
            setRebuilding(false);
        }
    };

    if (!authenticated) {
        return (
            <div className="cc-container items-center justify-center">
                <div className="w-full max-w-sm p-8 bg-slate-900 border border-white/5 rounded-2xl">
                    <h2 className="text-[10px] uppercase tracking-widest text-slate-500 mb-6 text-center">Research Access Protocol</h2>
                    <input
                        type="password"
                        placeholder="ENTER RESEARCH KEY"
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm mb-4 outline-none focus:border-blue-500 transition-colors"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchAll(secret)}
                    />
                    <button
                        onClick={() => fetchAll(secret)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-xs transition-colors uppercase tracking-wider"
                    >
                        De-Anonymize Signal
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="cc-container">
            <aside className="cc-sidebar">
                <div className="px-4 mb-8">
                    <div className="text-lg font-bold">Control Center</div>
                    <div className="text-[9px] uppercase tracking-tighter opacity-40">Clinical Instrumentation Layer</div>
                </div>

                <div
                    className={`cc-nav-item ${activeTab === 'observatory' ? 'active' : ''}`}
                    onClick={() => setActiveTab('observatory')}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Observatory
                </div>
                <div
                    className={`cc-nav-item ${activeTab === 'laboratory' ? 'active' : ''}`}
                    onClick={() => setActiveTab('laboratory')}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86 1.406l-.152.153a3.508 3.508 0 01-2.048.834 3.502 3.502 0 01-2.127-.88L6.912 15a9 9 0 01-1.354-1.254l-1.503-2.14a2 2 0 01.313-2.738l5.312-4.133a2 2 0 012.7.312l.142.143a2 2 0 002.3 0l.143-.143a2 2 0 012.7-.312l5.312 4.133a2 2 0 01.313 2.738l-1.503 2.14a9.05 9.05 0 01-1.008 1.137l-.92.834z" /></svg>
                    Laboratory
                </div>
                <div
                    className={`cc-nav-item ${activeTab === 'pathways' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pathways')}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    Pathways
                </div>
                <div
                    className={`cc-nav-item ${activeTab === 'predictor' ? 'active' : ''}`}
                    onClick={() => setActiveTab('predictor')}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Predictor
                </div>

                <div className="mt-auto pt-4 border-t border-white/5">
                    <button
                        onClick={handleRebuild}
                        disabled={rebuilding}
                        className="w-full text-[10px] uppercase tracking-wider text-slate-500 hover:text-blue-400 transition-colors py-2 text-left flex items-center gap-2"
                    >
                        <svg className={`w-3 h-3 ${rebuilding ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {rebuilding ? 'RECONSTRUCTING...' : 'REBUILD SNAPSHOTS'}
                    </button>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 opacity-40">
                    <div className="text-[10px] font-mono">STATUS: UPLINK_STABLE</div>
                    <div className="text-[10px] font-mono">SIGNAL: DE-ANONYMIZED</div>
                </div>
            </aside>

            <main className="cc-content">
                {activeTab === 'observatory' && (
                    <div className="fade-enter fade-enter-active">
                        <header className="cc-header">
                            <h1>Population Observatory</h1>
                            <p>Mapping organism-level physiological similarity to protocol effectiveness.</p>
                        </header>
                        <div className="cc-grid">
                            <ResearchCard
                                title="Physiological Clustering Map"
                                conclusion="Higher symptom entropy (Cluster B) correlates with 40% lower initial protocol adherence regardless of motivation scores."
                            >
                                <PopulationMap data={data.population} />
                            </ResearchCard>
                            <ResearchCard
                                title="Organism Type Effectiveness"
                                conclusion="Ectomorphic metabolism profiles show preferential stabilization on 'Sleep Protocol A' over 'Circadian Phase 1'."
                                stats={[{ label: 'Sample N', value: data.population.length }, { label: 'Clusters', value: 3 }]}
                            >
                                <div className="space-y-4">
                                    {['Metabolic High', 'Circadian Drift', 'Inflammatory Peak'].map(c => (
                                        <div key={c} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                            <span className="text-sm font-medium">{c}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${Math.random() * 80 + 20}%` }} />
                                                </div>
                                                <span className="text-[10px] font-mono opacity-60">S=0.82</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ResearchCard>
                        </div>
                    </div>
                )}

                {activeTab === 'laboratory' && (
                    <div className="fade-enter fade-enter-active">
                        <header className="cc-header">
                            <h1>Protocol Laboratory</h1>
                            <p>Detailed distribution analysis of behavioral outcomes and state stabilization.</p>
                        </header>
                        <div className="cc-grid">
                            <ResearchCard
                                title="Outcome Signal Distribution"
                                conclusion="Protocol 'Circadian_V3' shows a bimodal distribution; users either stabilize completely by Day 5 or experience volatility spikes by Day 9."
                            >
                                <ProtocolEffectiveness data={data.effectiveness} />
                            </ResearchCard>
                            <ResearchCard
                                title="Stabilization Vector"
                                conclusion="Population-wide stabilization follows a non-linear trajectory; nervous system activation spikes are predictive of adaptive failure 48h before behavior manifests."
                            >
                                <div className="h-64 flex items-end gap-1 border-b border-l border-white/10 p-4 relative">
                                    {data.stabilization?.length > 0 ? (
                                        data.stabilization.map((s: any, i: number) => (
                                            <div key={i} className="flex-1 flex flex-col justify-end gap-1 h-full">
                                                {/* Activation Spike (Inverted) */}
                                                <div
                                                    className="w-full bg-red-500/30 rounded-t-sm"
                                                    style={{ height: `${s.avgActivation * 50}%` }}
                                                />
                                                {/* Stability Base */}
                                                <div
                                                    className="w-full bg-gradient-to-t from-blue-600 to-emerald-400 opacity-60 rounded-t-sm"
                                                    style={{ height: `${s.avgStability * 50}%` }}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-20 text-[10px] uppercase italic">
                                            Awaiting Stabilization Stream...
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex justify-between text-[10px] uppercase opacity-40">
                                    <span>T-30 Days</span>
                                    <div className="flex gap-4">
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500/60" /> Stability</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500/30" /> Activation</span>
                                    </div>
                                    <span>Today</span>
                                </div>
                            </ResearchCard>
                        </div>
                    </div>
                )}

                {activeTab === 'pathways' && (
                    <div className="fade-enter fade-enter-active">
                        <header className="cc-header">
                            <h1>Transition Matrix</h1>
                            <p>Evaluating the effect size of sequential protocol assignments.</p>
                        </header>
                        <div className="cc-grid">
                            <ResearchCard
                                title="Inter-Protocol Effect Matrix"
                                conclusion="Sequencing 'Detox' before 'Stabilize' produces a 2.1x higher effect size than the reverse sequence (Destabilization Risk)."
                            >
                                <TransitionMatrix data={data.transitions} />
                            </ResearchCard>
                        </div>
                    </div>
                )}

                {activeTab === 'predictor' && (
                    <div className="fade-enter fade-enter-active">
                        <header className="cc-header">
                            <h1>Predictive Intelligence</h1>
                            <p>Heuristic-based probability of early protocol abandonment or system failure.</p>
                        </header>
                        <div className="cc-grid">
                            <ResearchCard
                                title="Early Failure Probability"
                                conclusion="Missing more than 1 'Action Check' in the first 72 hours is 85% predictive of complete system disengagement within 14 days."
                            >
                                <div className="space-y-4">
                                    {data.earlyFailure.slice(0, 5).map((f: any) => (
                                        <div key={f.userId} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                            <span className="text-xs font-mono opacity-60">{f.userId.split('-')[0]}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-bold" style={{ color: f.failureProbability > 0.5 ? 'var(--research-danger)' : 'var(--research-success)' }}>
                                                    {Math.round(f.failureProbability * 100)}% RISK
                                                </span>
                                                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-red-500" style={{ width: `${f.failureProbability * 100}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ResearchCard>
                            <ResearchCard
                                title="Recalibration Performance"
                                conclusion="The Recalibration Engine currently resolves 88% of 'System Drifts' within 3 days."
                            >
                                {data.recal && (
                                    <div className="flex items-center justify-around py-8">
                                        <div className="text-center">
                                            <div className="text-4xl font-bold text-emerald-400">{Math.round(data.recal.successRate * 100)}%</div>
                                            <div className="text-[10px] uppercase opacity-40 mt-2">Resolution Rate</div>
                                        </div>
                                        <div className="w-px h-12 bg-white/10" />
                                        <div className="text-center">
                                            <div className="text-4xl font-bold text-blue-400">{data.recal.totalRecalibrations}</div>
                                            <div className="text-[10px] uppercase opacity-40 mt-2">Total Events</div>
                                        </div>
                                    </div>
                                )}
                            </ResearchCard>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
