import { ReactNode } from 'react';
import { TopNav } from './TopNav';
import { Footer } from './Footer';

export function PublicShell({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500/30">
            <TopNav />
            {children}
            <Footer />
        </div>
    );
}
