'use client';
import { useEffect, useState } from 'react';

export default function Tool({ params }: { params: { slug: string } }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_ORIGIN || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
    fetch(baseUrl + `/auth/sso-token?tool=${encodeURIComponent(params.slug)}`, {
      headers: { 'X-User-Email': 'test@example.com' }
    }).then(r => r.json()).then(d => setUrl(d.redirect_url));
  }, [params.slug]);

  if (!url) return <main style={{ padding: 24 }}>Preparando acceso…</main>;

  return (
    <main style={{ padding: 24 }}>
      <p>Redirigiendo a Mithohacks…</p>
      <a href={url}>Continuar</a>
      <script dangerouslySetInnerHTML={{ __html: `window.location.href=${JSON.stringify(url)};` }} />
    </main>
  );
}
