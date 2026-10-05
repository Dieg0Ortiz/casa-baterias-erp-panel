'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  etiquetaOrigenAlta,
  obtenerReporteAltas,
  type OrigenAlta,
  type ReporteAltas,
} from '@/lib/admin';
import {
  type Producto,
  type Sucursal,
  listarProductos,
  listarSucursales,
} from '@/lib/catalogo';
import { generarReporteAltasPdf } from '@/lib/generadorPdf';
import { IconDownload, IconInventory, IconReceipt, IconRefresh } from '@/components/Icons';
import styles from './reportes.module.css';

function hoyLocal(): string {
  return new Date().toLocaleDateString('en-CA');
}

function mensajeError(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Ocurrió un error. Intenta de nuevo.';
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function ReporteAltas() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursalId, setSucursalId] = useState('');
  const [productoId, setProductoId] = useState('');
  const [origen, setOrigen] = useState<OrigenAlta | ''>('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState(hoyLocal());
  const [reporte, setReporte] = useState<ReporteAltas | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [suc, prods] = await Promise.all([listarSucursales(), listarProductos()]);
        if (!activo) return;
        setSucursales(suc);
        setProductos(prods);
      } catch (e) {
        if (!activo) return;
        setError(mensajeError(e));
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  async function consultar() {
    setCargando(true);
    setError(null);
    try {
      const datos = await obtenerReporteAltas({
        sucursal_id: sucursalId || undefined,
        producto_id: productoId || undefined,
        origen: origen || undefined,
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

  function descargarPdf() {
    if (!reporte) return;
    const sucursal = sucursales.find((s) => s.id === sucursalId);
    const producto = productos.find((p) => p.id === productoId);
    generarReporteAltasPdf({
      reporte,
      sucursalNombre: sucursal?.nombre,
      productoNombre: producto
        ? `${producto.marcas?.nombre ?? ''} ${producto.modelo}`.trim()
        : undefined,
      origenNombre:
        origen === 'carga_masiva'
          ? 'Carga masiva / conteo'
          : origen
            ? etiquetaOrigenAlta(origen, 'sumar')
            : undefined,
      fechaDesde,
      fechaHasta,
    });
  }

  return (
    <>
      <section className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <h2 className={styles.filterTitle}>Acuse de altas</h2>
        </div>
        <p className={styles.acuseNota}>
          Aquí queda cada modelo dado de alta, cada compra y, de aquí en adelante,
          cada entrada de inventario y cada carga masiva. El PDF sirve para comparar
          contra lo que reportó la sucursal. Las entradas y cargas hechas antes de
          este acuse no se habían guardado.
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
            <span className={styles.fieldLabel}>Producto / Modelo</span>
            <select className={styles.select} value={productoId} onChange={(e) => setProductoId(e.target.value)}>
              <option value="">Todos los productos</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.marcas?.nombre ? `${p.marcas.nombre} ${p.modelo}` : p.modelo}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Tipo de alta</span>
            <select
              className={styles.select}
              value={origen}
              onChange={(e) => setOrigen(e.target.value as OrigenAlta | '')}
            >
              <option value="">Todos</option>
              <option value="catalogo">Alta de modelo</option>
              <option value="entrada">Entrada de inventario</option>
              <option value="carga_masiva">Carga masiva / conteo</option>
              <option value="compra">Compra</option>
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
              setProductoId('');
              setOrigen('');
              setFechaDesde('');
              setFechaHasta(hoyLocal());
              setReporte(null);
              setError(null);
            }}
          >
            <IconRefresh style={{ width: '13px', height: '13px' }} />
            <span>Limpiar</span>
          </button>
          {reporte && reporte.lineas.length > 0 && (
            <button type="button" className={styles.btnSecondary} onClick={descargarPdf}>
              <IconDownload style={{ width: '14px', height: '14px' }} />
              <span>Descargar acuse PDF</span>
            </button>
          )}
          <button type="button" className={styles.btnPrimary} disabled={cargando} onClick={() => void consultar()}>
            {cargando ? 'Consultando…' : 'Consultar altas'}
          </button>
        </div>
      </section>

      {error && <div className={styles.errorBanner} role="alert">{error}</div>}

      {reporte && (
        <>
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Acuses</span>
                <div className={styles.statIconBadge} style={{ background: 'rgba(62, 50, 211, 0.1)', color: 'var(--primary)' }}>
                  <IconReceipt style={{ width: '18px', height: '18px' }} />
                </div>
              </div>
              <div className={`${styles.statValue} mono`}>{reporte.totales.operaciones}</div>
              <div className={styles.statSub}>Folios de alta</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Renglones</span>
                <div className={styles.statIconBadge} style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' }}>
                  <IconInventory style={{ width: '18px', height: '18px' }} />
                </div>
              </div>
              <div className={`${styles.statValue} mono`}>{reporte.totales.lineas}</div>
              <div className={styles.statSub}>Modelos registrados en el periodo</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Unidades</span>
                <div className={styles.statIconBadge} style={{ background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a' }}>
                  <IconInventory style={{ width: '18px', height: '18px' }} />
                </div>
              </div>
              <div className={`${styles.statValue} mono`}>{reporte.totales.unidades}</div>
              <div className={styles.statSub}>Piezas dadas de alta</div>
            </div>
          </section>

          <section className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Detalle para comparar</span>
            </div>
            <div className={styles.tableScroll}>
              {reporte.lineas.length === 0 ? (
                <div className={styles.emptyText}>No hay altas con esos filtros.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Fecha</th>
                      <th>Sucursal</th>
                      <th>Registró</th>
                      <th>Tipo</th>
                      <th>Marca</th>
                      <th>Modelo</th>
                      <th>Código</th>
                      <th style={{ textAlign: 'right' }}>Cant.</th>
                      <th style={{ textAlign: 'right' }}>Antes</th>
                      <th style={{ textAlign: 'right' }}>Después</th>
                      <th>Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.lineas.map((linea, i) => (
                      <tr key={`${linea.folio}-${linea.modelo}-${i}`}>
                        <td className="mono">{linea.folio}</td>
                        <td>{fechaCorta(linea.created_at)}</td>
                        <td>{linea.sucursal ?? '—'}</td>
                        <td>{linea.usuario ?? '—'}</td>
                        <td>{etiquetaOrigenAlta(linea.origen, linea.modo)}</td>
                        <td>{linea.marca ?? '—'}</td>
                        <td style={{ fontWeight: 700 }}>{linea.modelo ?? '—'}</td>
                        <td className="mono">{linea.codigo_barras ?? '—'}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>{linea.cantidad}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>
                          {linea.existencia_anterior ?? '—'}
                        </td>
                        <td className="mono" style={{ textAlign: 'right' }}>
                          {linea.existencia_nueva ?? '—'}
                        </td>
                        <td>{linea.nota ?? ''}</td>
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
          Elige el periodo y pulsa «Consultar altas» para armar el acuse.
        </div>
      )}
    </>
  );
}
