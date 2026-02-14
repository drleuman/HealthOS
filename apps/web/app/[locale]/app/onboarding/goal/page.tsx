'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Goal() {
  const sp = useSearchParams();
  const router = useRouter();
  const g = sp.get('g') || 'sleep';
  const [sleepType, setSleepType] = useState<string>('wake_3am');

  function next() {
    sessionStorage.setItem('primary_goal', g);
    sessionStorage.setItem('sleep_issue_type', JSON.stringify([sleepType]));
    router.push('/app/onboarding/energy');
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h2>Tu objetivo: {g}</h2>
      <p>¿Qué te describe mejor?</p>
      <select value={sleepType} onChange={(e)=>setSleepType(e.target.value)}>
        <option value="sleep_onset">Me cuesta dormirme</option>
        <option value="wake_3am">Me despierto 3–4am</option>
        <option value="wake_often">Me despierto muchas veces</option>
        <option value="wake_tired">Me despierto cansado</option>
      </select>
      <div style={{ marginTop: 16 }}>
        <button onClick={next}>Continuar</button>
      </div>
    </main>
  );
}
