'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Result() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const payload = {
      primary_goal: sessionStorage.getItem('primary_goal') || 'sleep',
      sleep_issue_type: JSON.parse(sessionStorage.getItem('sleep_issue_type') || '[]'),
      low_energy_window: sessionStorage.getItem('low_energy_window') || 'morning',
      bedtime: sessionStorage.getItem('bedtime') || '00:30',
      caffeine_time: sessionStorage.getItem('caffeine_time') || '07:30',
      dinner_time: sessionStorage.getItem('dinner_time') || '22:15',
      symptoms: JSON.parse(sessionStorage.getItem('symptoms') || '[]'),
      constraints: JSON.parse(sessionStorage.getItem('constraints') || '[]'),
    };

    const baseUrl = process.env.NEXT_PUBLIC_API_ORIGIN || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
    fetch(baseUrl + '/assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Email': 'test@example.com' },
      body: JSON.stringify(payload),
    }).then(r => r.json()).then(setData).catch(() => setData({ error: true }));
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 640 }}>
      <h2>Tu Ruta Personal</h2>
      {!data && <p>Generando…</p>}
      {data?.error && <p>Error generando. Revisa API.</p>}
      {data && !data.error && (
        <>
          <p><b>Perfil:</b> {data.profile_type}</p>
          <p><b>Programa:</b> {data.program_id}</p>
          <Link href="/app/today">Empezar</Link>
        </>
      )}
    </main>
  );
}
