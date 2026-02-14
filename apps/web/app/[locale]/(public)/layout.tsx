import { TopNav } from '../../../components/layout/TopNav';
import { Footer } from '../../../components/layout/Footer';

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500/30">
            <TopNav />
            {/* Increased top padding for sticky header spacing */}
            <main className="mx-auto w-full max-w-6xl px-4 py-10 flex-grow">
                {children}
            </main>
            <Footer />
        </div>
    );
}
