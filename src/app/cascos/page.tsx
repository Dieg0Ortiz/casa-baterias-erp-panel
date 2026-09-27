'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '@/lib/api';
import { logout, useSesion } from '@/lib/auth';
import {
  type CascoPendiente,
  type IntercambioCasco,
  type MovimientoCasco,
  ajustarCascoBodega,
  listarCascosPendientes,
  listarIntercambiosCascos,
  listarMovimientosCascos,
  registrarIntercambioCasco,
  resolverCasco,
} from '@/lib/admin';
import {
  type Producto,
  type Sucursal,
  formatearDinero,
  listarProductos,
  listarSucursales,
} from '@/lib/catalogo';
import { type ItemInventario, listarInventario } from '@/lib/inventario';
import { GRUPOS_CASCOS, SIN_GRUPO, grupoDeModelo } from '@/lib/grupos-cascos';
import {
  IconSearch,
  IconClose,
  IconMenu,
  IconCasco,
  IconRefresh,
  IconSplit,
  IconReceipt,
  IconInventory,
  IconPlus,
} from '@/components/Icons';
import { Sidebar } from '@/components/Sidebar';
import styles from './cascos.module.css';

function mensajeError(e: unknown): string {
  return e instanceof ApiError
    ? e.message
    : 'Ocurrió un error. Intenta de nuevo.';
}

