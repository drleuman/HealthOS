'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Habits() {
  const router = useRouter();
  const [bedtime, setBedtime] = useState('00:30');
  const [caffeine, setCaffeine] = useState('07:30');
  const [dinner, setDinner] = useState('22:15');

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h2>Hábitos</h2>
      <label>Hora de acostarte<br/><input value={bedtime} onChange={(e)=>setBedtime(e.target.value)} /></label><br/><br/>
      <label>Primer café<br/><input value={caffeine} onChange={(e)=>setCaffeine(e.target.value)} /></label><br/><br/>
      <label>Hora de cenar<br/><input value={dinner} onChange={(e)=>setDinner(e.target.value)} /></label><br/><br/>

      <button onClick={()=>{
        sessionStorage.setItem('bedtime', bedtime);
        sessionStorage.setItem('caffeine_time', caffeine);
        sessionStorage.setItem('dinner_time', dinner);
        router.push('/app/onboarding/symptoms');
      }}>Continuar</button>
    </main>
  );
}
