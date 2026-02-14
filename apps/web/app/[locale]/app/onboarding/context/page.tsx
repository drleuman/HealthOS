'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ALL = ['shiftwork','kids','pregnancy','vegan','late_training','travel','meds_sleep'];

export default function Context() {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>([]);

  function toggle(s: string){
    setSel(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev, s]);
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h2>Contexto</h2>
      <p>¿Algo de esto aplica?</p>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {ALL.map(s => (
          <button key={s} onClick={()=>toggle(s)} style={{ padding:'6px 10px', border:'1px solid #ccc', background: sel.includes(s)?'#eee':'#fff' }}>
            {s}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={()=>{
          sessionStorage.setItem('constraints', JSON.stringify(sel));
          router.push('/app/onboarding/result');
        }}>Generar mi ruta</button>
      </div>
    </main>
  );
}
