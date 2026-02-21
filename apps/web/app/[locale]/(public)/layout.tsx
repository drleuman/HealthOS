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
            {/*
              P1-6: El <main> ya NO constraina el ancho con max-w-6xl.
              Cada sección de la landing (HeroBlock, EcosystemTabs, etc.)
              controla su propio max-w internamente (max-w-4xl / max-w-7xl),
              lo que permite secciones full-bleed (TrustStrip, EcosystemTabs)
              a la vez que secciones más estrechas (GoalSelector, FinalCTA).
              El id="main-content" activa el skip link de accesibilidad.
            */}
            <main id="main-content" className="w-full flex-grow">
                {children}
            </main>
            <Footer />
        </div>
    );
}
