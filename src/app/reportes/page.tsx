'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { logout, useSesion } from '@/lib/auth';
import {
  type Empleado,
  type ReporteVentas,
  listarEmpleados,
  obtenerReporteVentas,
} from '@/lib/admin';
import {
  type Producto,
  type Sucursal,
  formatearDinero,
  listarProductos,
  listarSucursales,
} from '@/lib/catalogo';
import { generarReporteVentasPdf } from '@/lib/generadorPdf';
import { ThemeToggle } from '@/components/ThemeToggle';
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
} from '@/components/Icons';
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
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const tieneFiltrosActivos = Boolean(
    sucursalId || usuarioId || productoId || fechaDesde || fechaHasta !== hoyLocal() || reporte,
  );

  function reiniciarFiltros() {
    setSucursalId('');
    setUsuarioId('');
    setProductoId('');
    setFechaDesde('');
    setFechaHasta(hoyLocal());
    setReporte(null);
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
      const datos = await obtenerReporteVentas({
        sucursal_id: sucursalId || undefined,
        usuario_id: usuarioId || undefined,
        producto_id: productoId || undefined,
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
    const sucursalObj = sucursales.find((s) => s.id === sucursalId);
    const empleadoObj = empleados.find((e) => e.id === usuarioId);
    const productoObj = productos.find((p) => p.id === productoId);

    generarReporteVentasPdf({
      reporte,
      sucursalNombre: sucursalObj?.nombre,
      empleadoNombre: empleadoObj?.nombre_completo,
      productoNombre: productoObj?.modelo,
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
      {menuAbierto && (
        <div
          className={styles.sidebarBackdrop}
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`${styles.sidebar} ${menuAbierto ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandInfo}>
            <span style={{ color: 'var(--primary)', display: 'flex' }}><IconBolt /></span>
            <div>
              <h1 className={styles.brandTitle}>Casa Baterías</h1>
              <p className={styles.brandSubtitle}>Control Central</p>
            </div>
          </div>
          <button
            className={styles.sidebarCloseBtn}
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
          >
            <IconClose />
          </button>
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
          <Link href="/reportes" className={`${styles.navItem} ${styles.navItemActive}`} onClick={() => setMenuAbierto(false)}>
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
          <ThemeToggle />
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
                      {p.modelo}
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
                  <div className={`${styles.statValue} mono`}>{reporte.totales.ventas}</div>
                  <div className={styles.statLabel}>Ventas Registradas</div>
                </div>

                <div className={styles.statCard}>
                  <div className={`${styles.statValue} mono`} style={{ color: 'var(--primary)' }}>
                    {formatearDinero(reporte.totales.monto)}
                  </div>
                  <div className={styles.statLabel}>Monto Total Recaudado</div>
                </div>

                <div className={styles.statCard}>
                  <div className={`${styles.statValue} mono`}>{reporte.totales.unidades}</div>
                  <div className={styles.statLabel}>Baterías y Unidades Vendidas</div>
                </div>
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
                            total={venta.total}
                            items={venta.items.map((item) => ({
                              producto: item.producto,
                              cantidad: item.cantidad,
                              precio: item.precio_unitario,
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
  total,
  items,
}: {
  folio: string;
  fecha: string;
  sucursal: string | null;
  empleado: string | null;
  metodoPago: string | null;
  total: number;
  items: { producto: string | null; cantidad: number; precio: number }[];
}) {
  const [abierto, setAbierto] = useState(false);

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
        <td>
          <span className={styles.paymentMethod}>
            {metodoPago === 'tarjeta' ? (
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
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Productos en Folio {folio}:
            </div>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--outline-variant)' }}>
                  <th style={{ textAlign: 'left', padding: '4px 0' }}>Producto / Batería</th>
                  <th style={{ textAlign: 'center', padding: '4px 0' }}>Cantidad</th>
                  <th style={{ textAlign: 'right', padding: '4px 0' }}>Precio Unitario</th>
                  <th style={{ textAlign: 'right', padding: '4px 0' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                    <td style={{ padding: '6px 0', fontWeight: 600 }}>{it.producto ?? 'Sin nombre'}</td>
                    <td className="mono" style={{ textAlign: 'center', padding: '6px 0' }}>{it.cantidad}</td>
                    <td className="mono" style={{ textAlign: 'right', padding: '6px 0' }}>{formatearDinero(it.precio)}</td>
                    <td className="mono" style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>{formatearDinero(it.cantidad * it.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
