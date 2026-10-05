'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  obtenerReporteReimpresiones,
  type ReporteReimpresiones,
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

export function ReporteReimpresiones() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalId, setSucursalId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState(hoyLocal());
  const [reporte, setReporte] = useState<ReporteReimpresiones | null>(null);
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
      const datos = await obtenerReporteReimpresiones({
        sucursal_id: sucursalId || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
      });
      setReporte(datos);
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
          <h2 className={styles.filterTitle}>Reimpresiones de ticket</h2>
        </div>
        <p className={styles.acuseNota}>
          Cada reimpresión pide la clave de un administrador y el papel sale marcado.
          Aquí queda quién la pidió, quién la autorizó y el motivo.
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
            {cargando ? 'Consultando…' : 'Consultar reimpresiones'}
          </button>
        </div>
      </section>

      {error && <div className={styles.errorBanner} role="alert">{error}</div>}

      {reporte && (
        <>
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Reimpresiones</span>
                <div className={styles.statIconBadge} style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#d97706' }}>
                  <IconReceipt style={{ width: '18px', height: '18px' }} />
                </div>
              </div>
              <div className={`${styles.statValue} mono`}>{reporte.totales.reimpresiones}</div>
              <div className={styles.statSub}>Tickets vueltos a sacar en el periodo</div>
            </div>
          </section>
          <section className={styles.bentoCard}>
            <div className={styles.tableScroll}>
              {reporte.reimpresiones.length === 0 ? (
                <div className={styles.emptyText}>No hay reimpresiones con esos filtros.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Cuándo</th>
                      <th>Folio</th>
                      <th>Núm.</th>
                      <th>Sucursal</th>
                      <th>Pidió</th>
                      <th>Autorizó</th>
                      <th>Motivo</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.reimpresiones.map((fila) => (
                      <tr key={fila.id}>
                        <td>{fechaCorta(fila.created_at)}</td>
                        <td className="mono">{fila.folio}</td>
                        <td className="mono">{fila.numero}</td>
                        <td>{fila.sucursal ?? '—'}</td>
                        <td>{fila.solicito ?? '—'}</td>
                        <td>{fila.autorizo ?? '—'}</td>
                        <td>{fila.motivo}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>{formatearDinero(fila.total)}</td>
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
        <div className={styles.emptyText}>
          Consulta para ver quién reimprimió un ticket y con qué autorización.
        </div>
      )}
    </>
  );
}
