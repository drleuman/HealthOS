'use client';
import { useTranslations } from 'next-intl';

export default function CommunityIndex() {
    const t = useTranslations('Public.Landing.ecosystem');

    return (
        <div className="text-center py-20 px-4">
            <h1 className="text-2xl font-bold text-slate-100 mb-4">{t('tabs.community')}</h1>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Accede a las discusiones, comparte tus observaciones y aprende de otros usuarios.
                <br /><br />
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-600">
                    Solo para miembros registrados
                </span>
            </p>

            <a
                href="/app/today"
                className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
                Entrar a la Comunidad
            </a>
        </div>
    );
}
