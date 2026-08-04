'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { logout, useSesion } from '@/lib/auth';
import styles from './home.module.css';

export default function HomePage() {
  const router = useRouter();
  const { autenticado, perfil } = useSesion();

  useEffect(() => {
    if (!autenticado) router.replace('/login');
  }, [autenticado, router]);

  if (!autenticado) return null;

  function salir() {
    logout();
    router.replace('/login');
    router.refresh();
  }

  if (perfil?.rol !== 'administrador') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1>Acceso restringido</h1>
          <p>
            Este panel es solo para administradores. Tu usuario tiene el rol{' '}
            <strong>trabajador</strong> y debe usar la app de ventas.
          </p>
          <button className={styles.button} onClick={salir}>
            Salir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Casa Baterías</h1>
          <p>Panel de administración — {perfil.nombre_completo}</p>
        </div>
        <button className={styles.linkButton} onClick={salir}>
          Salir
        </button>
      </header>

      <main className={styles.main}>
        <h2>Resumen</h2>
        <div className={styles.grid}>
          <Link href="/catalogo" className={styles.cardLink}>
            <div className={styles.card}>
              <h3>Catálogo</h3>
              <p>Marcas, productos, precios y bajas.</p>
            </div>
          </Link>
          <div className={styles.card}>
            <h3>Sucursales</h3>
            <p>Gestión y consulta de sucursales.</p>
          </div>
          <div className={styles.card}>
            <h3>Ventas</h3>
            <p>Consulta de ventas de todas las sucursales.</p>
          </div>
          <Link href="/inventario" className={styles.cardLink}>
            <div className={styles.card}>
              <h3>Inventario</h3>
              <p>Existencias por sucursal y transferencias.</p>
            </div>
          </Link>
          <div className={styles.card}>
            <h3>Caja</h3>
            <p>Cortes de caja y diferencias.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
