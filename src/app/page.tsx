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
          <span className={styles.brandIcon}>⚡</span>
          <div>
            <h1 className={styles.brandTitle}>Casa Baterías</h1>
            <p className={styles.brandSubtitle}>Control Central</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link href="/" className={`${styles.navItem} ${styles.navItemActive}`}>
            <span className={styles.navIcon}>📊</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/catalogo" className={styles.navItem}>
            <span className={styles.navIcon}>📦</span>
            <span>Catálogo</span>
          </Link>
          <Link href="/inventario" className={styles.navItem}>
            <span className={styles.navIcon}>🏭</span>
            <span>Inventario</span>
          </Link>
          <Link href="/reportes" className={styles.navItem}>
            <span className={styles.navIcon}>📋</span>
            <span>Reportes</span>
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutBtn} onClick={salir}>
            <span>🚪</span>
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

          <div className={styles.userInfo}>
            <div className={styles.userText}>
              <span className={styles.userName}>{nombre}</span>
              <span className={styles.userRole}>Administrador</span>
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
                    <div className={styles.statIconBadge} style={{ background: 'rgba(62, 50, 211, 0.08)', color: 'var(--primary)' }}>
                      💰
                    </div>
                  </div>
                  <div className={`${styles.statValue} mono`}>
                    {dashboard.resumen.ventas_hoy}
                  </div>
                  <div className={`${styles.statSub} mono`}>
                    {formatearDinero(dashboard.resumen.monto_ventas_hoy)} MXN
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>Inventario Total</span>
                    <div className={styles.statIconBadge} style={{ background: 'rgba(86, 84, 168, 0.08)', color: 'var(--secondary)' }}>
                      📦
                    </div>
                  </div>
                  <div className={`${styles.statValue} mono`}>
                    {dashboard.resumen.unidades_inventario}
                  </div>
                  <div className={`${styles.statSub} mono`}>
                    {formatearDinero(dashboard.resumen.valor_inventario)} MXN
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>Cajas Abiertas</span>
                    <div className={styles.statIconBadge} style={{ background: 'rgba(27, 135, 63, 0.08)', color: 'var(--success)' }}>
                      🏪
                    </div>
                  </div>
                  <div className={`${styles.statValue} mono`}>
                    {dashboard.resumen.cajas_abiertas}
                  </div>
                  <div className={`${styles.statSub} mono`}>
                    Esperado: {formatearDinero(dashboard.resumen.valor_esperado_cajas)} MXN
                  </div>
                </div>
              </section>

              {/* Row 2: Por Sucursal */}
              <section className={styles.bentoCard}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <span>📍</span>
                    <span>Desglose por Sucursal</span>
                  </h2>
                </div>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Sucursal</th>
                        <th className={styles.textRight}>Ventas Hoy</th>
                        <th className={styles.textRight}>Monto Hoy</th>
                        <th className={styles.textRight}>Unidades Inv.</th>
                        <th className={styles.textRight}>Valor Inv.</th>
                        <th className={styles.textCenter}>Estado de Caja</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.por_sucursal.map((s) => (
                        <tr key={s.sucursal_id}>
                          <td>
                            <strong>{s.nombre}</strong>
                            {s.es_matriz && <span className={styles.badgeMatriz}>Matriz</span>}
                          </td>
                          <td className={`${styles.textRight} mono`}>{s.ventas_hoy}</td>
                          <td className={`${styles.textRight} mono`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            {formatearDinero(s.monto_ventas_hoy)}
                          </td>
                          <td className={`${styles.textRight} mono`}>{s.unidades_inventario}</td>
                          <td className={`${styles.textRight} mono`}>{formatearDinero(s.valor_inventario)}</td>
                          <td className={styles.textCenter}>
                            {s.caja ? (
                              <span className={styles.badgeAbierta}>
                                Abierta · {formatearDinero(s.caja.monto_esperado)}
                              </span>
                            ) : (
                              <span className={styles.badgeCerrada}>Cerrada</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Row 3: Últimas Ventas */}
              <section className={styles.bentoCard}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <span>🧾</span>
                    <span>Transacciones Recientes</span>
                  </h2>
                  <Link href="/reportes" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>
                    Ver Reporte Completo →
                  </Link>
                </div>
                <div className={styles.tableScroll}>
                  {dashboard.ultimas_ventas.length === 0 ? (
                    <div className={styles.emptyText}>Aún no se han registrado ventas hoy.</div>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Folio</th>
                          <th>Sucursal</th>
                          <th>Empleado</th>
                          <th>Método de Pago</th>
                          <th className={styles.textRight}>Total</th>
                          <th>Fecha y Hora</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.ultimas_ventas.map((v) => (
                          <tr key={v.id}>
                            <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                              {v.folio}
                            </td>
                            <td>{v.sucursal ?? '—'}</td>
                            <td>{v.usuario ?? '—'}</td>
                            <td>
                              <span style={{ textTransform: 'capitalize' }}>
                                {v.metodo_pago === 'tarjeta' ? '💳 Tarjeta' : '💵 Efectivo'}
                              </span>
                            </td>
                            <td className={`${styles.textRight} mono`} style={{ fontWeight: 700 }}>
                              {formatearDinero(v.total)}
                            </td>
                            <td className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {new Date(v.created_at).toLocaleString('es-MX')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              {/* Row 4: Accesos Rápidos */}
              <section className={styles.quickNavGrid}>
                <Link href="/catalogo" className={styles.quickNavCard}>
                  <div className={styles.quickNavHeader}>
                    <span className={styles.quickNavTitle}>📦 Catálogo</span>
                    <span className={styles.quickNavArrow}>→</span>
                  </div>
                  <p className={styles.quickNavDesc}>
                    Administración de marcas, modelos, precios autorizados y bajas definitivas.
                  </p>
                </Link>

                <Link href="/inventario" className={styles.quickNavCard}>
                  <div className={styles.quickNavHeader}>
                    <span className={styles.quickNavTitle}>🏭 Inventario</span>
                    <span className={styles.quickNavArrow}>→</span>
                  </div>
                  <p className={styles.quickNavDesc}>
                    Existencias físicas por tienda, balance de cascos y transferencias entre sucursales.
                  </p>
                </Link>

                <Link href="/reportes" className={styles.quickNavCard}>
                  <div className={styles.quickNavHeader}>
                    <span className={styles.quickNavTitle}>📋 Reportes</span>
                    <span className={styles.quickNavArrow}>→</span>
                  </div>
                  <p className={styles.quickNavDesc}>
                    Auditoría de ventas con filtros multidimensionales y exportación en formato CSV.
                  </p>
                </Link>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
