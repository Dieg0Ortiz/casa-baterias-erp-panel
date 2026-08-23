/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { login } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { IconBolt } from '@/components/Icons';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Escribe tu correo y contraseña');
      return;
    }
    setCargando(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo conectar con el servidor. Intenta de nuevo.',
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={entrar}>
        <div className={styles.brand}>
          <div className={styles.brandIconWrapper}>
            <IconBolt style={{ width: '24px', height: '24px' }} />
          </div>
          <h1 className={styles.brandTitle}>Casa Baterías</h1>
          <p className={styles.brandSubtitle}>Panel de administración central</p>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Correo Electrónico</span>
          <input
            className={styles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@erp.local"
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Contraseña</span>
          <input
            className={styles.input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.button} disabled={cargando}>
          {cargando ? 'Iniciando sesión…' : 'Acceder al Panel'}
        </button>

        <p className={styles.footerInfo}>
          Acceso restringido para el titular y administradores
        </p>
      </form>
    </div>
  );
}
