'use client';

import { useEffect, useState } from 'react';
import { IconSun, IconMoon } from './Icons';

export function ThemeToggle({ className, estilo = 'completo' }: { className?: string; estilo?: 'completo' | 'icono' }) {
  const [tema, setTema] = useState<'light' | 'dark'>('light');
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    const guardado = (localStorage.getItem('cb_theme') as 'light' | 'dark') || 'light';
    setTema(guardado);
    document.documentElement.setAttribute('data-theme', guardado);
  }, []);

  function alternar() {
    const nuevo = tema === 'light' ? 'dark' : 'light';
    setTema(nuevo);
    localStorage.setItem('cb_theme', nuevo);
    document.documentElement.setAttribute('data-theme', nuevo);
  }

  if (!montado) {
    return (
      <button
        type="button"
        style={{
          background: 'none',
          border: '1px solid var(--outline-variant)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 10px',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          opacity: 0.5,
        }}
        disabled
      >
        <IconMoon style={{ width: '14px', height: '14px' }} />
        {estilo === 'completo' && <span>Tema</span>}
      </button>
    );
  }

  const esOscuro = tema === 'dark';

  return (
    <button
      type="button"
      onClick={alternar}
      className={className}
      title={esOscuro ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro (Indigo Midnight)'}
      style={{
        background: esOscuro ? 'rgba(129, 140, 248, 0.12)' : 'var(--surface-container-low)',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-sm)',
        padding: '6px 10px',
        color: esOscuro ? 'var(--primary)' : 'var(--text-primary)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        fontWeight: 600,
        transition: 'all 0.2s ease',
      }}
    >
      {esOscuro ? (
        <>
          <IconSun style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
          {estilo === 'completo' && <span>Modo Claro</span>}
        </>
      ) : (
        <>
          <IconMoon style={{ width: '14px', height: '14px', color: 'var(--primary)' }} />
          {estilo === 'completo' && <span>Indigo Midnight</span>}
        </>
      )}
    </button>
  );
}
