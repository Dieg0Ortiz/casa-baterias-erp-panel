'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { login } from '@/lib/auth';
import { ApiError } from '@/lib/api';
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
          <span className={styles.brandIcon}>⚡</span>
          <h1>Casa Baterías</h1>
          <p>Panel de administración</p>
        </div>

        <label className={styles.field}>
          <span>Correo</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@erp.local"
          />
        </label>

        <label className={styles.field}>
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.button} disabled={cargando}>
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
