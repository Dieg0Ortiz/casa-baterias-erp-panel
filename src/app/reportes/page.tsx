/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { logout, useSesion } from '@/lib/auth';
import {
  type Empleado,
  type ReporteVentas,
  type UtilidadReporte,
  listarEmpleados,
  obtenerReporteVentas,
  obtenerReporteUtilidades,
} from '@/lib/admin';
import {
  type Producto,
  type Sucursal,
  formatearDinero,
  listarProductos,
  listarSucursales,
} from '@/lib/catalogo';
import { generarReporteVentasPdf } from '@/lib/generadorPdf';
import {
  IconBolt,
  IconDashboard,
  IconCatalog,
  IconInventory,
  IconReports,
  IconLogout,
  IconDownload,
  IconChevronRight,
  IconChevronDown,
  IconCard,
  IconCash,
  IconRefresh,
  IconMenu,
  IconClose,
  IconCasco,
  IconReceipt,
  IconBuilding,
  IconSales,
  IconSplit,
  IconUsers,
} from '@/components/Icons';
import { Sidebar } from '@/components/Sidebar';
import styles from './reportes.module.css';

function mensajeError(e: unknown): string {
  return e instanceof ApiError
    ? e.message
    : 'Ocurrió un error. Intenta de nuevo.';
}

function hoyLocal(): string {
  return new Date().toLocaleDateString('en-CA');
}

export default function ReportesPage() {
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
      <div className={styles.emptyText}>
        Acceso restringido exclusivamente para administradores.
      </div>
    );
  }

  return <ReportesAdmin />;
}

