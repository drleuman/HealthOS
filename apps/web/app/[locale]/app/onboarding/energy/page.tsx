'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Energy() {
  const router = useRouter();
  const [win, setWin] = useState('morning');

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h2>Energía</h2>
      <p>¿Cuándo te sientes peor?</p>
      <select value={win} onChange={(e)=>setWin(e.target.value)}>
        <option value="morning">Mañana</option>
        <option value="post_lunch">Después de comer</option>
        <option value="afternoon">Tarde</option>
        <option value="evening">Noche</option>
        <option value="all_day">Todo el día</option>
      </select>

      <div style={{ marginTop: 16 }}>
        <button onClick={()=>{
          sessionStorage.setItem('low_energy_window', win);
          router.push('/app/onboarding/habits');
        }}>Continuar</button>
      </div>
    </main>
  );
}
