'use client';

import { useEffect, type ReactNode } from 'react';
import { IconClose } from '@/components/Icons';
import styles from './creditos.module.css';

// Modal base de la sección de créditos: centrado y con el scroll de la página
// bloqueado mientras está abierto.
export function Modal({
  titulo,
  icono,
  onCerrar,
  children,
  maxWidth = '580px',
}: {
  titulo: ReactNode;
  icono?: ReactNode;
  onCerrar: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className={styles.overlay} onClick={onCerrar}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {icono}
            {typeof titulo === 'string' ? <h3>{titulo}</h3> : titulo}
          </div>
          <button type="button" className={styles.closeBtn} onClick={onCerrar} aria-label="Cerrar">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
