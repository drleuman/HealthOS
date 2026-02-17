'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

/**
 * Page - Root wrapper for every screen
 */
export const Page = ({ children }: { children: React.ReactNode }) => (
    <div className="page">{children}</div>
);

/**
 * Topbar - Global navigation
 */
export const Topbar = ({
    onLogout,
    currentPath
}: {
    onLogout?: () => void;
    currentPath: string;
}) => {
    const t = useTranslations('App.Nav');
    const links = [
        {
            label: t('protocols'),
            path: '/app/today',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m-15 0a2.25 2.25 0 00-1.5 2.122v.878m15 0a2.25 2.25 0 011.5 2.122v.878m-15 0A2.25 2.25 0 001.5 18v.878m15 0a2.25 2.25 0 011.5 2.122v.878m-15 0a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25v-.878m-12 0c.235.083.487.128.75.128h10.5c.263 0 .515-.045.75-.128" />
                </svg>
            )
        },
        {
            label: t('history'),
            path: '/app/route',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
    ];

    return (
        <header className="topbar">
            <div className="container topbar-content">
                <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold tracking-tight text-primary">HealthOS</div>
                    <div className="text-[10px] text-secondary font-mono tracking-wider opacity-60">
                        {useTranslations('Components.Ambient')('status_ready')}
                    </div>
                </div>

                <nav className="flex items-center gap-2">
                    {links.map(link => (
                        <a
                            key={link.path}
                            href={link.path}
                            className={`nav-link flex items-center gap-1.5 ${currentPath === link.path ? 'active' : ''}`}
                        >
                            {link.icon}
                            <span>{link.label}</span>
                        </a>
                    ))}
                    {onLogout && (
                        <button
                            onClick={onLogout}
                            className="btn btn-ghost p-1.5 opacity-60 hover:opacity-100 transition-opacity"
                            title="Sign out"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                        </button>
                    )}
                </nav>
            </div>
        </header>
    );
};

/**
 * Shell - Main content area
 */
export const Shell = ({ children, title, description, right }: {
    children: React.ReactNode;
    title?: string;
    description?: string;
    right?: React.ReactNode;
}) => (
    <main className="shell">
        <div className="container">
            {(title || right) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                    <div>
                        {title && <h1>{title}</h1>}
                        {description && <p style={{ marginTop: '4px', opacity: 0.6 }}>{description}</p>}
                    </div>
                    {right && <div>{right}</div>}
                </div>
            )}
            {children}
        </div>
    </main>
);

/**
 * Card - Glassmorphic container
 */
export const Card = ({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
    <div className={`card ${className}`} style={style}>{children}</div>
);

/**
 * Button - Specialized variants
 */
export const Button = ({
    onClick,
    children,
    variant = 'primary',
    disabled = false,
    type = 'button',
    className = "",
    style = {}
}: {
    onClick?: () => void;
    children: React.ReactNode;
    variant?: 'primary' | 'ghost' | 'danger';
    disabled?: boolean;
    type?: 'button' | 'submit';
    className?: string;
    style?: React.CSSProperties;
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`btn btn-${variant} ${className}`}
        style={style}
    >
        {children}
    </button>
);

/**
 * Input - Standard text input
 */
export const Input = ({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    required = false
}: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
}) => (
    <div className="input-group">
        <label className="label">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="input"
            required={required}
        />
    </div>
);

/**
 * Select - Standard dropdown
 */
export const Select = ({
    label,
    value,
    onChange,
    options,
    required = false
}: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: { label: string; value: string }[];
    required?: boolean;
}) => (
    <div className="input-group">
        <label className="label">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="select"
            required={required}
        >
            <option value="" disabled>{useTranslations('Components.Select')('placeholder')}</option>
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

/**
 * Badge - Small visual indicators
 */
export const Badge = ({ children }: { children: React.ReactNode }) => (
    <span className="badge">{children}</span>
);

/**
 * Alert - For feedback or interventions
 */
export const Alert = ({
    children
}: {
    type?: 'clarify' | 'reduce' | 're_engage' | 'reframe';
    title: string;
    children: React.ReactNode;
}) => {
    const t = useTranslations('Components.Alert');
    return (
        <div className="alert alert-neutral flex gap-3 items-start">
            <div className="mt-0.5 shrink-0 opacity-40">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-3m0 0l2.25 2.25M12 15l-2.25 2.25M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9zM12 8.25v.008H12V8.25z" />
                </svg>
            </div>
            <div className="alert-content flex-grow">
                <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1.5 block">{t('context_info')}</span>
                <div className="text-sm leading-relaxed text-slate-200">{children}</div>
            </div>
        </div>
    );
};

/**
 * Property - Technical system property indicator (Not instructions)
 */
export const Property = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', opacity: 0.4, fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <span>[{label}]</span>
        <span>{value}</span>
    </div>
);

/**
 * StickyCTA - Fixed action button at bottom
 */
export const StickyCTA = ({ children }: { children: React.ReactNode }) => (
    <div className="sticky-cta">
        <div className="container" style={{ padding: 0 }}>
            {children}
        </div>
    </div>
);