export default function CascosPage() {
  const router = useRouter();
  const { autenticado, perfil } = useSesion();

  const [cascos, setCascos] = useState<CascoPendiente[]>([]);
  const [intercambios, setIntercambios] = useState<IntercambioCasco[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCasco[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [inventario, setInventario] = useState<ItemInventario[]>([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pestañaPrincipal, setPestañaPrincipal] = useState<'depositos' | 'modelos' | 'bodega' | 'intercambios'>('depositos');
  const [sucursalBodega, setSucursalBodega] = useState('');
  const [ajusteBodega, setAjusteBodega] = useState<{
    tipo: 'alta' | 'baja_proveedor';
    productoId: string;
    sucursalId: string;
  } | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'resuelto' | 'vencido'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Modales
  const [cascoAResolver, setCascoAResolver] = useState<CascoPendiente | null>(null);
  const [modalNuevoIntercambio, setModalNuevoIntercambio] = useState(false);
  const [intercambioDetalle, setIntercambioDetalle] = useState<IntercambioCasco | null>(null);

  useEffect(() => {
    if (!autenticado) router.replace('/login');
  }, [autenticado, router]);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [datosCascos, datosIntercambios, datosProductos, datosSucursales, datosInventario, datosMovimientos] = await Promise.all([
        listarCascosPendientes().catch(() => []),
        listarIntercambiosCascos().catch(() => []),
        listarProductos().catch(() => []),
        listarSucursales().catch(() => []),
        listarInventario().catch(() => []),
        listarMovimientosCascos().catch(() => []),
      ]);
      setCascos(datosCascos);
      setIntercambios(datosIntercambios);
      setMovimientos(datosMovimientos);
      setProductos(datosProductos);
      setSucursales(datosSucursales);
      setInventario(datosInventario);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (autenticado && perfil?.rol === 'administrador') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cargar();
    }
  }, [autenticado, perfil]);

  const ahora = new Date().getTime();

  // Filtrado de depósitos
  const cascosFiltrados = cascos.filter((c) => {
    if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const matchFolio = (c.folio ?? '').toLowerCase().includes(q);
      const matchProducto = (c.producto ?? '').toLowerCase().includes(q);
      const matchRecibido = (c.casco_recibido ?? '').toLowerCase().includes(q);
      const matchCliente = (c.nombre_cliente ?? '').toLowerCase().includes(q);
      const matchSucursal = (c.sucursal ?? '').toLowerCase().includes(q);
      const matchNotas = (c.notas ?? '').toLowerCase().includes(q);
      if (!matchFolio && !matchProducto && !matchRecibido && !matchCliente && !matchSucursal && !matchNotas) return false;
    }
    return true;
  });

  // Filtrado de intercambios
  const intercambiosFiltrados = intercambios.filter((i) => {
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const matchFolio = (i.folio ?? '').toLowerCase().includes(q);
      const matchCliente = (i.cliente_nombre ?? '').toLowerCase().includes(q);
      const matchSucursal = (i.sucursales?.nombre ?? '').toLowerCase().includes(q);
      const matchUsuario = (i.usuarios?.nombre_completo ?? '').toLowerCase().includes(q);
      const matchItem = (i.intercambio_casco_items ?? []).some((it) =>
        (it.casco_saliente?.modelo ?? '').toLowerCase().includes(q) ||
        (it.casco_entrante?.modelo ?? '').toLowerCase().includes(q)
      );
      if (!matchFolio && !matchCliente && !matchSucursal && !matchUsuario && !matchItem) return false;
    }
    return true;
  });

  // Métricas
  const totalPendientes = cascos.filter((c) => c.estado === 'pendiente').length;
  const montoRetenido = cascos
    .filter((c) => c.estado === 'pendiente')
    .reduce((s, c) => s + c.comision_cobrada, 0);
  const cascosEnBodega = inventario.reduce((s, i) => s + (i.cascos_disponibles || 0), 0);

  const totalIntercambios = intercambios.length;
  const gananciaIntercambios = intercambios.reduce((s, i) => s + Number(i.monto_cobrado || 0), 0);

  // Agrupación por modelo
  const resumenPorModelo = useMemo(() => {
    const resueltos = cascos.filter((c) => c.estado === 'resuelto');
    const mapa = new Map<string, {
      modelo: string;
      cantidad: number;
      montoTotal: number;
      ultimaFecha: string;
      esCatalogo: boolean;
      productoId?: string;
    }>();

    for (const c of resueltos) {
      let nombreModelo = c.casco_recibido;
      let esCatalogo = Boolean(c.casco_producto_id);

      if (!nombreModelo && c.notas && c.notas.includes('[Modelo:')) {
        const match = c.notas.match(/\[Modelo:\s*([^\]]+)\]/);
        if (match && match[1]) {
          nombreModelo = match[1].trim();
          esCatalogo = false;
        }
      }

      if (!nombreModelo) {
        nombreModelo = c.producto ? `${c.producto} (Equiv.)` : 'Casco Estándar';
      }

      const fechaItem = c.resuelto_en ?? c.created_at;
      const actual = mapa.get(nombreModelo);
      if (actual) {
        actual.cantidad += 1;
        actual.montoTotal += c.monto_devuelto;
        if (new Date(fechaItem).getTime() > new Date(actual.ultimaFecha).getTime()) {
          actual.ultimaFecha = fechaItem;
        }
      } else {
        mapa.set(nombreModelo, {
          modelo: nombreModelo,
          cantidad: 1,
          montoTotal: c.monto_devuelto,
          ultimaFecha: fechaItem,
          esCatalogo,
          productoId: c.casco_producto_id ?? undefined,
        });
      }
    }

    return Array.from(mapa.values()).sort((a, b) => b.cantidad - a.cantidad);
  }, [cascos]);

  const filasBodega = useMemo(() => {
    return inventario
      .filter((i) => i.cascos_disponibles > 0 && (!sucursalBodega || i.sucursal_id === sucursalBodega))
      .map((i) => ({
        ...i,
        grupo: grupoDeModelo(i.modelo),
        sucursal: sucursales.find((s) => s.id === i.sucursal_id)?.nombre ?? '—',
      }))
      .sort((a, b) =>
        a.grupo.nombre.localeCompare(b.grupo.nombre, 'es') ||
        (a.modelo ?? '').localeCompare(b.modelo ?? '', 'es') ||
        a.sucursal.localeCompare(b.sucursal, 'es'),
      );
  }, [inventario, sucursalBodega, sucursales]);

  const resumenGrupos = useMemo(() => {
    const base = [...GRUPOS_CASCOS, SIN_GRUPO].map((grupo) => ({
      ...grupo,
      cantidad: 0,
      valor: 0,
    }));
    for (const fila of filasBodega) {
      const slot = base.find((grupo) => grupo.id === fila.grupo.id);
      if (!slot) continue;
      slot.cantidad += fila.cascos_disponibles;
      slot.valor += fila.cascos_disponibles * fila.grupo.precio;
    }
    return base;
  }, [filasBodega]);

  function calcularDiasRestantes(fechaLimiteIso: string) {
    const limite = new Date(fechaLimiteIso).getTime();
    const diff = limite - ahora;
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return dias;
  }


  if (!autenticado) return null;

  if (perfil?.rol !== 'administrador') {
    return (
      <div className={styles.layout}>
        <div style={{ margin: 'auto', textAlign: 'center', padding: '40px' }}>
          <h1>Acceso restringido</h1>
          <p>
            Este panel es solo para administradores. Tu usuario tiene el rol{' '}
            <strong>trabajador</strong> y debe usar la app de ventas.
          </p>
          <button className={styles.btnPrimarySm} onClick={() => { logout(); router.replace('/login'); }}>
            Salir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <Sidebar active="cascos" menuAbierto={menuAbierto} onCerrarMenu={() => setMenuAbierto(false)} />

      {/* Contenedor Principal */}
      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.menuBtn}
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
            >
              <IconMenu />
            </button>
            <div className={styles.breadcrumb}>
              <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Panel</Link>
              <span>/</span>
              <span className={styles.breadcrumbActive}>Control de Cascos & Trueques</span>
            </div>
          </div>
        </header>

        <main className={styles.mainContent}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              <span>{error}</span>
              <button className={styles.btnSecondary} onClick={() => void cargar()}>
                Reintentar
              </button>
            </div>
          )}

          {/* Tarjetas KPI */}
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Depósitos Pendientes</span>
                <IconCasco style={{ color: '#ca8a04', opacity: 0.8 }} />
              </div>
              <div className={styles.statValue} style={{ color: '#ca8a04' }}>
                {totalPendientes}
              </div>
              <div className={styles.statHint}>Baterías por devolver por clientes</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Depósitos en Garantía</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>MXN</span>
              </div>
              <div className={styles.statValue} style={{ color: 'var(--primary)' }}>
                {formatearDinero(montoRetenido)}
              </div>
              <div className={styles.statHint}>Monto en resguardo de clientes</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Cascos en Bodega</span>
                <IconInventory style={{ color: '#16a34a', opacity: 0.8 }} />
              </div>
              <div className={styles.statValue} style={{ color: '#16a34a' }}>
                {cascosEnBodega}
              </div>
              <div className={styles.statHint}>Cascos usados en inventario</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Intercambios Realizados</span>
                <IconSplit style={{ color: '#3b82f6', opacity: 0.8 }} />
              </div>
              <div className={styles.statValue} style={{ color: '#3b82f6' }}>
                {totalIntercambios}
              </div>
              <div className={styles.statHint}>
                Ganancia Neta: <strong>{formatearDinero(gananciaIntercambios)}</strong>
              </div>
            </div>
          </section>

          {/* Pestañas Principales */}
          <div className={styles.mainTabs}>
            <button
              type="button"
              className={`${styles.mainTab} ${pestañaPrincipal === 'depositos' ? styles.mainTabActive : ''}`}
              onClick={() => setPestañaPrincipal('depositos')}
            >
              <IconCasco />
              <span>Depósitos y Devoluciones ({cascos.length})</span>
            </button>
            <button
              type="button"
              className={`${styles.mainTab} ${pestañaPrincipal === 'modelos' ? styles.mainTabActive : ''}`}
              onClick={() => setPestañaPrincipal('modelos')}
            >
              <IconInventory />
              <span>Cascos Recibidos por Modelo ({resumenPorModelo.length})</span>
            </button>
            <button
              type="button"
              className={`${styles.mainTab} ${pestañaPrincipal === 'bodega' ? styles.mainTabActive : ''}`}
              onClick={() => setPestañaPrincipal('bodega')}
            >
              <IconInventory />
              <span>Bodega por grupo ({cascosEnBodega})</span>
            </button>
            <button
              type="button"
              className={`${styles.mainTab} ${pestañaPrincipal === 'intercambios' ? styles.mainTabActive : ''}`}
              onClick={() => setPestañaPrincipal('intercambios')}
            >
              <IconSplit />
              <span>Intercambio de Cascos ({intercambios.length})</span>
            </button>
          </div>

          {/* ==================================================================== */}
          {/* VISTA 1: DEPÓSITOS Y DEVOLUCIONES                                    */}
          {/* ==================================================================== */}
          {pestañaPrincipal === 'depositos' && (
            <section className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <IconCasco style={{ color: 'var(--primary)' }} />
                  <span>Registros de Cascos y Depósitos ({cascosFiltrados.length})</span>
                </h2>
                <button type="button" className={styles.btnSecondary} onClick={cargar} disabled={cargando}>
                  <IconRefresh />
                  <span>Actualizar</span>
                </button>
              </div>

              {/* Toolbar */}
              <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                  <IconSearch className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar folio, batería, cliente…"
                  />
                </div>

                <div className={styles.filters}>
                  {(['todos', 'pendiente', 'resuelto', 'vencido'] as const).map((estado) => (
                    <button
                      key={estado}
                      type="button"
                      className={`${styles.filterBtn} ${filtroEstado === estado ? styles.filterBtnActive : ''}`}
                      onClick={() => setFiltroEstado(estado)}
                    >
                      {estado === 'todos' && 'Todos'}
                      {estado === 'pendiente' && 'Pendientes'}
                      {estado === 'resuelto' && 'Devueltos'}
                      {estado === 'vencido' && 'Vencidos'}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Folio y Fecha</th>
                      <th style={{ width: '28%' }}>Batería y Cliente</th>
                      <th style={{ width: '16%' }}>Sucursal</th>
                      <th style={{ width: '14%', textAlign: 'right' }}>Depósito</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Estado</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargando ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyText}>Cargando información…</td>
                      </tr>
                    ) : cascosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyText}>No se encontraron registros de cascos.</td>
                      </tr>
                    ) : (
                      cascosFiltrados.map((c) => {
                        const dias = calcularDiasRestantes(c.fecha_limite);
                        const esPendiente = c.estado === 'pendiente';
                        const esVencido = esPendiente && dias < 0;

                        return (
                          <tr key={c.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }} className="mono">
                                {c.folio ?? 'S/F'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {new Date(c.created_at).toLocaleDateString('es-MX', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{c.producto ?? 'Batería sin especificar'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Cliente: <strong>{c.nombre_cliente ?? 'General'}</strong>
                                {c.telefono_cliente ? ` • Tel: ${c.telefono_cliente}` : ''}
                              </div>
                            </td>
                            <td>{c.sucursal ?? '—'}</td>
                            <td style={{ textAlign: 'right' }} className="mono">
                              <div style={{ fontWeight: 700, color: esPendiente ? '#ca8a04' : '#16a34a' }}>
                                {formatearDinero(c.comision_cobrada)}
                              </div>
                              {c.estado === 'resuelto' && (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                  Devuelto: {formatearDinero(c.monto_devuelto)}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {esVencido ? (
                                <span className={styles.badgeVencido}>Vencido</span>
                              ) : c.estado === 'pendiente' ? (
                                <span className={dias <= 3 ? styles.badgeUrgente : styles.badgePendiente}>
                                  {dias >= 0 ? `${dias}d restantes` : 'Pendiente'}
                                </span>
                              ) : (
                                <span className={styles.badgeResuelto}>Devuelto</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {c.estado === 'pendiente' ? (
                                <button
                                  type="button"
                                  className={styles.btnPriceAction}
                                  onClick={() => setCascoAResolver(c)}
                                  title="Registrar devolución de casco"
                                >
                                  <IconCasco style={{ width: '13px', height: '13px' }} />
                                  <span>Devolver</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ==================================================================== */}
          {/* VISTA 2: CASCOS RECIBIDOS POR MODELO                                 */}
          {/* ==================================================================== */}
          {pestañaPrincipal === 'modelos' && (
            <section className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <IconInventory style={{ color: 'var(--primary)' }} />
                  <span>Resumen de Baterías Viejas Recibidas ({resumenPorModelo.length} Modelos)</span>
                </h2>
                <button type="button" className={styles.btnSecondary} onClick={cargar} disabled={cargando}>
                  <IconRefresh />
                  <span>Actualizar</span>
                </button>
              </div>

              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Modelo de Casco Recibido</th>
                      <th style={{ textAlign: 'center', width: '15%' }}>Origen</th>
                      <th style={{ textAlign: 'center', width: '15%' }}>Cantidad en Bodega</th>
                      <th style={{ textAlign: 'right', width: '20%' }}>Monto Total Devuelto</th>
                      <th style={{ textAlign: 'right', width: '20%' }}>Última Recepción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenPorModelo.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.emptyText}>
                          No hay cascos recibidos registrados en el sistema todavía.
                        </td>
                      </tr>
                    ) : (
                      resumenPorModelo.map((m) => (
                        <tr key={m.modelo}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {m.modelo}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={m.esCatalogo ? styles.badgeResuelto : styles.badgePendiente}>
                              {m.esCatalogo ? 'Catálogo' : 'Personalizado'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '15px' }} className="mono">
                            {m.cantidad}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }} className="mono">
                            {formatearDinero(m.montoTotal)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>
                            {new Date(m.ultimaFecha).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ==================================================================== */}
          {/* VISTA: BODEGA POR GRUPO (alta, baja a proveedor, clasificación)      */}
          {/* ==================================================================== */}
          {pestañaPrincipal === 'bodega' && (
            <section className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <IconInventory style={{ color: 'var(--primary)' }} />
                  <span>Cascos en bodega por grupo</span>
                </h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={styles.btnPrimarySm}
                    onClick={() => setAjusteBodega({
                      tipo: 'alta',
                      productoId: '',
                      sucursalId: sucursalBodega || sucursales[0]?.id || '',
                    })}
                  >
                    <IconPlus />
                    <span>Dar de alta</span>
                  </button>
                  <button type="button" className={styles.btnSecondary} onClick={cargar} disabled={cargando}>
                    <IconRefresh />
                    <span>Actualizar</span>
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                El grupo sale de la hoja del proveedor. Dar de alta suma un casco comprado.
                Entregar al proveedor lo resta de esa sucursal. El intercambio con un cliente sigue en su pestaña.
              </p>

              <label className={styles.field} style={{ maxWidth: '280px', marginBottom: '14px' }}>
                <span className={styles.fieldLabel}>Sucursal</span>
                <select
                  className={styles.select}
                  value={sucursalBodega}
                  onChange={(e) => setSucursalBodega(e.target.value)}
                >
                  <option value="">Todas las sucursales</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </label>

              <div className={styles.statsGrid}>
                {resumenGrupos.map((grupo) => (
                  <div key={grupo.id} className={styles.statCard}>
                    <div className={styles.statHeader}>
                      <span className={styles.statLabel}>{grupo.nombre}</span>
                    </div>
                    <div className={styles.statValue} style={{ fontSize: '22px' }}>{grupo.cantidad}</div>
                    <div className={styles.statHint}>
                      {grupo.precio > 0
                        ? `${formatearDinero(grupo.precio)} c/u · ${formatearDinero(grupo.valor)}`
                        : 'Modelo fuera de la hoja'}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Grupo</th>
                      <th>Batería</th>
                      <th>Sucursal</th>
                      <th style={{ textAlign: 'center' }}>En bodega</th>
                      <th style={{ textAlign: 'right' }}>Valor proveedor</th>
                      <th style={{ textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasBodega.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyText}>
                          No hay cascos en bodega{sucursalBodega ? ' en esta sucursal' : ''}.
                        </td>
                      </tr>
                    ) : filasBodega.map((fila) => (
                      <tr key={`${fila.sucursal_id}-${fila.producto_id}`}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{fila.grupo.nombre}</div>
                          {fila.grupo.id !== 'sin-grupo' && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {formatearDinero(fila.grupo.precio)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {fila.marca ? `${fila.marca} ` : ''}{fila.modelo}
                          </div>
                        </td>
                        <td>{fila.sucursal}</td>
                        <td style={{ textAlign: 'center', fontWeight: 800 }} className="mono">
                          {fila.cascos_disponibles}
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {formatearDinero(fila.cascos_disponibles * fila.grupo.precio)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className={styles.btnPriceAction}
                            onClick={() => setAjusteBodega({
                              tipo: 'baja_proveedor',
                              productoId: fila.producto_id ?? '',
                              sucursalId: fila.sucursal_id,
                            })}
                          >
                            Entregar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {movimientos.length > 0 && (
                <div style={{ marginTop: '18px' }}>
                  <h3 style={{ fontSize: '14px', margin: '0 0 8px' }}>Últimos movimientos</h3>
                  <div className={styles.tableScroll}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Movimiento</th>
                          <th>Batería</th>
                          <th>Sucursal</th>
                          <th style={{ textAlign: 'center' }}>Cantidad</th>
                          <th>Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientos.slice(0, 12).map((m) => (
                          <tr key={m.id}>
                            <td style={{ fontSize: '12px' }}>
                              {new Date(m.created_at).toLocaleString('es-MX', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                              })}
                            </td>
                            <td>{m.tipo === 'alta' ? 'Alta' : 'Entrega a proveedor'}</td>
                            <td>
                              {m.productos?.marcas?.nombre ? `${m.productos.marcas.nombre} ` : ''}
                              {m.productos?.modelo ?? '—'}
                            </td>
                            <td>{m.sucursales?.nombre ?? '—'}</td>
                            <td style={{ textAlign: 'center' }} className="mono">{m.cantidad}</td>
                            <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.nota ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ==================================================================== */}
          {/* VISTA 3: INTERCAMBIO DE CASCOS (TRUEQUES)                            */}
          {/* ==================================================================== */}
          {pestañaPrincipal === 'intercambios' && (
            <section className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <IconSplit style={{ color: '#3b82f6' }} />
                  <span>Registro de Intercambios de Cascos ({intercambiosFiltrados.length})</span>
                </h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() => setModalNuevoIntercambio(true)}
                  >
                    <IconPlus />
                    <span>Registrar Intercambio</span>
                  </button>
                  <button type="button" className={styles.btnSecondary} onClick={cargar} disabled={cargando}>
                    <IconRefresh />
                    <span>Actualizar</span>
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                  <IconSearch className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar folio, modelo entregado/recibido, cliente..."
                  />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Tarifa estándar: <strong style={{ color: 'var(--text-primary)' }}>$150.00 MXN</strong> por intercambio
                </div>
              </div>

              {/* Tabla de Intercambios */}
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '18%' }}>Folio y Fecha</th>
                      <th style={{ width: '16%' }}>Sucursal y Atendió</th>
                      <th style={{ width: '22%' }}>Casco Entregado (Saliente)</th>
                      <th style={{ width: '22%' }}>Casco Recibido (Entrante)</th>
                      <th style={{ width: '12%', textAlign: 'right' }}>Cobrado</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargando ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyText}>Cargando intercambios…</td>
                      </tr>
                    ) : intercambiosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyText}>
                          No hay intercambios registrados aún. Haz clic en "Registrar Intercambio" para registrar el primero.
                        </td>
                      </tr>
                    ) : (
                      intercambiosFiltrados.map((item) => {
                        const primerItem = item.intercambio_casco_items?.[0];
                        const cant = primerItem?.cantidad ?? 1;

                        return (
                          <tr key={item.id}>
                            <td>
                              <div style={{ fontWeight: 700 }} className="mono">
                                {item.folio}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {new Date(item.created_at).toLocaleDateString('es-MX', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{item.sucursales?.nombre ?? '—'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {item.usuarios?.nombre_completo ?? 'Personal'}
                              </div>
                            </td>
                            <td>
                              <div className={styles.exchangeBadgeOutgoing}>
                                <span>↑ Saliente ({cant}):</span>
                                <strong>
                                  {primerItem?.casco_saliente?.marcas?.nombre ? `${primerItem.casco_saliente.marcas.nombre} ` : ''}
                                  {primerItem?.casco_saliente?.modelo ?? 'Batería'}
                                </strong>
                              </div>
                            </td>
                            <td>
                              <div className={styles.exchangeBadgeIncoming}>
                                <span>↓ Entrante ({cant}):</span>
                                <strong>
                                  {primerItem?.casco_entrante?.marcas?.nombre ? `${primerItem.casco_entrante.marcas.nombre} ` : ''}
                                  {primerItem?.casco_entrante?.modelo ?? 'Batería'}
                                </strong>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span className="mono" style={{ fontWeight: 700, color: '#16a34a', fontSize: '14px' }}>
                                {formatearDinero(item.monto_cobrado)}
                              </span>
                              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                {item.metodo_pago}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className={styles.btnPriceAction}
                                onClick={() => setIntercambioDetalle(item)}
                                title="Ver comprobante detallado"
                              >
                                <IconReceipt style={{ width: '13px', height: '13px' }} />
                                <span>Ver</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* ==================================================================== */}
      {/* MODALES UNIFICADOS                                                   */}
      {/* ==================================================================== */}

      {ajusteBodega && (
        <ModalAjusteBodega
          tipoInicial={ajusteBodega.tipo}
          productoInicial={ajusteBodega.productoId}
          sucursalInicial={ajusteBodega.sucursalId}
          sucursales={sucursales}
          productos={productos}
          inventario={inventario}
          onCerrar={() => setAjusteBodega(null)}
          onExito={() => {
            setAjusteBodega(null);
            void cargar();
          }}
        />
      )}

      {/* Modal Devolver Casco Pendiente */}
      {cascoAResolver && (
        <ModalResolverCasco
          casco={cascoAResolver}
          productos={productos}
          onCerrar={() => setCascoAResolver(null)}
          onExito={() => {
            setCascoAResolver(null);
            void cargar();
          }}
        />
      )}

      {/* Modal Registrar Nuevo Intercambio de Casco */}
      {modalNuevoIntercambio && (
        <ModalNuevoIntercambio
          sucursales={sucursales}
          productos={productos}
          inventario={inventario}
          onCerrar={() => setModalNuevoIntercambio(false)}
          onExito={() => {
            setModalNuevoIntercambio(false);
            void cargar();
          }}
        />
      )}

      {/* Modal Detalle Intercambio */}
      {intercambioDetalle && (
        <ModalDetalleIntercambio
          intercambio={intercambioDetalle}
          onCerrar={() => setIntercambioDetalle(null)}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL BASE COMPONENT (Scroll locked, centered, standard design)
// ----------------------------------------------------------------------
function Modal({
  titulo,
  icono,
  onCerrar,
  children,
  maxWidth = '580px',
}: {
  titulo: string;
  icono?: ReactNode;
  onCerrar: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className={styles.overlay} onClick={onCerrar}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {icono}
            <h3>{titulo}</h3>
          </div>
          <button className={styles.closeBtn} onClick={onCerrar} aria-label="Cerrar">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL: Resolver Casco Pendiente
// ----------------------------------------------------------------------
function ModalResolverCasco({
  casco,
  productos,
  onCerrar,
  onExito,
}: {
  casco: CascoPendiente;
  productos: Producto[];
  onCerrar: () => void;
  onExito: () => void;
}) {
  const [tipoModelo, setTipoModelo] = useState<'catalogo' | 'personalizado'>('catalogo');
  const [cascoProductoId, setCascoProductoId] = useState('');
  const [modeloPersonalizado, setModeloPersonalizado] = useState('');
  const [montoDevolver, setMontoDevolver] = useState(String(casco.comision_cobrada));
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baterias = useMemo(() => productos.filter((p) => p.requiere_casco), [productos]);

  function seleccionarBateriaCatalogo(prodId: string) {
    setCascoProductoId(prodId);
    if (!prodId) {
      setMontoDevolver(String(casco.comision_cobrada));
      return;
    }
    const bat = baterias.find((b) => b.id === prodId);
    if (bat && bat.comision_casco != null && bat.comision_casco > 0) {
      setMontoDevolver(String(bat.comision_casco));
    } else {
      setMontoDevolver(String(casco.comision_cobrada));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const monto = parseFloat(montoDevolver);
    if (isNaN(monto) || monto < 0) {
      setError('El monto a devolver debe ser un número mayor o igual a 0');
      return;
    }

    if (tipoModelo === 'personalizado' && !modeloPersonalizado.trim()) {
      setError('Por favor escribe el modelo o marca del casco que estás recibiendo');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      let notaFinal = notas.trim();
      if (tipoModelo === 'personalizado' && modeloPersonalizado.trim()) {
        notaFinal = `[Modelo: ${modeloPersonalizado.trim()}] ${notaFinal}`.trim();
      }

      await resolverCasco(casco.id, {
        monto_devuelto: monto,
        casco_producto_id: tipoModelo === 'catalogo' && cascoProductoId ? cascoProductoId : undefined,
        notas: notaFinal || undefined,
      });
      onExito();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Registrar Devolución de Casco" icono={<IconCasco style={{ color: 'var(--primary)' }} />} onCerrar={onCerrar}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.infoBox}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Folio de Venta:</span>
            <span className="mono" style={{ fontWeight: 700 }}>{casco.folio ?? '—'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Batería Comprada:</span>
            <span className={styles.infoValue}>{casco.producto ?? 'Batería'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Depósito Retenido:</span>
            <span className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
              {formatearDinero(casco.comision_cobrada)}
            </span>
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>¿Qué modelo de casco está entregando el cliente?</span>
          <div className={styles.radioGroup}>
            <label className={`${styles.radioOption} ${tipoModelo === 'catalogo' ? styles.radioOptionSelected : ''}`}>
              <input
                type="radio"
                name="tipoModelo"
                checked={tipoModelo === 'catalogo'}
                onChange={() => setTipoModelo('catalogo')}
              />
              <span>Lista de la Tienda</span>
            </label>
            <label className={`${styles.radioOption} ${tipoModelo === 'personalizado' ? styles.radioOptionSelected : ''}`}>
              <input
                type="radio"
                name="tipoModelo"
                checked={tipoModelo === 'personalizado'}
                onChange={() => setTipoModelo('personalizado')}
              />
              <span>Otro Modelo</span>
            </label>
          </div>
        </div>

        {tipoModelo === 'catalogo' ? (
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Seleccionar Batería del Catálogo</span>
            <select
              className={styles.select}
              value={cascoProductoId}
              onChange={(e) => seleccionarBateriaCatalogo(e.target.value)}
            >
              <option value="">-- Mismo modelo / Equivalente al depósito ($ {casco.comision_cobrada}.00) --</option>
              {baterias.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.marcas?.nombre} {b.modelo} (Valor: {b.comision_casco ? formatearDinero(b.comision_casco) : '$0.00'})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Escribir Modelo / Marca del Casco Recibido *</span>
            <input
              className={styles.input}
              value={modeloPersonalizado}
              onChange={(e) => setModeloPersonalizado(e.target.value)}
              placeholder="Ej. LTH L-42, América 60Ah..."
              required
            />
          </label>
        )}

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Monto a Devolver en Efectivo ($ MXN) *</span>
          <input
            className={styles.input}
            inputMode="decimal"
            value={montoDevolver}
            onChange={(e) => setMontoDevolver(e.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Observaciones / Notas (Opcional)</span>
          <input
            className={styles.input}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej. Casco en buen estado."
          />
        </label>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnPrimarySm} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Confirmar y Devolver Monto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ----------------------------------------------------------------------
// MODAL: Registrar Nuevo Intercambio de Casco
// ----------------------------------------------------------------------
function ModalNuevoIntercambio({
  sucursales,
  productos,
  inventario,
  onCerrar,
  onExito,
}: {
  sucursales: Sucursal[];
  productos: Producto[];
  inventario: ItemInventario[];
  onCerrar: () => void;
  onExito: () => void;
}) {
  const [sucursalId, setSucursalId] = useState(sucursales[0]?.id ?? '');
  const [salienteId, setSalienteId] = useState('');
  const [entranteId, setEntranteId] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [tarifaUnitaria, setTarifaUnitaria] = useState('150.00');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtrar baterías
  const baterias = useMemo(() => productos.filter((p) => p.requiere_casco), [productos]);

  // Stock de cascos disponibles en la sucursal seleccionada
  const stockCascosSaliente = useMemo(() => {
    if (!salienteId || !sucursalId) return 0;
    const item = inventario.find(
      (inv) => inv.producto_id === salienteId && inv.sucursal_id === sucursalId
    );
    return item?.cascos_disponibles ?? 0;
  }, [salienteId, sucursalId, inventario]);

  const prodSaliente = useMemo(() => baterias.find((b) => b.id === salienteId), [baterias, salienteId]);
  const prodEntrante = useMemo(() => baterias.find((b) => b.id === entranteId), [baterias, entranteId]);

  const numCantidad = parseInt(cantidad, 10) || 1;
  const numTarifa = parseFloat(tarifaUnitaria) || 0;
  const totalCobrar = numCantidad * numTarifa;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sucursalId) {
      setError('Selecciona una sucursal');
      return;
    }
    if (!salienteId) {
      setError('Selecciona el casco que se lleva el cliente');
      return;
    }
    if (!entranteId) {
      setError('Selecciona el casco que deja el cliente');
      return;
    }
    if (numCantidad <= 0) {
      setError('La cantidad debe ser al menos 1');
      return;
    }
    if (stockCascosSaliente < numCantidad) {
      setError(`Stock insuficiente: solo hay ${stockCascosSaliente} cascos disponibles de este modelo en la sucursal.`);
      return;
    }
    if (!clienteNombre.trim()) {
      setError('El nombre del cliente es obligatorio');
      return;
    }
    if (!clienteTelefono.trim()) {
      setError('El teléfono del cliente es obligatorio');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      await registrarIntercambioCasco({
        sucursal_id: sucursalId,
        metodo_pago: metodoPago,
        monto_cobrado: totalCobrar,
        cliente_nombre: clienteNombre.trim(),
        cliente_telefono: clienteTelefono.trim(),
        notas: notas.trim() || undefined,
        items: [
          {
            casco_saliente_id: salienteId,
            casco_entrante_id: entranteId,
            cantidad: numCantidad,
            precio_unitario: numTarifa,
          },
        ],
      });
      onExito();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Registrar Intercambio de Cascos" icono={<IconSplit style={{ color: '#3b82f6' }} />} onCerrar={onCerrar} maxWidth="620px">
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Sucursal */}
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Sucursal donde se realiza el trueque *</span>
          <select
            className={styles.select}
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            required
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} {s.es_matriz ? '(Matriz)' : ''}
              </option>
            ))}
          </select>
        </label>

        {/* Batería Saliente */}
        <label className={styles.field}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={styles.fieldLabel}>Casco que se entrega al cliente (Saliente de bodega) *</span>
            {salienteId && (
              <span style={{ fontSize: '11px', fontWeight: 600, color: stockCascosSaliente > 0 ? '#16a34a' : '#ef4444' }}>
                Stock en bodega: {stockCascosSaliente}
              </span>
            )}
          </div>
          <select
            className={styles.select}
            value={salienteId}
            onChange={(e) => setSalienteId(e.target.value)}
            required
          >
            <option value="">-- Seleccionar batería del inventario --</option>
            {baterias.map((b) => {
              const stock = inventario.find(
                (inv) => inv.producto_id === b.id && inv.sucursal_id === sucursalId
              )?.cascos_disponibles ?? 0;
              return (
                <option key={b.id} value={b.id} disabled={stock <= 0}>
                  {b.marcas?.nombre} {b.modelo} (Disponibles: {stock})
                </option>
              );
            })}
          </select>
        </label>

        {/* Batería Entrante */}
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Casco que deja el cliente (Entrante a bodega) *</span>
          <select
            className={styles.select}
            value={entranteId}
            onChange={(e) => setEntranteId(e.target.value)}
            required
          >
            <option value="">-- Seleccionar modelo recibido --</option>
            {baterias.map((b) => (
              <option key={b.id} value={b.id}>
                {b.marcas?.nombre} {b.modelo}
              </option>
            ))}
          </select>
        </label>

        {/* Cantidad y Tarifa */}
        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Cantidad de cascos *</span>
            <input
              type="number"
              min="1"
              className={styles.input}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Cobro por intercambio ($ MXN) *</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={tarifaUnitaria}
              onChange={(e) => setTarifaUnitaria(e.target.value)}
              required
            />
          </label>
        </div>

        {/* Método de Pago */}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Método de Pago *</span>
          <div className={styles.radioGroup} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <label className={`${styles.radioOption} ${metodoPago === 'efectivo' ? styles.radioOptionSelected : ''}`}>
              <input
                type="radio"
                name="metodoPago"
                checked={metodoPago === 'efectivo'}
                onChange={() => setMetodoPago('efectivo')}
              />
              <span>Efectivo</span>
            </label>
            <label className={`${styles.radioOption} ${metodoPago === 'tarjeta' ? styles.radioOptionSelected : ''}`}>
              <input
                type="radio"
                name="metodoPago"
                checked={metodoPago === 'tarjeta'}
                onChange={() => setMetodoPago('tarjeta')}
              />
              <span>Tarjeta</span>
            </label>
            <label className={`${styles.radioOption} ${metodoPago === 'transferencia' ? styles.radioOptionSelected : ''}`}>
              <input
                type="radio"
                name="metodoPago"
                checked={metodoPago === 'transferencia'}
                onChange={() => setMetodoPago('transferencia')}
              />
              <span>Transferencia</span>
            </label>
          </div>
        </div>

        {/* Datos Cliente */}
        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Nombre de Cliente *</span>
            <input
              className={styles.input}
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              placeholder="Ej. Juan Pérez"
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Teléfono *</span>
            <input
              className={styles.input}
              value={clienteTelefono}
              onChange={(e) => setClienteTelefono(e.target.value)}
              placeholder="Ej. 667 123 4567"
              required
            />
          </label>
        </div>

        {/* Notas */}
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Notas / Observaciones (Opcional)</span>
          <input
            className={styles.input}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej. Cliente trajo casco en buen estado para trueque."
          />
        </label>

        {/* Preview del Trueque */}
        {prodSaliente && prodEntrante && (
          <div className={styles.modalExchangePreview}>
            <div className={styles.modalExchangeGrid}>
              <div className={styles.exchangeSideBox}>
                <div className={styles.exchangeSideTitle} style={{ color: '#ef4444' }}>Se lleva (Saliente)</div>
                <div className={styles.exchangeSideModel}>
                  {prodSaliente.marcas?.nombre} {prodSaliente.modelo}
                </div>
              </div>
              <div className={styles.exchangeArrow}>⇄</div>
              <div className={styles.exchangeSideBox}>
                <div className={styles.exchangeSideTitle} style={{ color: '#16a34a' }}>Deja (Entrante)</div>
                <div className={styles.exchangeSideModel}>
                  {prodEntrante.marcas?.nombre} {prodEntrante.modelo}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Total Box */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-container-low)', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Total a Cobrar al Cliente:</span>
          <span className="mono" style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>
            {formatearDinero(totalCobrar)}
          </span>
        </div>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.btnPrimarySm}
            disabled={guardando || stockCascosSaliente < numCantidad}
          >
            {guardando ? 'Registrando…' : 'Confirmar y Cobrar Intercambio'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ----------------------------------------------------------------------
// MODAL: Detalle de Intercambio (Comprobante)
// ----------------------------------------------------------------------
function ModalDetalleIntercambio({
  intercambio,
  onCerrar,
}: {
  intercambio: IntercambioCasco;
  onCerrar: () => void;
}) {
  const primerItem = intercambio.intercambio_casco_items?.[0];

  return (
    <Modal titulo="Comprobante de Intercambio" icono={<IconReceipt style={{ color: 'var(--primary)' }} />} onCerrar={onCerrar} maxWidth="540px">
      <div className={styles.form}>
        <div className={styles.infoBox}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Folio:</span>
            <span className="mono" style={{ fontWeight: 800, fontSize: '15px' }}>{intercambio.folio}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Fecha y Hora:</span>
            <span className={styles.infoValue}>
              {new Date(intercambio.created_at).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Sucursal:</span>
            <span className={styles.infoValue}>{intercambio.sucursales?.nombre ?? '—'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Registrado por:</span>
            <span className={styles.infoValue}>{intercambio.usuarios?.nombre_completo ?? 'Personal'}</span>
          </div>
          {intercambio.cliente_nombre && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Cliente:</span>
              <span className={styles.infoValue}>
                {intercambio.cliente_nombre} {intercambio.cliente_telefono ? `(${intercambio.cliente_telefono})` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Desglose del trueque */}
        {primerItem && (
          <div className={styles.modalExchangePreview}>
            <div className={styles.modalExchangeGrid}>
              <div className={styles.exchangeSideBox}>
                <div className={styles.exchangeSideTitle} style={{ color: '#ef4444' }}>Se llevó (Saliente)</div>
                <div className={styles.exchangeSideModel}>
                  {primerItem.casco_saliente?.marcas?.nombre ? `${primerItem.casco_saliente.marcas.nombre} ` : ''}
                  {primerItem.casco_saliente?.modelo}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Cantidad: {primerItem.cantidad}
                </div>
              </div>
              <div className={styles.exchangeArrow}>⇄</div>
              <div className={styles.exchangeSideBox}>
                <div className={styles.exchangeSideTitle} style={{ color: '#16a34a' }}>Entregó (Entrante)</div>
                <div className={styles.exchangeSideModel}>
                  {primerItem.casco_entrante?.marcas?.nombre ? `${primerItem.casco_entrante.marcas.nombre} ` : ''}
                  {primerItem.casco_entrante?.modelo}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Cantidad: {primerItem.cantidad}
                </div>
              </div>
            </div>
          </div>
        )}

        {intercambio.notas && (
          <div style={{ fontSize: '12px', background: 'var(--surface-container-low)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--outline-variant)' }}>
            <strong>Notas:</strong> {intercambio.notas}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monto Cobrado ({intercambio.metodo_pago.toUpperCase()}):</div>
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>100% Ganancia de servicio</div>
          </div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>
            {formatearDinero(intercambio.monto_cobrado)}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar} style={{ width: '100%' }}>
            Cerrar Comprobante
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ModalAjusteBodega({
  tipoInicial,
  productoInicial,
  sucursalInicial,
  sucursales,
  productos,
  inventario,
  onCerrar,
  onExito,
}: {
  tipoInicial: 'alta' | 'baja_proveedor';
  productoInicial: string;
  sucursalInicial: string;
  sucursales: Sucursal[];
  productos: Producto[];
  inventario: ItemInventario[];
  onCerrar: () => void;
  onExito: () => void;
}) {
  const [tipo, setTipo] = useState(tipoInicial);
  const [sucursalId, setSucursalId] = useState(sucursalInicial || sucursales[0]?.id || '');
  const [productoId, setProductoId] = useState(productoInicial);
  const [busqueda, setBusqueda] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baterias = useMemo(
    () => productos.filter((p) => p.requiere_casco && p.activo),
    [productos],
  );
  const coincidencias = baterias.filter((p) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return false;
    const texto = `${p.marcas?.nombre ?? ''} ${p.modelo}`.toLowerCase();
    return q.split(/\s+/).every((t) => texto.includes(t));
  });
  const producto = baterias.find((p) => p.id === productoId);
  const grupo = grupoDeModelo(producto?.modelo);
  const stock = inventario.find(
    (i) => i.producto_id === productoId && i.sucursal_id === sucursalId,
  )?.cascos_disponibles ?? 0;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const cantNum = Number(cantidad);
    if (!sucursalId || !productoId) {
      setError('Elige sucursal y batería.');
      return;
    }
    if (!Number.isInteger(cantNum) || cantNum < 1) {
      setError('La cantidad debe ser un entero mayor a cero.');
      return;
    }
    if (tipo === 'baja_proveedor' && cantNum > stock) {
      setError(`En esa sucursal solo hay ${stock} cascos de ese modelo.`);
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await ajustarCascoBodega({
        producto_id: productoId,
        sucursal_id: sucursalId,
        cantidad: cantNum,
        tipo,
        nota: nota.trim() || undefined,
      });
      onExito();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo={tipo === 'alta' ? 'Dar de alta cascos' : 'Entregar cascos al proveedor'}
      icono={<IconInventory />}
      onCerrar={onCerrar}
    >
      <form className={styles.form} onSubmit={guardar}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Movimiento</span>
          <select
            className={styles.select}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as 'alta' | 'baja_proveedor')}
          >
            <option value="alta">Alta — se compró un casco</option>
            <option value="baja_proveedor">Baja — se entregó al proveedor</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Sucursal</span>
          <select
            className={styles.select}
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Buscar batería (marca y modelo)</span>
          <input
            className={styles.input}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej. GONHER 24 R"
          />
        </label>
        {busqueda.trim() && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '140px', overflowY: 'auto' }}>
            {coincidencias.slice(0, 8).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  style={{ width: '100%', marginBottom: '4px', justifyContent: 'space-between' }}
                  onClick={() => {
                    setProductoId(p.id);
                    setBusqueda(`${p.marcas?.nombre ?? ''} ${p.modelo}`.trim());
                  }}
                >
                  <span>{p.marcas?.nombre} {p.modelo}</span>
                  <span>{grupoDeModelo(p.modelo).nombre}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {producto && (
          <p style={{ fontSize: '12px', margin: 0 }}>
            {producto.marcas?.nombre} {producto.modelo} · {grupo.nombre}
            {grupo.precio > 0 ? ` · ${formatearDinero(grupo.precio)}` : ''}
            {' '}· en bodega: <strong>{stock}</strong>
          </p>
        )}

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Cantidad</span>
          <input
            className={styles.input}
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nota (proveedor o folio, opcional)</span>
          <input
            className={styles.input}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej. Entrega a LTH, 27 sep"
          />
        </label>
        {error && <p className={styles.errorBanner}>{error}</p>}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>Cancelar</button>
          <button type="submit" className={styles.btnPrimarySm} disabled={guardando || !productoId}>
            {guardando ? 'Guardando…' : tipo === 'alta' ? 'Registrar alta' : 'Registrar entrega'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
