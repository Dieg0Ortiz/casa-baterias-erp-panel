'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSesion } from '@/lib/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Compra, listarCompras } from '@/lib/purchases';
import { formatearDinero } from '@/lib/catalogo';
import { ApiError } from '@/lib/api';
import {
  IconBolt,
  IconDashboard,
  IconCatalog,
  IconInventory,
  IconReports,
  IconLogout,
  IconMenu,
  IconCasco,
  IconUsers,
  IconAdd,
} from '@/components/Icons';
import styles from '../catalogo/catalogo.module.css';

export default function ComprasPage() {
  const router = useRouter();
  const { autenticado, perfil } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autenticado) router.replace('/login');
  }, [autenticado, router]);

  useEffect(() => {
    async function load() {
      if (!autenticado || perfil?.rol !== 'administrador') return;
      setCargando(true);
      setError(null);
      try {
        const data = await listarCompras();
        setCompras(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Error al cargar compras');
      } finally {
        setCargando(false);
      }
    }
    void load();
  }, [autenticado, perfil]);

  if (!autenticado) return null;

  if (perfil?.rol !== 'administrador') {
    return (
      <div className={styles.lockedPage}>
        <div className={styles.lockedCard}>
          <h1>Acceso restringido</h1>
          <p>Este panel es solo para administradores.</p>
          <Link href="/" className={styles.btnPrimarySm}>Volver</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {menuAbierto && (
        <div
          className={styles.sidebarBackdrop}
          onClick={() => setMenuAbierto(false)}
        />
      )}

      <aside className={`${styles.sidebar} ${menuAbierto ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandInfo}>
            <span className={styles.brandIcon}><IconBolt /></span>
            <div>
              <h1 className={styles.brandTitle}>Casa Baterías</h1>
              <p className={styles.brandSubtitle}>Control Central</p>
            </div>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link href="/" className={styles.navItem} onClick={() => setMenuAbierto(false)}>
            <IconDashboard className={styles.navIcon} />
            <span>Dashboard</span>
          </Link>
          <Link href="/catalogo" className={styles.navItem} onClick={() => setMenuAbierto(false)}>
            <IconCatalog className={styles.navIcon} />
            <span>Catálogo</span>
          </Link>
          <Link href="/inventario" className={styles.navItem} onClick={() => setMenuAbierto(false)}>
            <IconInventory className={styles.navIcon} />
            <span>Inventario</span>
          </Link>
          <Link href="/cascos" className={styles.navItem} onClick={() => setMenuAbierto(false)}>
            <IconCasco className={styles.navIcon} />
            <span>Cascos</span>
          </Link>
          <Link href="/usuarios" className={styles.navItem} onClick={() => setMenuAbierto(false)}>
            <IconUsers className={styles.navIcon} />
            <span>Trabajadores</span>
          </Link>
          <Link href="/compras" className={`${styles.navItem} ${styles.navItemActive}`} onClick={() => setMenuAbierto(false)}>
            <IconInventory className={styles.navIcon} />
            <span>Compras de Stock</span>
          </Link>
          <Link href="/reportes" className={styles.navItem} onClick={() => setMenuAbierto(false)}>
            <IconReports className={styles.navIcon} />
            <span>Reportes y Utilidades</span>
          </Link>
        </nav>
      </aside>

      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button className={styles.menuBtn} onClick={() => setMenuAbierto(true)}>
              <IconMenu />
            </button>
            <div className={styles.breadcrumb}>
              <Link href="/" style={{ color: 'var(--text-muted)' }}>Panel</Link>
              <span>/</span>
              <span className={styles.breadcrumbActive}>Compras</span>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className={styles.mainContent}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              <span>{error}</span>
            </div>
          )}

          <section className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <span>Historial de Compras ({compras.length})</span>
              </h2>
              <Link href="/compras/nueva" className={styles.btnPrimarySm}>
                <IconAdd style={{ width: '14px', height: '14px' }} />
                <span>Registrar Compra</span>
              </Link>
            </div>

            <div className={styles.tableScroll}>
              {cargando ? (
                <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Cargando compras…
                </div>
              ) : compras.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No hay compras registradas.
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Fecha</th>
                      <th>Proveedor</th>
                      <th>Sucursal Destino</th>
                      <th>Registrado por</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compras.map((compra) => (
                      <tr key={compra.id}>
                        <td className="mono" style={{ fontWeight: 600 }}>{compra.folio}</td>
                        <td className="mono">{new Date(compra.fecha).toLocaleDateString()}</td>
                        <td>{compra.proveedores?.nombre ?? <span style={{ color: 'var(--text-muted)' }}>Sin proveedor</span>}</td>
                        <td>{compra.sucursales.nombre}</td>
                        <td>{compra.usuarios.nombre_completo}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                          {formatearDinero(compra.total)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={compra.estado === 'completada' ? styles.badgeActivo : styles.badgeBaja}>
                            {compra.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
