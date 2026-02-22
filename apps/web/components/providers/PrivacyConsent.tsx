'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export function PrivacyConsent() {
    const t = useTranslations('App.Privacy');
    const [show, setShow] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('healthos_consent_v1');
        if (!consent) {
            setShow(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('healthos_consent_v1', 'accepted');
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-100">{t('title')}</h4>
                        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                            {t('body')}
                        </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <button
                            onClick={handleAccept}
                            className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-900 transition-colors hover:bg-white"
                        >
                            {t('accept')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
