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
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Casa Baterías</h1>
          <p>Panel de administración — {nombre}</p>
        </div>
        <button className={styles.linkButton} onClick={salir}>
          Salir
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.navGrid}>
          <Link href="/catalogo" className={styles.cardLink}>
            <div className={styles.card}>
              <h3>Catálogo</h3>
              <p>Marcas, productos, precios y bajas.</p>
            </div>
          </Link>
          <Link href="/inventario" className={styles.cardLink}>
            <div className={styles.card}>
              <h3>Inventario</h3>
              <p>Existencias por sucursal y transferencias.</p>
            </div>
          </Link>
          <Link href="/reportes" className={styles.cardLink}>
            <div className={styles.card}>
              <h3>Reportes</h3>
              <p>Ventas filtrables por sucursal, fechas, empleado y producto.</p>
            </div>
          </Link>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            <span>{error}</span>
            <button className={styles.boton} onClick={() => void cargar()}>
              Reintentar
            </button>
          </div>
        )}

        {cargando ? (
          <p className={styles.cargando}>Cargando…</p>
        ) : !dashboard ? (
          <p className={styles.vacio}>Sin datos para mostrar.</p>
        ) : (
          <>
            <section className={styles.section}>
              <h2>Resumen del día {dashboard.fecha}</h2>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <div className={styles.statValue}>
                    {dashboard.resumen.ventas_hoy}
                  </div>
                  <div className={styles.statLabel}>Ventas hoy</div>
                  <div className={styles.statSub}>
                    {formatearDinero(dashboard.resumen.monto_ventas_hoy)}
                  </div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>
                    {dashboard.resumen.unidades_inventario}
                  </div>
                  <div className={styles.statLabel}>Unidades en inventario</div>
                  <div className={styles.statSub}>
                    {formatearDinero(dashboard.resumen.valor_inventario)}
                  </div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>
                    {dashboard.resumen.cajas_abiertas}
                  </div>
                  <div className={styles.statLabel}>Cajas abiertas</div>
                  <div className={styles.statSub}>
                    {formatearDinero(dashboard.resumen.valor_esperado_cajas)}
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h2>Por sucursal</h2>
              <div className={styles.tablaScroll}>
                <table className={styles.tabla}>
                  <thead>
                    <tr>
                      <th>Sucursal</th>
                      <th>Ventas hoy</th>
                      <th>Monto hoy</th>
                      <th>Unidades inv.</th>
                      <th>Valor inv.</th>
                      <th>Caja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.por_sucursal.map((s) => (
                      <tr key={s.sucursal_id}>
                        <td>
                          {s.nombre}
                          {s.es_matriz && ' (matriz)'}
                        </td>
                        <td>{s.ventas_hoy}</td>
                        <td>{formatearDinero(s.monto_ventas_hoy)}</td>
                        <td>{s.unidades_inventario}</td>
                        <td>{formatearDinero(s.valor_inventario)}</td>
                        <td>
                          {s.caja ? (
                            <span className={styles.badgeAbierta}>
                              Abierta · esperado{' '}
                              {formatearDinero(s.caja.monto_esperado)}
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

            <section className={styles.section}>
              <h2>Últimas ventas</h2>
              {dashboard.ultimas_ventas.length === 0 ? (
                <p className={styles.vacio}>Aún no hay ventas.</p>
              ) : (
                <div className={styles.tablaScroll}>
                  <table className={styles.tabla}>
                    <thead>
                      <tr>
                        <th>Folio</th>
                        <th>Sucursal</th>
                        <th>Empleado</th>
                        <th>Pago</th>
                        <th>Total</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.ultimas_ventas.map((v) => (
                        <tr key={v.id}>
                          <td className={styles.mono}>{v.folio}</td>
                          <td>{v.sucursal ?? '—'}</td>
                          <td>{v.usuario ?? '—'}</td>
                          <td>
                            {v.metodo_pago === 'tarjeta'
                              ? 'Tarjeta'
                              : 'Efectivo'}
                          </td>
                          <td>{formatearDinero(v.total)}</td>
                          <td>
                            {new Date(v.created_at).toLocaleString('es-MX')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
