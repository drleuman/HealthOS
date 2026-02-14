import { AppHeader } from '../../../../components/layout/AppHeader';

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <AppHeader />
            <main className="mx-auto max-w-2xl px-4 py-8">
                {children}
            </main>
        </div>
    );
}
