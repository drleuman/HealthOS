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
    const t = useTranslations('Dashboard');
    const links = [
        { label: t('active_protocols'), path: '/app/today' },
        { label: t('history'), path: '/app/route' },
    ];

    return (
        <header className="topbar">
            <div className="container topbar-content">
                <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold tracking-tight text-primary">HealthOS</div>
                    <div className="text-[10px] text-secondary font-mono tracking-wider opacity-60">SISTEMA DISPONIBLE</div>
                </div>

                <nav className="flex items-center gap-2">
                    {links.map(link => (
                        <a
                            key={link.path}
                            href={link.path}
                            className={`nav-link ${currentPath === link.path ? 'active' : ''}`}
                        >
                            {link.label}
                        </a>
                    ))}
                    {onLogout && (
                        <button
                            onClick={onLogout}
                            className="nav-link opacity-60 hover:opacity-100"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                            {t('logout')}
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
        <div className="alert alert-neutral">
            <div className="alert-content">
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>{t('context_info')}</span>
                <div style={{ fontSize: '14px', lineHeight: 1.5 }}>{children}</div>
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
