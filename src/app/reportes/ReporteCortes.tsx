'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  type CorteCaja,
  type ResumenCorte,
  etiquetaMetodoPago,
  etiquetaTipoDevolucion,
  listarCortes,
  obtenerResumenCorte,
} from '@/lib/admin';
import { type Sucursal, formatearDinero, listarSucursales } from '@/lib/catalogo';
import { generarCorteEfectivoPdf, generarCorteElectronicoPdf } from '@/lib/generadorPdf';
import { IconBuilding, IconCard, IconCash, IconDownload } from '@/components/Icons';
import styles from './reportes.module.css';

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

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function colorDiferencia(diferencia: number | null): string | undefined {
  if (diferencia == null || Math.abs(diferencia) < 0.005) return undefined;
  return diferencia < 0 ? 'var(--error)' : '#d97706';
}

export function ReporteCortes() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalId, setSucursalId] = useState('');
  const [cortes, setCortes] = useState<CorteCaja[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenCorte | null>(null);
  const [cargandoResumen, setCargandoResumen] = useState(false);

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

  const nombreSucursal = (id: string) => sucursales.find((s) => s.id === id)?.nombre ?? '—';

  async function consultar() {
    setCargando(true);
    setError(null);
    setSeleccionado(null);
    setResumen(null);
    try {
      setCortes(await listarCortes(sucursalId || undefined));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  async function verCorte(id: string) {
    if (seleccionado === id) {
      setSeleccionado(null);
      setResumen(null);
      return;
    }
    setSeleccionado(id);
    setResumen(null);
    setCargandoResumen(true);
    setError(null);
    try {
      setResumen(await obtenerResumenCorte(id));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargandoResumen(false);
    }
  }

  return (
    <>
      <section className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <h2 className={styles.filterTitle}>Cortes de caja</h2>
        </div>
        <p className={styles.acuseNota}>
          Cada cierre de caja tiene dos cortes: el de efectivo (lo que debe haber en el cajón) y el
          de tarjetas y transferencias. Las ventas a crédito no entran a ninguno de los dos.
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
        </div>
        <div className={styles.filterActionsBar}>
          <button type="button" className={styles.btnPrimary} disabled={cargando} onClick={() => void consultar()}>
            {cargando ? 'Consultando…' : 'Consultar cortes'}
          </button>
        </div>
      </section>

      {error && <div className={styles.errorBanner} role="alert">{error}</div>}

      {cortes && (
        <section className={styles.bentoCard}>
          <div className={styles.tableScroll}>
            {cortes.length === 0 ? (
              <div className={styles.emptyText}>No hay cortes registrados.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Sucursal</th>
                    <th>Apertura</th>
                    <th>Cierre</th>
                    <th style={{ textAlign: 'right' }}>Efectivo esperado</th>
                    <th style={{ textAlign: 'right' }}>Contado</th>
                    <th style={{ textAlign: 'right' }}>Diferencia</th>
                    <th style={{ textAlign: 'right' }}>Tarjetas</th>
                    <th style={{ textAlign: 'right' }}>Transferencias</th>
                  </tr>
                </thead>
                <tbody>
                  {cortes.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => void verCorte(c.id)}
                      style={{
                        cursor: 'pointer',
                        background: seleccionado === c.id ? 'var(--surface-container-low)' : undefined,
                      }}
                      title="Ver los dos cortes"
                    >
                      <td style={{ fontWeight: 600 }}>{nombreSucursal(c.sucursal_id)}</td>
                      <td>{fechaCorta(c.abierto_en)}</td>
                      <td>
                        {c.estado === 'abierto' ? (
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>Abierta</span>
                        ) : (
                          fechaCorta(c.cerrado_en)
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {c.monto_calculado == null ? '—' : formatearDinero(c.monto_calculado)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {c.monto_final_reportado == null ? '—' : formatearDinero(c.monto_final_reportado)}
                      </td>
                      <td
                        className="mono"
                        style={{ textAlign: 'right', fontWeight: 600, color: colorDiferencia(c.diferencia) }}
                      >
                        {c.diferencia == null ? '—' : formatearDinero(c.diferencia)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {c.total_tarjetas == null ? '—' : formatearDinero(c.total_tarjetas)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {c.total_transferencias == null ? '—' : formatearDinero(c.total_transferencias)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {cargandoResumen && <div className={styles.emptyText}>Cargando corte…</div>}
      {resumen && <DetalleCorte resumen={resumen} />}

      {!cortes && !cargando && !error && (
        <div className={styles.emptyText}>Consulta para ver los cortes de caja por sucursal.</div>
      )}
    </>
  );
}

function Renglon({ concepto, monto, fuerte, color }: { concepto: string; monto: number | null; fuerte?: boolean; color?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 0',
        borderBottom: '1px solid var(--outline-variant)',
        fontWeight: fuerte ? 700 : 400,
        color,
      }}
    >
      <span>{concepto}</span>
      <span className="mono">{monto == null ? '—' : formatearDinero(monto)}</span>
    </div>
  );
}

function DetalleCorte({ resumen: r }: { resumen: ResumenCorte }) {
  const e = r.efectivo;
  const el = r.electronico;
  return (
    <>
      <section className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Corte de efectivo · {r.sucursal}</span>
            <div className={styles.statIconBadge} style={{ background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a' }}>
              <IconCash style={{ width: '18px', height: '18px' }} />
            </div>
          </div>
          <div style={{ fontSize: '13px' }}>
            <Renglon concepto="Fondo inicial" monto={e.monto_inicial} />
            <Renglon concepto={`(+) Ventas en efectivo (${e.ventas_count})`} monto={e.ventas} />
            <Renglon concepto="(+) Intercambios de cascos" monto={e.intercambios} />
            <Renglon concepto="(+) Abonos de crédito" monto={e.abonos_credito} />
            <Renglon concepto="(−) Devoluciones" monto={e.devoluciones} />
            <Renglon concepto="= Efectivo esperado" monto={e.esperado} fuerte />
            <Renglon concepto="Efectivo contado" monto={e.contado} />
            <Renglon concepto="Diferencia" monto={e.diferencia} fuerte color={colorDiferencia(e.diferencia)} />
          </div>
          <button
            type="button"
            className={styles.btnSecondary}
            style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => generarCorteEfectivoPdf(r)}
          >
            <IconDownload style={{ width: '13px', height: '13px' }} />
            <span>PDF corte de efectivo</span>
          </button>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Corte de tarjetas y transferencias</span>
            <div className={styles.statIconBadge} style={{ background: 'rgba(62, 50, 211, 0.1)', color: 'var(--primary)' }}>
              <IconCard style={{ width: '18px', height: '18px' }} />
            </div>
          </div>
          <div style={{ fontSize: '13px' }}>
            <Renglon concepto="Tarjeta de débito" monto={el.tarjeta_debito} />
            <Renglon concepto="Tarjeta de crédito" monto={el.tarjeta_credito} />
            {el.tarjeta_sin_tipo > 0 && <Renglon concepto="Tarjeta (sin especificar)" monto={el.tarjeta_sin_tipo} />}
            {el.devoluciones_tarjeta > 0 && <Renglon concepto="(−) Devoluciones a tarjeta" monto={el.devoluciones_tarjeta} />}
            <Renglon concepto="= Total tarjetas" monto={el.total_tarjetas} fuerte />
            <Renglon concepto="Transferencias" monto={el.transferencias} />
            {el.devoluciones_transferencia > 0 && (
              <Renglon concepto="(−) Devoluciones por transferencia" monto={el.devoluciones_transferencia} />
            )}
            <Renglon concepto="= Total transferencias" monto={el.total_transferencias} fuerte />
            <Renglon concepto="Total del corte" monto={el.total} fuerte />
          </div>
          <button
            type="button"
            className={styles.btnSecondary}
            style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => generarCorteElectronicoPdf(r)}
          >
            <IconDownload style={{ width: '13px', height: '13px' }} />
            <span>PDF corte de tarjetas y transferencias</span>
          </button>
        </div>
      </section>

      {el.operaciones.length > 0 && (
        <section className={styles.bentoCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <IconCard style={{ color: 'var(--primary)' }} />
              <span>Operaciones con tarjeta y transferencia</span>
            </h2>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Folio</th>
                  <th>Concepto</th>
                  <th>Forma de pago</th>
                  <th style={{ textAlign: 'right' }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {el.operaciones.map((o, i) => (
                  <tr key={`${o.folio}-${i}`}>
                    <td>{hora(o.creado_en)}</td>
                    <td className="mono">{o.folio ?? '—'}</td>
                    <td>{o.detalle ?? 'Venta'}</td>
                    <td>{etiquetaMetodoPago(o.metodo)}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{formatearDinero(o.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className={styles.bentoCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <IconBuilding style={{ color: '#b45309' }} />
            <span>
              Ventas a crédito del turno · {r.creditos.ventas_count} ventas · {r.creditos.piezas} pilas ·{' '}
              {formatearDinero(r.creditos.total)}
            </span>
          </h2>
        </div>
        <p className={styles.acuseNota}>Apartado informativo: no se cobraron y no forman parte de ningún corte.</p>
        {r.creditos.ventas.length > 0 && (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Folio</th>
                  <th>Empresa</th>
                  <th>Vale</th>
                  <th style={{ textAlign: 'center' }}>Pilas</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {r.creditos.ventas.map((c) => (
                  <tr key={c.folio}>
                    <td>{hora(c.creado_en)}</td>
                    <td className="mono">{c.folio}</td>
                    <td>{c.empresa}</td>
                    <td>{c.folio_vale ?? '—'}</td>
                    <td style={{ textAlign: 'center' }}>{c.piezas}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{formatearDinero(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(r.devoluciones.count > 0 || r.cancelaciones.count > 0) && (
        <section className={styles.bentoCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <span>Devoluciones y cancelaciones del turno</span>
            </h2>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Tipo</th>
                  <th>Detalle</th>
                  <th style={{ textAlign: 'right' }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {r.devoluciones.lista.map((d) => (
                  <tr key={d.folio}>
                    <td className="mono">{d.folio}</td>
                    <td>{etiquetaTipoDevolucion(d.tipo)}</td>
                    <td>
                      Venta {d.venta_folio} · {etiquetaMetodoPago(d.metodo)}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>−{formatearDinero(d.monto)}</td>
                  </tr>
                ))}
                {r.cancelaciones.lista.map((c) => (
                  <tr key={c.folio}>
                    <td className="mono">{c.folio}</td>
                    <td>Ticket cancelado</td>
                    <td>{c.motivo ?? '—'}</td>
                    <td className="mono" style={{ textAlign: 'right', textDecoration: 'line-through' }}>
                      {formatearDinero(c.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
