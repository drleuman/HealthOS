'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export function AmbientAnchor() {
    const t = useTranslations('Components.Ambient');
    const MESSAGES = [
        t('msg_1'),
        t('msg_2'),
        t('msg_3')
    ];

    const [offset, setOffset] = useState(0);
    const [msgIndex, setMsgIndex] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Deterministic rotation based on current date (YYYY-MM-DD)
        // This ensures the anchor is stable within a day but varies across days
        // preventing habituation without triggering cognitive vigilance via randomness
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

        // Simple hash function for the date string
        let hash = 0;
        for (let i = 0; i < dateStr.length; i++) {
            hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }

        const absoluteHash = Math.abs(hash);

        // Select message based on day
        setMsgIndex(absoluteHash % MESSAGES.length);

        // Select offset based on day (-2px to +2px)
        // We use a different modulo to decouple message from position slightly, 
        // though both change daily.
        setOffset((absoluteHash % 5) - 2);

        setMounted(true);
    }, []);

    // Default render for SSR/Initial mount to prevent hydration mismatch
    // (Renders first message, 0 offset)
    const displayIndex = mounted ? msgIndex : 0;
    const displayOffset = mounted ? offset : 0;

    return (
        <div style={{
            marginTop: 'auto',
            paddingTop: '40px',
            paddingBottom: '20px',
            textAlign: 'center',
            transform: `translateY(${displayOffset}px)`
        }}>
            <small className="meta" style={{ opacity: 0.3, fontSize: '10px' }}>
                {MESSAGES[displayIndex]}
            </small>
        </div>
    );
}
