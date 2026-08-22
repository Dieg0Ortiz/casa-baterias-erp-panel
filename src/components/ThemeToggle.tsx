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
      return (
        <div
          style={{
            width: '100%',
            height: '34px',
            background: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--outline-variant)',
            opacity: 0.5,
          }}
        />
      );
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
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'var(--surface-container-low)',
          border: '1px solid var(--outline-variant)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {esOscuro ? (
            <IconSun style={{ width: '15px', height: '15px', color: '#fbbf24' }} />
          ) : (
            <IconMoon style={{ width: '15px', height: '15px', color: 'var(--primary)' }} />
          )}
          <span>{esOscuro ? 'Modo Claro' : 'Modo Oscuro'}</span>
        </div>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'var(--surface-container-high)',
            color: esOscuro ? 'var(--primary)' : 'var(--text-muted)',
          }}
        >
          {esOscuro ? 'Oscuro' : 'Claro'}
        </span>
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
