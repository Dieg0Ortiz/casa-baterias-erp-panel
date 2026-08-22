'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { logout, useSesion } from '@/lib/auth';
import {
  type CascoPendiente,
  type IntercambioCasco,
  listarCascosPendientes,
  listarIntercambiosCascos,
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
import {
  IconBolt,
  IconDashboard,
  IconCatalog,
  IconInventory,
  IconReports,
  IconLogout,
  IconSearch,
  IconClose,
  IconMenu,
  IconCasco,
  IconUsers,
  IconRefresh,
  IconSplit,
  IconCash,
  IconCard,
  IconReceipt,
  IconBuilding,
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
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [inventario, setInventario] = useState<ItemInventario[]>([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pestañaPrincipal, setPestañaPrincipal] = useState<'depositos' | 'modelos' | 'intercambios'>('depositos');
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
      const [datosCascos, datosIntercambios, datosProductos, datosSucursales, datosInventario] = await Promise.all([
        listarCascosPendientes().catch(() => []),
        listarIntercambiosCascos().catch(() => []),
        listarProductos().catch(() => []),
        listarSucursales().catch(() => []),
        listarInventario().catch(() => []),
      ]);
      setCascos(datosCascos);
      setIntercambios(datosIntercambios);
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
      cargar();
    }
  }, [autenticado, perfil]);

  if (!autenticado) return null;

  if (perfil?.rol !== 'administrador') {
    return (
      <div className={styles.lockedPage}>
        <div className={styles.lockedCard}>
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

  function salir() {
    logout();
    router.replace('/login');
    router.refresh();
  }

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
  const totalResueltos = cascos.filter((c) => c.estado === 'resuelto').length;
  const montoDevuelto = cascos
    .filter((c) => c.estado === 'resuelto')
    .reduce((s, c) => s + c.monto_devuelto, 0);

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

  function calcularDiasRestantes(fechaLimiteIso: string) {
    const limite = new Date(fechaLimiteIso).getTime();
    const diff = limite - ahora;
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return dias;
  }

  return (
    <div className={styles.layout}>
      <Sidebar active="cascos" menuAbierto={menuAbierto} onCerrarMenu={() => setMenuAbierto(false)} />

      {/* Contenedor Principal */}
      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.headerTitleRow}>
            <button
              type="button"
              className={styles.menuToggle}
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
            >
              <IconMenu />
            </button>
            <div className={styles.breadcrumbs}>
              <Link href="/" style={{ color: 'var(--text-muted)' }}>Panel</Link>
              <span>/</span>
              <span className={styles.breadcrumbActive}>Control de Cascos</span>
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
            <div className={`${styles.statCard} ${styles.statCardWarning}`}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Depósitos Pendientes</span>
                <IconCasco style={{ color: '#ca8a04', opacity: 0.8 }} />
              </div>
              <div className={styles.statValue} style={{ color: '#ca8a04' }}>
                {totalPendientes}
              </div>
              <div className={styles.statHint}>Baterías por devolver por clientes</div>
            </div>

            <div className={`${styles.statCard} ${styles.statCardPrimary}`}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Depósitos en Garantía</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>MXN</span>
              </div>
              <div className={styles.statValue} style={{ color: 'var(--primary)' }}>
                {formatearDinero(montoRetenido)}
              </div>
              <div className={styles.statHint}>Monto en resguardo de clientes</div>
            </div>

            <div className={`${styles.statCard} ${styles.statCardSuccess}`}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Cascos en Bodega</span>
              </div>
              <div className={styles.statValue} style={{ color: '#16a34a' }}>
                {totalResueltos}
              </div>
              <div className={styles.statHint}>Baterías viejas recibidas</div>
            </div>

            <div className={`${styles.statCard} ${styles.statCardInfo}`}>
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
                <button
                  className={styles.btnSecondary}
                  onClick={cargar}
                  disabled={cargando}
                >
                  <IconRefresh />
                  <span>Actualizar</span>
                </button>
              </div>

              <div className={styles.toolbar}>
                <div className={styles.filterGroup}>
                  <button
                    type="button"
                    className={`${styles.filterBtn} ${filtroEstado === 'todos' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFiltroEstado('todos')}
                  >
                    Todos ({cascos.length})
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterBtn} ${filtroEstado === 'pendiente' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFiltroEstado('pendiente')}
                    style={{ color: filtroEstado === 'pendiente' ? '#ca8a04' : undefined }}
                  >
                    Pendientes ({totalPendientes})
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterBtn} ${filtroEstado === 'resuelto' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFiltroEstado('resuelto')}
                    style={{ color: filtroEstado === 'resuelto' ? '#16a34a' : undefined }}
                  >
                    Resueltos ({totalResueltos})
                  </button>
                </div>

                <div className={styles.searchBox}>
                  <IconSearch className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar folio, batería, cliente…"
                  />
                </div>
              </div>

              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Folio y Fecha</th>
                      <th style={{ width: '28%' }}>Batería y Cliente</th>
                      <th style={{ width: '14%' }}>Sucursal</th>
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
                              <div style={{ fontWeight: 600 }}>{c.producto ?? 'Batería no especificada'}</div>
                              {c.nombre_cliente ? (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {c.nombre_cliente} {c.telefono_cliente ? `• ${c.telefono_cliente}` : ''}
                                </div>
                              ) : (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  Cliente general
                                </div>
                              )}
                              {c.casco_recibido && (
                                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                                  Entregó: {c.casco_recibido}
                                </div>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>{c.sucursal ?? '—'}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                {formatearDinero(c.comision_cobrada)}
                              </span>
                              {c.estado === 'resuelto' && (
                                <div style={{ fontSize: '11px', color: '#16a34a' }}>
                                  Devuelto: {formatearDinero(c.monto_devuelto)}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {c.estado === 'resuelto' ? (
                                <span className={styles.badgeSuccess}>Resuelto</span>
                              ) : esVencido ? (
                                <span className={styles.badgeDanger}>Vencido</span>
                              ) : (
                                <span className={styles.badgeWarning}>
                                  Pendiente ({dias}d)
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {esPendiente ? (
                                <button
                                  type="button"
                                  className={styles.btnSuccessSm}
                                  onClick={() => setCascoAResolver(c)}
                                >
                                  Devolver
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
                  <span>Resumen de Cascos Físicos Recibidos en Bodega</span>
                </h2>
                <button className={styles.btnSecondary} onClick={cargar} disabled={cargando}>
                  <IconRefresh />
                  <span>Actualizar</span>
                </button>
              </div>

              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Modelo de Casco Recibido</th>
                      <th style={{ width: '20%', textAlign: 'center' }}>Cantidad Recibida</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>Monto Total Devuelto</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>Última Recepción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenPorModelo.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={styles.emptyText}>
                          Aún no se han recibido cascos físicos devueltos.
                        </td>
                      </tr>
                    ) : (
                      resumenPorModelo.map((item) => (
                        <tr key={item.modelo}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{item.modelo}</div>
                            <span style={{ fontSize: '11px', color: item.esCatalogo ? '#16a34a' : '#ca8a04' }}>
                              {item.esCatalogo ? '● En Catálogo' : '○ No Catalogado'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={styles.badgeSuccess} style={{ fontSize: '13px' }}>
                              {item.cantidad} cascos
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }} className="mono">
                            {formatearDinero(item.montoTotal)}
                          </td>
                          <td style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date(item.ultimaFecha).toLocaleDateString('es-MX')}
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
          {/* VISTA 3: INTERCAMBIO DE CASCOS (TRUEQUE CON COBRO $150)              */}
          {/* ==================================================================== */}
          {pestañaPrincipal === 'intercambios' && (
            <section className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <IconSplit style={{ color: '#3b82f6' }} />
                  <span>Registro de Intercambios de Cascos ({intercambiosFiltrados.length})</span>
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={styles.btnPrimary}
                    onClick={() => setModalNuevoIntercambio(true)}
                  >
                    + Registrar Intercambio
                  </button>
                  <button className={styles.btnSecondary} onClick={cargar} disabled={cargando}>
                    <IconRefresh />
                    <span>Actualizar</span>
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              <div className={styles.toolbar}>
                <div className={styles.searchBox} style={{ maxWidth: '420px' }}>
                  <IconSearch className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar folio, modelo entregado/recibido, cliente..."
                  />
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Tarifa estándar: <strong>$150.00 MXN</strong> por intercambio
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
                          No hay intercambios registrados aún. Haz clic en "+ Registrar Intercambio" para registrar el primero.
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
                                className={styles.btnSecondarySm}
                                onClick={() => setIntercambioDetalle(item)}
                              >
                                Ver
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

  const baterias = useMemo(() => productos.filter((p) => p.tipo === 'bateria'), [productos]);

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
    <div className={styles.modalOverlay} onClick={onCerrar}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Registrar Devolución de Casco</h2>
          <button className={styles.modalCloseBtn} onClick={onCerrar}><IconClose /></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
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
            <button type="submit" className={styles.btnSuccessSm} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Confirmar Recepción y Devolver Monto'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
  const baterias = useMemo(() => productos.filter((p) => p.tipo === 'bateria'), [productos]);

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
    <div className={styles.modalOverlay} onClick={onCerrar}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconSplit style={{ color: '#3b82f6' }} />
            <h2>Registrar Intercambio de Cascos</h2>
          </div>
          <button className={styles.modalCloseBtn} onClick={onCerrar}><IconClose /></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
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
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </label>

          {/* Casco Saliente */}
          <label className={styles.field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={styles.fieldLabel}>Casco que se entrega al cliente (Saliente de Bodega) *</span>
              {salienteId && (
                <span className={stockCascosSaliente >= numCantidad ? styles.stockBadgeAvailable : styles.stockBadgeLow}>
                  Disponibles en sucursal: {stockCascosSaliente}
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
                const itemInv = inventario.find(
                  (inv) => inv.producto_id === b.id && inv.sucursal_id === sucursalId
                );
                const stock = itemInv?.cascos_disponibles ?? 0;
                return (
                  <option key={b.id} value={b.id}>
                    {b.marcas?.nombre} {b.modelo} — ({stock} cascos en stock)
                  </option>
                );
              })}
            </select>
          </label>

          {/* Casco Entrante */}
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Casco que deja el cliente (Entrante a Bodega) *</span>
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

          {/* Vista previa del intercambio */}
          {prodSaliente && prodEntrante && (
            <div className={styles.modalExchangePreview}>
              <div className={styles.modalExchangeGrid}>
                <div className={styles.exchangeSideBox}>
                  <div className={styles.exchangeSideTitle} style={{ color: '#ef4444' }}>Entrega Bodega</div>
                  <div className={styles.exchangeSideModel}>
                    {prodSaliente.marcas?.nombre} {prodSaliente.modelo}
                  </div>
                </div>
                <div className={styles.exchangeArrow}>⇄</div>
                <div className={styles.exchangeSideBox}>
                  <div className={styles.exchangeSideTitle} style={{ color: '#16a34a' }}>Recibe Bodega</div>
                  <div className={styles.exchangeSideModel}>
                    {prodEntrante.marcas?.nombre} {prodEntrante.modelo}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cantidad y Tarifa */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Cantidad de Cascos *</span>
              <input
                className={styles.input}
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Cobro por Intercambio ($ MXN) *</span>
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
            <div className={styles.radioGroup}>
              <label className={`${styles.radioOption} ${metodoPago === 'efectivo' ? styles.radioOptionSelected : ''}`}>
                <input
                  type="radio"
                  name="metodoPago"
                  checked={metodoPago === 'efectivo'}
                  onChange={() => setMetodoPago('efectivo')}
                />
                <span>Efectivo (Entra a Caja)</span>
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

          {/* Datos del Cliente */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Nombre de Cliente *</span>
              <input
                className={styles.input}
                required
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Ej. Juan Pérez"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Teléfono *</span>
              <input
                className={styles.input}
                required
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
                placeholder="Ej. 667 123 4567"
              />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Notas / Observaciones (Opcional)</span>
            <input
              className={styles.input}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. Cliente trajo casco en buen estado para trueque."
            />
          </label>

          {/* Total a Cobrar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-variant)', borderRadius: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Total a Cobrar al Cliente:</span>
            <span className="mono" style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>
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
              className={styles.btnPrimary}
              disabled={guardando || stockCascosSaliente < numCantidad}
            >
              {guardando ? 'Registrando…' : 'Confirmar y Cobrar Intercambio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL: Detalle de Intercambio
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
    <div className={styles.modalOverlay} onClick={onCerrar}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconReceipt style={{ color: 'var(--primary)' }} />
            <h2>Comprobante de Intercambio</h2>
          </div>
          <button className={styles.modalCloseBtn} onClick={onCerrar}><IconClose /></button>
        </div>

        <div className={styles.modalForm}>
          <div className={styles.infoBox}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Folio:</span>
              <span className="mono" style={{ fontWeight: 800, fontSize: '16px' }}>{intercambio.folio}</span>
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
            <div style={{ fontSize: '12px', background: 'var(--surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline-variant)' }}>
              <strong>Notas:</strong> {intercambio.notas}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monto Cobrado ({intercambio.metodo_pago.toUpperCase()}):</div>
              <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>100% Ganancia de servicio</div>
            </div>
            <div className="mono" style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>
              {formatearDinero(intercambio.monto_cobrado)}
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnPrimary} onClick={onCerrar} style={{ width: '100%' }}>
              Cerrar Detalle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
