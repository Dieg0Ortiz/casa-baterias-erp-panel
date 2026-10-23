'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  type ReporteCancelaciones as Reporte,
  etiquetaMetodoPago,
  obtenerReporteCancelaciones,
} from '@/lib/admin';
import { type Sucursal, formatearDinero, listarSucursales } from '@/lib/catalogo';
import { IconReceipt, IconRefresh } from '@/components/Icons';
import styles from './reportes.module.css';

function hoyLocal(): string {
  return new Date().toLocaleDateString('en-CA');
}

function mensajeError(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Ocurrió un error. Intenta de nuevo.';
}

function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function ReporteCancelaciones() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalId, setSucursalId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState(hoyLocal());
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    listarSucursales()
      .then((suc) => {
        if (activo) setSucursales(suc);
      })
      .catch((e) => {
        if (activo) setError(mensajeError(e));
      });
    return () => {
      activo = false;
    };
  }, []);

  async function consultar() {
    setCargando(true);
    setError(null);
    try {
      setReporte(
        await obtenerReporteCancelaciones({
          sucursal_id: sucursalId || undefined,
          fecha_desde: fechaDesde || undefined,
          fecha_hasta: fechaHasta || undefined,
        }),
      );
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <section className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <h2 className={styles.filterTitle}>Tickets cancelados</h2>
        </div>
        <p className={styles.acuseNota}>
          Cada cancelación la autoriza un administrador (en la app, con su clave). Aquí queda quién
          la pidió, quién la autorizó y el motivo. Para cancelar, busca la venta en la pestaña
          Ventas.
        </p>
        <div className={styles.filtersGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Sucursal</span>
            <select className={styles.select} value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
              <option value="">Todas las tiendas</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Desde</span>
            <input type="date" className={styles.input} value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Hasta</span>
            <input type="date" className={styles.input} value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </label>
        </div>
        <div className={styles.filterActionsBar}>
          <button
            type="button"
            className={styles.btnSecondary}
            disabled={cargando}
            onClick={() => {
              setSucursalId('');
              setFechaDesde('');
              setFechaHasta(hoyLocal());
              setReporte(null);
              setError(null);
            }}
          >
            <IconRefresh style={{ width: '13px', height: '13px' }} />
            <span>Limpiar</span>
          </button>
          <button type="button" className={styles.btnPrimary} disabled={cargando} onClick={() => void consultar()}>
            {cargando ? 'Consultando…' : 'Consultar cancelaciones'}
          </button>
        </div>
      </section>

      {error && <div className={styles.errorBanner} role="alert">{error}</div>}

      {reporte && (
        <>
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Tickets cancelados</span>
                <div className={styles.statIconBadge} style={{ background: 'rgba(186, 26, 26, 0.1)', color: 'var(--error)' }}>
                  <IconReceipt style={{ width: '18px', height: '18px' }} />
                </div>
              </div>
              <div className={`${styles.statValue} mono`}>{reporte.totales.cancelaciones}</div>
              <div className={styles.statSub}>Por {formatearDinero(reporte.totales.monto)}</div>
            </div>
          </section>
          <section className={styles.bentoCard}>
            <div className={styles.tableScroll}>
              {reporte.cancelaciones.length === 0 ? (
                <div className={styles.emptyText}>No hay tickets cancelados con esos filtros.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Cancelado</th>
                      <th>Folio</th>
                      <th>Vendido</th>
                      <th>Sucursal</th>
                      <th>Pidió</th>
                      <th>Autorizó</th>
                      <th>Motivo</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.cancelaciones.map((c) => (
                      <tr key={c.id}>
                        <td>{fechaCorta(c.cancelada_en)}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>{c.folio}</td>
                        <td>{fechaCorta(c.vendida_en)}</td>
                        <td>{c.sucursal ?? '—'}</td>
                        <td>{c.solicito ?? '—'}</td>
                        <td>{c.autorizo ?? '—'}</td>
                        <td style={{ fontSize: '12px' }}>{c.motivo ?? '—'}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>
                          {formatearDinero(c.total)}
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {etiquetaMetodoPago(c.metodo_pago)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}

      {!reporte && !cargando && !error && (
        <div className={styles.emptyText}>Consulta para ver los tickets cancelados.</div>
      )}
    </>
  );
}
