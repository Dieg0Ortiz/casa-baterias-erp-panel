'use client';

import { useEffect, useState } from 'react';
import { IconSun, IconMoon } from './Icons';

export function ThemeToggle({
  className,
  estilo = 'completo',
}: {
  className?: string;
  estilo?: 'completo' | 'icono' | 'sidebar';
}) {
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
    if (estilo === 'sidebar') {
      return <div style={{ height: '28px' }} />;
    }
    return null;
  }

  const esOscuro = tema === 'dark';

  if (estilo === 'sidebar') {
    return (
      <button
        type="button"
        onClick={alternar}
        className={className}
        title={esOscuro ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 4px',
          background: 'transparent',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.background = 'var(--surface-container)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {esOscuro ? (
          <IconSun style={{ width: '16px', height: '16px', color: '#fbbf24', flexShrink: 0 }} />
        ) : (
          <IconMoon style={{ width: '16px', height: '16px', color: 'var(--text-secondary)', flexShrink: 0 }} />
        )}
        <span>{esOscuro ? 'Modo Claro' : 'Modo Oscuro'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className={className}
      title={esOscuro ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
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
        <IconSun style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
      ) : (
        <IconMoon style={{ width: '14px', height: '14px', color: 'var(--primary)' }} />
      )}
      {estilo === 'completo' && <span>{esOscuro ? 'Modo Claro' : 'Modo Oscuro'}</span>}
    </button>
  );
}
