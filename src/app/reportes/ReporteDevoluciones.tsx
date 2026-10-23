'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  type ReporteDevoluciones as Reporte,
  etiquetaMetodoPago,
  etiquetaTipoDevolucion,
  obtenerReporteDevoluciones,
} from '@/lib/admin';
import { type Sucursal, formatearDinero, listarSucursales } from '@/lib/catalogo';
import { IconCasco, IconRefresh, IconReceipt } from '@/components/Icons';
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

export function ReporteDevoluciones() {
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
        await obtenerReporteDevoluciones({
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
          <h2 className={styles.filterTitle}>Devoluciones de dinero</h2>
        </div>
        <p className={styles.acuseNota}>
          Cada devolución tiene folio DEV y se resta de la caja donde se pagó: depósitos de casco
          que se regresan y baterías devueltas por el cliente.
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
            {cargando ? 'Consultando…' : 'Consultar devoluciones'}
          </button>
        </div>
      </section>

      {error && <div className={styles.errorBanner} role="alert">{error}</div>}

      {reporte && (
        <>
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Total devuelto</span>
                <div className={styles.statIconBadge} style={{ background: 'rgba(186, 26, 26, 0.1)', color: 'var(--error)' }}>
                  <IconReceipt style={{ width: '18px', height: '18px' }} />
                </div>
              </div>
              <div className={`${styles.statValue} mono`} style={{ color: 'var(--error)' }}>
                {formatearDinero(reporte.totales.monto)}
              </div>
              <div className={styles.statSub}>{reporte.totales.devoluciones} devoluciones</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Depósitos de casco</span>
                <div className={styles.statIconBadge} style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#d97706' }}>
                  <IconCasco style={{ width: '18px', height: '18px' }} />
                </div>
              </div>
              <div className={`${styles.statValue} mono`}>{formatearDinero(reporte.totales.depositos)}</div>
              <div className={styles.statSub}>El cliente trajo el casco</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Baterías devueltas</span>
                <div className={styles.statIconBadge} style={{ background: 'rgba(62, 50, 211, 0.1)', color: 'var(--primary)' }}>
                  <IconReceipt style={{ width: '18px', height: '18px' }} />
                </div>
              </div>
              <div className={`${styles.statValue} mono`}>{formatearDinero(reporte.totales.baterias)}</div>
              <div className={styles.statSub}>Autorizadas por un administrador</div>
            </div>
          </section>
          <section className={styles.bentoCard}>
            <div className={styles.tableScroll}>
              {reporte.devoluciones.length === 0 ? (
                <div className={styles.emptyText}>No hay devoluciones con esos filtros.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Cuándo</th>
                      <th>Folio</th>
                      <th>Tipo</th>
                      <th>Venta</th>
                      <th>Sucursal</th>
                      <th>Piezas</th>
                      <th>Atendió / Autorizó</th>
                      <th>Motivo</th>
                      <th style={{ textAlign: 'right' }}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.devoluciones.map((d) => (
                      <tr key={d.id}>
                        <td>{fechaCorta(d.created_at)}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>{d.folio}</td>
                        <td>{etiquetaTipoDevolucion(d.tipo)}</td>
                        <td className="mono">{d.venta_folio ?? '—'}</td>
                        <td>{d.sucursal ?? '—'}</td>
                        <td style={{ fontSize: '12px' }}>
                          {d.items.length === 0
                            ? '—'
                            : d.items
                                .map(
                                  (i) =>
                                    `${[i.marca, i.modelo].filter(Boolean).join(' ')} x${i.cantidad}${i.reingresa_inventario ? '' : ' (dañada)'}`,
                                )
                                .join(', ')}
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          {d.atendio ?? '—'}
                          {d.autorizo ? ` / ${d.autorizo}` : ''}
                        </td>
                        <td style={{ fontSize: '12px' }}>{d.motivo}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>
                          {formatearDinero(d.monto)}
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {etiquetaMetodoPago(d.metodo_reembolso)}
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
        <div className={styles.emptyText}>Consulta para ver las devoluciones de dinero por sucursal.</div>
      )}
    </>
  );
}
