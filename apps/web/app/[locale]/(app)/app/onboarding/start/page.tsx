'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  {
    id: 'sueño',
    title: 'Sueño',
    description: 'Optimiza tu descanso y mejora la calidad de tu sueño para recuperarte mejor.',
    gradient: 'from-[#6366f1] to-[#8b5cf6]',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    )
  },
  {
    id: 'energía',
    title: 'Energía',
    description: 'Aumenta tus niveles de energía durante el día y reduce la fatiga crónica.',
    gradient: 'from-[#f59e0b] to-[#f97316]',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    id: 'digestión',
    title: 'Digestión',
    description: 'Mejora tu salud intestinal y optimiza la absorción de nutrientes.',
    gradient: 'from-[#10b981] to-[#06b6d4]',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    )
  },
  {
    id: 'estrés',
    title: 'Estrés',
    description: 'Gestiona mejor el estrés y encuentra el equilibrio emocional.',
    gradient: 'from-[#ec4899] to-[#f43f5e]',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    id: 'peso',
    title: 'Peso',
    description: 'Alcanza tu peso ideal de forma saludable y sostenible.',
    gradient: 'from-[#3b82f6] to-[#06b6d4]',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    )
  },
  {
    id: 'rendimiento',
    title: 'Rendimiento',
    description: 'Maximiza tu rendimiento físico y mental en todas las áreas.',
    gradient: 'from-[#8b5cf6] to-[#d946ef]',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    )
  }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  const selectOption = (option: string) => {
    setSelected(option);
    setTimeout(() => {
      router.push('/app/onboarding');
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-transparent">
      <style dangerouslySetInnerHTML={{
        __html: `
        .feature-card {
            background: rgba(30, 41, 59, 0.6);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 20px;
            padding: 2rem;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            text-align: left;
        }

        .feature-card::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 20px;
            padding: 1px;
            background: linear-gradient(135deg, transparent 40%, rgba(99, 102, 241, 0.3) 50%, transparent 60%);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            opacity: 0;
            transition: opacity 0.4s ease;
        }

        .feature-card::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                rgba(99, 102, 241, 0.15), 
                transparent 40%);
            opacity: 0;
            transition: opacity 0.4s ease;
            pointer-events: none;
        }

        .feature-card:hover {
            transform: translateY(-8px);
            border-color: rgba(99, 102, 241, 0.3);
            box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5),
                        0 0 30px -10px rgba(99, 102, 241, 0.2);
        }

        .feature-card.selected {
            border-color: rgba(99, 102, 241, 0.6);
            box-shadow: 0 0 30px -5px rgba(99, 102, 241, 0.3);
        }

        .feature-card:hover::before,
        .feature-card:hover::after,
        .feature-card.selected::before,
        .feature-card.selected::after {
            opacity: 1;
        }

        .card-icon-container {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem;
            position: relative;
            z-index: 1;
            box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .feature-card:hover .card-icon-container,
        .feature-card.selected .card-icon-container {
            transform: scale(1.1) rotate(-5deg);
            box-shadow: 0 15px 35px -5px rgba(99, 102, 241, 0.6);
        }

        .card-icon-container svg {
            width: 28px;
            height: 28px;
            color: white;
        }

        .card-arrow {
            position: absolute;
            top: 2rem;
            right: 2rem;
            width: 32px;
            height: 32px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transform: translateX(-10px);
            transition: all 0.3s ease;
        }

        .feature-card:hover .card-arrow,
        .feature-card.selected .card-arrow {
            opacity: 1;
            transform: translateX(0);
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .animate-card {
            animation: fadeInUp 0.6s ease backwards;
        }
      `}} />

      <div className="max-w-[1200px] w-full text-center">
        <h1 className="text-[#f8fafc] text-3xl md:text-4xl font-semibold mb-12 tracking-tight">
          ¿Qué quieres mejorar primero?
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {CATEGORIES.map((cat, idx) => (
            <div
              key={cat.id}
              className={`feature-card animate-card ${selected === cat.id ? 'selected' : ''}`}
              style={{ animationDelay: `${0.1 * (idx + 1)}s` }}
              onMouseMove={handleMouseMove}
              onClick={() => selectOption(cat.id)}
            >
              <div className={`card-icon-container bg-gradient-to-br ${cat.gradient}`}>
                {cat.icon}
              </div>

              <div className="relative z-10">
                <h3 className="text-[#f1f5f9] text-xl font-semibold mb-2 flex items-center gap-2">
                  {cat.title}
                </h3>
                <p className="text-[#94a3b8] text-sm leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="card-arrow">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4 text-[#6366f1]">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

