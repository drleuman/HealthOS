import { ReactNode } from 'react';
import { AppHeader } from './AppHeader';

export function AppShell({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500/30">
            <AppHeader />
            <main className="mx-auto max-w-2xl px-4 py-8 animate-fade">
                {children}
            </main>
        </div>
    );
}
