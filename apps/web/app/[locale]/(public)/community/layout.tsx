'use client';

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-slate-950 text-slate-100 min-h-full">
            <main className="mx-auto max-w-4xl px-4 py-8">
                {children}
            </main>
        </div>
    );
}
