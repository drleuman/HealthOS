'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ALL = ['bloating','reflux','constipation_or_diarrhea','post_meal_crash','wake_3am','brain_fog','sugar_cravings','irritability'];

export default function Symptoms() {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>(['wake_3am','brain_fog']);

  function toggle(s: string){
    setSel(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev, s].slice(0,3));
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h2>Síntomas (elige hasta 3)</h2>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {ALL.map(s => (
          <button key={s} onClick={()=>toggle(s)} style={{ padding:'6px 10px', border:'1px solid #ccc', background: sel.includes(s)?'#eee':'#fff' }}>
            {s}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={()=>{
          sessionStorage.setItem('symptoms', JSON.stringify(sel));
          router.push('/app/onboarding/context');
        }}>Continuar</button>
      </div>
    </main>
  );
}
