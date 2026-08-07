'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { logout, useSesion } from '@/lib/auth';
import {
  type Dashboard,
  obtenerDashboard,
} from '@/lib/admin';
import { formatearDinero } from '@/lib/catalogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  IconBolt,
  IconDashboard,
  IconCatalog,
  IconInventory,
  IconReports,
  IconLogout,
  IconSales,
  IconStore,
  IconCashRegister,
  IconReceipt,
  IconArrowRight,
  IconCard,
  IconCash,
} from '@/components/Icons';
import styles from './home.module.css';

function mensajeError(e: unknown): string {
  return e instanceof ApiError
    ? e.message
    : 'Ocurrió un error. Intenta de nuevo.';
}

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
      <div className={styles.lockedPage}>
        <div className={styles.lockedCard}>
          <h1>Acceso restringido</h1>
          <p>
            Este panel es exclusivo para administradores. Tu usuario tiene el rol{' '}
            <strong>trabajador</strong> y debe utilizar la terminal de ventas en Android.
          </p>
          <button onClick={salir}>Cerrar Sesión</button>
        </div>
      </div>
    );
  }

  return <DashboardAdmin salir={salir} nombre={perfil.nombre_completo} />;
}

function DashboardAdmin({
  salir,
  nombre,
}: {
  salir: () => void;
  nombre: string;
}) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const datos = await obtenerDashboard();
      setDashboard(datos);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let activo = true;
    (async () => {
      setCargando(true);
      setError(null);
      try {
        const datos = await obtenerDashboard();
        if (!activo) return;
        setDashboard(datos);
      } catch (e) {
        if (!activo) return;
        setError(mensajeError(e));
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className={styles.layout}>
      {/* Sidebar Persistente */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandIconWrapper}>
            <IconBolt />
          </div>
          <div>
            <h1 className={styles.brandTitle}>Casa Baterías</h1>
            <p className={styles.brandSubtitle}>Control Central</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link href="/" className={`${styles.navItem} ${styles.navItemActive}`}>
            <IconDashboard className={styles.navIcon} />
            <span>Dashboard</span>
          </Link>
          <Link href="/catalogo" className={styles.navItem}>
            <IconCatalog className={styles.navIcon} />
            <span>Catálogo</span>
          </Link>
          <Link href="/inventario" className={styles.navItem}>
            <IconInventory className={styles.navIcon} />
            <span>Inventario</span>
          </Link>
          <Link href="/reportes" className={styles.navItem}>
            <IconReports className={styles.navIcon} />
            <span>Reportes</span>
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutBtn} onClick={salir}>
            <IconLogout />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Panel</span>
            <span>/</span>
            <span className={styles.breadcrumbActive}>Dashboard General</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ThemeToggle />

            <div className={styles.userInfo}>
              <div className={styles.userText}>
                <span className={styles.userName}>{nombre}</span>
                <span className={styles.userRole}>Administrador</span>
              </div>
            </div>
          </div>
        </header>

        <main className={styles.mainContent}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              <span>{error}</span>
              <button className={styles.retryBtn} onClick={() => void cargar()}>
                Reintentar
              </button>
            </div>
          )}

          {cargando ? (
            <div className={styles.loadingText}>Cargando métricas consolidadas…</div>
          ) : !dashboard ? (
            <div className={styles.emptyText}>Sin datos para mostrar en este momento.</div>
          ) : (
            <>
              {/* Row 1: KPI Stats Grid */}
              <section className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>Ventas Hoy</span>
                    <div className={styles.statIconBadge} style={{ background: 'rgba(129, 140, 248, 0.12)', color: 'var(--primary)' }}>
                      <IconSales />
                    </div>
                  </div>
                  <div className={`${styles.statValue} mono`}>
                    {dashboard.resumen.ventas_hoy}
                  </div>
                  <span className={styles.statSub}>Transacciones completadas</span>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>Monto Facturado Hoy</span>
                    <div className={styles.statIconBadge} style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--success)' }}>
                      <IconBolt />
                    </div>
                  </div>
                  <div className={`${styles.statValue} mono`} style={{ color: 'var(--primary)' }}>
                    {formatearDinero(dashboard.resumen.monto_ventas_hoy)}
                  </div>
                  <span className={styles.statSub}>Total bruto en caja</span>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>Baterías en Stock</span>
                    <div className={styles.statIconBadge} style={{ background: 'rgba(147, 197, 253, 0.15)', color: 'var(--secondary)' }}>
                      <IconStore />
                    </div>
                  </div>
                  <div className={`${styles.statValue} mono`}>
                    {dashboard.resumen.unidades_inventario}
                  </div>
                  <span className={styles.statSub}>Unidades físicas totales</span>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>Cajas Activas</span>
                    <div className={styles.statIconBadge} style={{ background: 'rgba(129, 140, 248, 0.12)', color: 'var(--primary)' }}>
                      <IconCashRegister />
                    </div>
                  </div>
                  <div className={`${styles.statValue} mono`}>
                    {dashboard.resumen.cajas_abiertas}
                  </div>
                  <span className={styles.statSub}>Turnos de cobro abiertos</span>
                </div>
              </section>

              {/* Row 2: Módulos Operativos Rápidos */}
              <section className={styles.quickNavGrid}>
                <Link href="/catalogo" className={styles.quickNavCard}>
                  <div className={styles.quickNavIconBadge}>
                    <IconCatalog style={{ width: '22px', height: '22px' }} />
                  </div>
                  <div className={styles.quickNavContent}>
                    <h3 className={styles.quickNavTitle}>Catálogo</h3>
                    <p className={styles.quickNavDesc}>
                      Gestione modelos, marcas y compatibilidades de baterías.
                    </p>
                  </div>
                </Link>

                <Link href="/inventario" className={styles.quickNavCard}>
                  <div className={styles.quickNavIconBadge}>
                    <IconInventory style={{ width: '22px', height: '22px' }} />
                  </div>
                  <div className={styles.quickNavContent}>
                    <h3 className={styles.quickNavTitle}>Inventario</h3>
                    <p className={styles.quickNavDesc}>
                      Control de existencias, traspasos y alertas de stock bajo.
                    </p>
                  </div>
                </Link>

                <Link href="/reportes" className={styles.quickNavCard}>
                  <div className={styles.quickNavIconBadge}>
                    <IconReports style={{ width: '22px', height: '22px' }} />
                  </div>
                  <div className={styles.quickNavContent}>
                    <h3 className={styles.quickNavTitle}>Reportes</h3>
                    <p className={styles.quickNavDesc}>
                      Análisis de ventas, cortes de caja y rendimiento general.
                    </p>
                  </div>
                </Link>
              </section>

              {/* Row 3: Bento Grid Layout */}
              <div className={styles.bentoGrid}>
                {/* Bento Col 1: Estado de Sucursales */}
                <section className={styles.bentoCard}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      <IconStore style={{ color: 'var(--primary)' }} />
                      <span>Rendimiento por Sucursal</span>
                    </h2>
                    <span className={styles.cardBadge}>Tiempo Real</span>
                  </div>

                  <div className={styles.branchesList}>
                    {dashboard.por_sucursal.map((s) => (
                      <div key={s.sucursal_id} className={styles.branchItem}>
                        <div className={styles.branchHeader}>
                          <div className={styles.branchNameGroup}>
                            <h3 className={styles.branchName}>{s.nombre}</h3>
                            {s.es_matriz && <span className={styles.matrizTag}>Matriz</span>}
                          </div>
                          <span className={s.caja ? styles.statusOpen : styles.statusClosed}>
                            {s.caja ? 'Caja Abierta' : 'Caja Cerrada'}
                          </span>
                        </div>

                        <div className={styles.branchMetrics}>
                          <div className={styles.metricCol}>
                            <span className={styles.metricLabel}>Ventas Hoy</span>
                            <span className={`${styles.metricVal} mono`}>{s.ventas_hoy}</span>
                          </div>
                          <div className={styles.metricCol}>
                            <span className={styles.metricLabel}>Recaudado</span>
                            <span className={`${styles.metricVal} mono`} style={{ color: 'var(--primary)' }}>
                              {formatearDinero(s.monto_ventas_hoy)}
                            </span>
                          </div>
                          <div className={styles.metricCol}>
                            <span className={styles.metricLabel}>Stock</span>
                            <span className={`${styles.metricVal} mono`}>{s.unidades_inventario} pzas</span>
                          </div>
                        </div>

                        {s.caja && (
                          <div className={styles.cashBoxInfo}>
                            <div className={styles.cashBoxRow}>
                              <span className={styles.cashBoxLabel}>Efectivo en Caja Esperado:</span>
                              <span className={`${styles.cashBoxValue} mono`}>
                                {formatearDinero(s.caja.monto_esperado)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Bento Col 2: Feed de Últimas Ventas */}
                <section className={styles.bentoCard}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      <IconReceipt style={{ color: 'var(--primary)' }} />
                      <span>Últimas Transacciones</span>
                    </h2>
                    <Link href="/reportes" className={styles.cardLink}>
                      <span>Ver Reportes</span>
                      <IconArrowRight />
                    </Link>
                  </div>

                  {dashboard.ultimas_ventas.length === 0 ? (
                    <div className={styles.emptyText}>No hay ventas registradas el día de hoy.</div>
                  ) : (
                    <div className={styles.tableScroll}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Folio</th>
                            <th>Sucursal</th>
                            <th>Cajero</th>
                            <th>Método</th>
                            <th style={{ textAlign: 'right' }}>Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.ultimas_ventas.map((v) => (
                            <tr key={v.id}>
                              <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                {v.folio}
                              </td>
                              <td>{v.sucursal ?? '—'}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{v.usuario ?? '—'}</td>
                              <td>
                                <span className={styles.paymentMethod}>
                                  {v.metodo_pago === 'tarjeta' ? (
                                    <>
                                      <IconCard style={{ width: '13px', height: '13px', color: 'var(--secondary)' }} />
                                      <span>Tarjeta</span>
                                    </>
                                  ) : (
                                    <>
                                      <IconCash style={{ width: '13px', height: '13px', color: 'var(--success)' }} />
                                      <span>Efectivo</span>
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                                {formatearDinero(v.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