function ReportesAdmin() {
  const router = useRouter();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [sucursalId, setSucursalId] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [productoId, setProductoId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState(hoyLocal());

  const [reporte, setReporte] = useState<ReporteVentas | null>(null);
  const [reporteUtilidad, setReporteUtilidad] = useState<UtilidadReporte | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const tieneFiltrosActivos = Boolean(
    sucursalId || usuarioId || productoId || fechaDesde || fechaHasta !== hoyLocal() || reporte || reporteUtilidad,
  );

  function reiniciarFiltros() {
    setSucursalId('');
    setUsuarioId('');
    setProductoId('');
    setFechaDesde('');
    setFechaHasta(hoyLocal());
    setReporte(null);
    setReporteUtilidad(null);
    setError(null);
  }

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [suc, emp, prods] = await Promise.all([
          listarSucursales(),
          listarEmpleados(),
          listarProductos(),
        ]);
        if (!activo) return;
        setSucursales(suc);
        setEmpleados(emp);
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
      const [datosVentas, datosUtilidades] = await Promise.all([
        obtenerReporteVentas({
          sucursal_id: sucursalId || undefined,
          usuario_id: usuarioId || undefined,
          producto_id: productoId || undefined,
          fecha_desde: fechaDesde || undefined,
          fecha_hasta: fechaHasta || undefined,
        }),
        obtenerReporteUtilidades(fechaDesde || undefined, fechaHasta || undefined)
      ]);
      setReporte(datosVentas);
      setReporteUtilidad(datosUtilidades);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  function descargarPdf() {
    if (!reporte) return;
    const sucursalObj = sucursales.find((s) => s.id === sucursalId);
    const empleadoObj = empleados.find((e) => e.id === usuarioId);
    const productoObj = productos.find((p) => p.id === productoId);

    generarReporteVentasPdf({
      reporte,
      sucursalNombre: sucursalObj?.nombre,
      empleadoNombre: empleadoObj?.nombre_completo,
      productoNombre: productoObj
        ? productoObj.marcas?.nombre
          ? `${productoObj.marcas.nombre} ${productoObj.modelo}`
          : productoObj.modelo
        : undefined,
      fechaDesde,
      fechaHasta,
    });
  }

  function salir() {
    logout();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className={styles.layout}>
      <Sidebar active="reportes" menuAbierto={menuAbierto} onCerrarMenu={() => setMenuAbierto(false)} />

      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.menuBtn}
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú de navegación"
            >
              <IconMenu />
            </button>
            <div className={styles.breadcrumb}>
              <Link href="/" style={{ color: 'var(--text-muted)' }}>Panel</Link>
              <span>/</span>
              <span className={styles.breadcrumbActive}>Auditoría y Reportes de Ventas</span>
            </div>
          </div>
          
        </header>

        <main className={styles.mainContent}>
          <section className={styles.filterCard}>
            <div className={styles.filterHeader}>
              <h2 className={styles.filterTitle}>Filtros de Búsqueda</h2>
            </div>

            <div className={styles.filtersGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Sucursal</span>
                <select
                  className={styles.select}
                  value={sucursalId}
                  onChange={(e) => setSucursalId(e.target.value)}
                >
                  <option value="">Todas las tiendas</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Empleado / Cajero</span>
                <select
                  className={styles.select}
                  value={usuarioId}
                  onChange={(e) => setUsuarioId(e.target.value)}
                >
                  <option value="">Todos los empleados</option>
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre_completo}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Producto / Modelo</span>
                <select
                  className={styles.select}
                  value={productoId}
                  onChange={(e) => setProductoId(e.target.value)}
                >
                  <option value="">Todos los productos</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.marcas?.nombre ? `${p.marcas.nombre} ${p.modelo}` : p.modelo}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Desde</span>
                <input
                  type="date"
                  className={styles.input}
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Hasta</span>
                <input
                  type="date"
                  className={styles.input}
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </label>
            </div>

            <div className={styles.filterActionsBar}>
              {tieneFiltrosActivos && (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={reiniciarFiltros}
                  disabled={cargando}
                  title="Restablecer todos los filtros"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <IconRefresh style={{ width: '13px', height: '13px' }} />
                  <span>Limpiar Filtros</span>
                </button>
              )}

              {reporte && reporte.ventas.length > 0 && (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={descargarPdf}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--primary)',
                    borderColor: 'rgba(62, 50, 211, 0.3)',
                    background: 'rgba(62, 50, 211, 0.05)',
                    fontWeight: 600,
                  }}
                  title="Generar y descargar reporte oficial en formato PDF estructurado"
                >
                  <IconDownload style={{ width: '14px', height: '14px' }} />
                  <span>Descargar Reporte PDF</span>
                </button>
              )}

              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => void consultar()}
                disabled={cargando}
              >
                {cargando ? 'Consultando…' : 'Consultar Reporte'}
              </button>
            </div>
          </section>

          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          {/* Resultados de la Consulta */}
          {reporte && (
            <>
              <section className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>Ventas Registradas</span>
                    <div
                      className={styles.statIconBadge}
                      style={{ background: 'rgba(62, 50, 211, 0.1)', color: 'var(--primary)' }}
                    >
                      <IconReceipt style={{ width: '18px', height: '18px' }} />
                    </div>
                  </div>
                  <div className={`${styles.statValue} mono`}>{reporte.totales.ventas}</div>
                  <div className={styles.statSub}>Transacciones completadas</div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>Monto Total Recaudado</span>
                    <div
                      className={styles.statIconBadge}
                      style={{ background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a' }}
                    >
                      <IconSales style={{ width: '18px', height: '18px' }} />
                    </div>
                  </div>
                  <div
                    className={`${styles.statValue} mono`}
                    style={{ color: 'var(--primary)' }}
                  >
                    {formatearDinero(reporte.totales.monto)}
                  </div>
                  <div className={styles.statSub}>Ingresos brutos acumulados</div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>Unidades Vendidas</span>
                    <div
                      className={styles.statIconBadge}
                      style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' }}
                    >
                      <IconInventory style={{ width: '18px', height: '18px' }} />
                    </div>
                  </div>
                  <div className={`${styles.statValue} mono`}>{reporte.totales.unidades}</div>
                  <div className={styles.statSub}>Baterías y piezas entregadas</div>
                </div>

                {reporteUtilidad && (
                  <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                      <span className={styles.statLabel}>Utilidad Neta (Ganancia)</span>
                      <div
                        className={styles.statIconBadge}
                        style={{ background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a' }}
                      >
                        <IconCash style={{ width: '18px', height: '18px' }} />
                      </div>
                    </div>
                    <div
                      className={`${styles.statValue} mono`}
                      style={{ color: '#16a34a' }}
                    >
                      {formatearDinero(reporteUtilidad.totalUtilidad)}
                    </div>
                    <div className={styles.statSub}>
                      Costo Inv: {formatearDinero(reporteUtilidad.totalCosto)}
                    </div>
                  </div>
                )}
              </section>

              <section className={styles.bentoCard}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <IconReports style={{ color: 'var(--primary)' }} />
                    <span>Detalle de Transacciones (Haz clic en una fila para ver el desglose)</span>
                  </h2>
                  {reporte.ventas.length > 0 && (
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={descargarPdf}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: 'var(--primary)',
                      }}
                    >
                      <IconDownload style={{ width: '12px', height: '12px' }} />
                      <span>Exportar PDF</span>
                    </button>
                  )}
                </div>

                <div className={styles.tableScroll}>
                  {reporte.ventas.length === 0 ? (
                    <div className={styles.emptyText}>
                      No se encontraron ventas para los filtros seleccionados.
                    </div>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Folio</th>
                          <th>Fecha y Hora</th>
                          <th>Sucursal</th>
                          <th>Empleado</th>
                          <th>Método de Pago</th>
                          <th style={{ textAlign: 'center' }}>Ítems</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reporte.ventas.map((venta) => (
                          <VentaFila
                            key={venta.id}
                            folio={venta.folio}
                            fecha={venta.created_at}
                            sucursal={venta.sucursal}
                            empleado={venta.usuario}
                            metodoPago={venta.metodo_pago}
                            desglosePago={venta.desglose_pago}
                            total={venta.total}
                            items={venta.items.map((item) => ({
                              producto: item.producto,
                              cantidad: item.cantidad,
                              precio: item.precio_unitario,
                              tipoPrecio: item.tipo_precio,
                              conCasco: item.con_casco,
                              comisionCasco: item.comision_casco,
                            }))}
                          />
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
              Selecciona los filtros y haz clic en «Consultar Reporte» para generar la auditoría.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function VentaFila({
  folio,
  fecha,
  sucursal,
  empleado,
  metodoPago,
  desglosePago,
  total,
  items,
}: {
  folio: string;
  fecha: string;
  sucursal: string | null;
  empleado: string | null;
  metodoPago: string | null;
  desglosePago?: { metodo: string; monto: number; referencia?: string }[] | null;
  total: number;
  items: {
    producto: string | null;
    cantidad: number;
    precio: number;
    tipoPrecio?: string | null;
    conCasco?: boolean | null;
    comisionCasco?: number | null;
  }[];
}) {
  const [abierto, setAbierto] = useState(false);

  const renderMetodoBadge = () => {
    switch (metodoPago) {
      case 'tarjeta_debito':
        return (
          <span className={styles.paymentMethod} style={{ color: '#0284c7' }}>
            <IconCard style={{ width: '13px', height: '13px', color: '#0284c7' }} />
            <span>T. Débito</span>
          </span>
        );
      case 'tarjeta_credito':
        return (
          <span className={styles.paymentMethod} style={{ color: '#9333ea' }}>
            <IconCard style={{ width: '13px', height: '13px', color: '#9333ea' }} />
            <span>T. Crédito</span>
          </span>
        );
      case 'transferencia':
        return (
          <span className={styles.paymentMethod} style={{ color: '#ea580c' }}>
            <IconBolt style={{ width: '13px', height: '13px', color: '#ea580c' }} />
            <span>Transferencia</span>
          </span>
        );
      case 'mixto':
        return (
          <span
            className={styles.paymentMethod}
            style={{
              color: '#d97706',
              fontWeight: 700,
              background: 'rgba(217, 119, 6, 0.12)',
              padding: '3px 8px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <IconSplit style={{ width: '13px', height: '13px', color: '#d97706' }} />
            <span>Pago Mixto</span>
          </span>
        );
      case 'tarjeta':
        return (
          <span className={styles.paymentMethod}>
            <IconCard style={{ width: '13px', height: '13px', color: 'var(--secondary)' }} />
            <span>Tarjeta</span>
          </span>
        );
      default:
        return (
          <span className={styles.paymentMethod}>
            <IconCash style={{ width: '13px', height: '13px', color: 'var(--success)' }} />
            <span>Efectivo</span>
          </span>
        );
    }
  };

  const formatearNombreMetodo = (m: string) => {
    switch (m) {
      case 'tarjeta_debito':
        return 'Tarjeta Débito';
      case 'tarjeta_credito':
        return 'Tarjeta Crédito';
      case 'transferencia':
        return 'Transferencia';
      case 'efectivo':
        return 'Efectivo';
      default:
        return m;
    }
  };

  return (
    <>
      <tr
        onClick={() => setAbierto(!abierto)}
        style={{ cursor: 'pointer' }}
        title="Haz clic para ver los productos de esta venta"
      >
        <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {abierto ? (
              <IconChevronDown style={{ width: '12px', height: '12px' }} />
            ) : (
              <IconChevronRight style={{ width: '12px', height: '12px' }} />
            )}
            <span>{folio}</span>
          </span>
        </td>
        <td className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {new Date(fecha).toLocaleString('es-MX')}
        </td>
        <td>{sucursal ?? '—'}</td>
        <td>{empleado ?? '—'}</td>
        <td>{renderMetodoBadge()}</td>
        <td style={{ textAlign: 'center' }}>
          <span className={styles.badgeItems}>
            {items.reduce((s, it) => s + it.cantidad, 0)} {items.length === 1 ? 'ítem' : 'ítems'}
          </span>
        </td>
        <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
          {formatearDinero(total)}
        </td>
      </tr>

      {abierto && (
        <tr>
          <td colSpan={7} style={{ background: 'var(--surface-container-low)', padding: '12px 24px' }}>
            {metodoPago === 'mixto' && desglosePago && desglosePago.length > 0 && (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(217, 119, 6, 0.08)',
                  border: '1px solid rgba(217, 119, 6, 0.25)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Desglose de Pago Combinado:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {desglosePago.map((p, pIdx) => (
                    <span
                      key={pIdx}
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '4px 10px',
                        background: '#ffffff',
                        border: '1px solid var(--outline-variant)',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>{formatearNombreMetodo(p.metodo)}:</span>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {formatearDinero(p.monto)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Productos en Folio {folio}:
            </div>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--outline-variant)' }}>
                  <th style={{ textAlign: 'left', padding: '4px 0' }}>Producto / Batería</th>
                  <th style={{ textAlign: 'center', padding: '4px 0' }}>Opción de Precio</th>
                  <th style={{ textAlign: 'center', padding: '4px 0' }}>Casco / Garantía</th>
                  <th style={{ textAlign: 'center', padding: '4px 0' }}>Cantidad</th>
                  <th style={{ textAlign: 'right', padding: '4px 0' }}>Precio Unitario</th>
                  <th style={{ textAlign: 'right', padding: '4px 0' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const comisionUnit = (it.conCasco === false) ? (it.comisionCasco ?? 0) : 0;
                  const precioEfectivo = it.precio + comisionUnit;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                      <td style={{ padding: '6px 0', fontWeight: 600 }}>{it.producto ?? 'Sin nombre'}</td>
                      <td style={{ textAlign: 'center', padding: '6px 0' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            background:
                              it.tipoPrecio === 'precio_especial'
                                ? 'rgba(217, 70, 239, 0.12)'
                                : it.tipoPrecio === 'precio_2'
                                ? 'rgba(234, 88, 12, 0.12)'
                                : it.tipoPrecio === 'precio_3'
                                ? 'rgba(147, 51, 234, 0.12)'
                                : 'rgba(62, 50, 211, 0.1)',
                            color:
                              it.tipoPrecio === 'precio_especial'
                                ? '#d946ef'
                                : it.tipoPrecio === 'precio_2'
                                ? '#ea580c'
                                : it.tipoPrecio === 'precio_3'
                                ? '#9333ea'
                                : 'var(--primary)',
                          }}
                        >
                          {it.tipoPrecio === 'precio_especial'
                            ? 'Precio Especial'
                            : it.tipoPrecio === 'precio_2'
                            ? 'Precio 2'
                            : it.tipoPrecio === 'precio_3'
                            ? 'Precio 3'
                            : 'Precio Default'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '6px 0' }}>
                        {it.conCasco != null ? (
                          it.conCasco ? (
                            <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '11px' }}>
                              Con casco
                            </span>
                          ) : (
                            <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '11px' }}>
                              Sin casco (+{formatearDinero((it.comisionCasco ?? 0) * it.cantidad)})
                            </span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: 'center', padding: '6px 0' }}>{it.cantidad}</td>
                      <td className="mono" style={{ textAlign: 'right', padding: '6px 0' }}>
                        {formatearDinero(it.precio)}
                        {comisionUnit > 0 && (
                          <div style={{ fontSize: '10px', color: '#dc2626' }}>
                            + {formatearDinero(comisionUnit)} com.
                          </div>
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>
                        {formatearDinero(precioEfectivo * it.cantidad)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
