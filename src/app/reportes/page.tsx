'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useSesion } from '@/lib/auth';
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

  if (perfil?.rol !== 'administrador') {
    return (
      <div className={styles.page}>
        <p className={styles.vacio}>Acceso restringido para administradores.</p>
      </div>
    );
  }

  return <Reportes />;
}

function Reportes() {
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

  function descargarCsv() {
    if (!reporte) return;
    const lineas = [
      'folio,fecha,sucursal,empleado,metodo_pago,total,producto,cantidad,precio_unitario',
    ];
    for (const venta of reporte.ventas) {
      const base = [
        venta.folio,
        venta.created_at,
        venta.sucursal ?? '',
        venta.usuario ?? '',
        venta.metodo_pago ?? 'efectivo',
        venta.total.toFixed(2),
      ];
      if (venta.items.length === 0) {
        lineas.push(base.join(','));
      } else {
        for (const item of venta.items) {
          lineas.push(
            [
              ...base,
              `"${(item.producto ?? '').replace(/"/g, '""')}"`,
              item.cantidad,
              item.precio_unitario.toFixed(2),
            ].join(','),
          );
        }
      }
    }
    const blob = new Blob([lineas.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas-${fechaHasta || 'todas'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link href="/" className={styles.brand}>
            ← Panel
          </Link>
          <h1>Reporte de ventas</h1>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.filtros}>
            <label className={styles.campo}>
              <span>Sucursal</span>
              <select
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
              >
                <option value="">Todas</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.campo}>
              <span>Empleado</span>
              <select
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
              >
                <option value="">Todos</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre_completo}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.campo}>
              <span>Producto</span>
              <select
                value={productoId}
                onChange={(e) => setProductoId(e.target.value)}
              >
                <option value="">Todos</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.modelo}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.campo}>
              <span>Desde</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </label>
            <label className={styles.campo}>
              <span>Hasta</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </label>
            <div className={styles.acciones}>
              <button
                className={styles.boton}
                onClick={() => void consultar()}
                disabled={cargando}
              >
                {cargando ? 'Consultando…' : 'Consultar'}
              </button>
              {reporte && reporte.ventas.length > 0 && (
                <button
                  className={styles.botonSecundario}
                  onClick={descargarCsv}
                >
                  Descargar CSV
                </button>
              )}
            </div>
          </div>
        </section>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {reporte && (
          <>
            <section className={styles.resumen}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{reporte.totales.ventas}</span>
                <span className={styles.statLabel}>Ventas</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>
                  {formatearDinero(reporte.totales.monto)}
                </span>
                <span className={styles.statLabel}>Monto total</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>
                  {reporte.totales.unidades}
                </span>
                <span className={styles.statLabel}>Unidades</span>
              </div>
            </section>

            {reporte.ventas.length === 0 ? (
              <p className={styles.vacio}>
                No hay ventas para los filtros seleccionados.
              </p>
            ) : (
              <div className={styles.tablaScroll}>
                <table className={styles.tabla}>
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Fecha</th>
                      <th>Sucursal</th>
                      <th>Empleado</th>
                      <th>Pago</th>
                      <th>Items</th>
                      <th>Total</th>
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
              </div>
            )}
          </>
        )}

        {!reporte && !cargando && !error && (
          <p className={styles.vacio}>
            Aplica los filtros y presiona «Consultar».
          </p>
        )}
      </main>
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
  items: Array<{ producto: string | null; cantidad: number; precio: number }>;
}) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <tr className={styles.filaClick} onClick={() => setAbierta((v) => !v)}>
        <td className={styles.mono}>{folio}</td>
        <td>{new Date(fecha).toLocaleString('es-MX')}</td>
        <td>{sucursal ?? '—'}</td>
        <td>{empleado ?? '—'}</td>
        <td>{metodoPago === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}</td>
        <td>{items.length}</td>
        <td className={styles.total}>{formatearDinero(total)}</td>
      </tr>
      {abierta && (
        <tr>
          <td colSpan={7} className={styles.detalle}>
            {items.length === 0 ? (
              <span>Sin detalle.</span>
            ) : (
              <table className={styles.detalleTabla}>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.producto ?? '—'}</td>
                      <td>{item.cantidad}</td>
                      <td>{formatearDinero(item.precio)}</td>
                      <td>{formatearDinero(item.cantidad * item.precio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
