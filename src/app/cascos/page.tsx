'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { logout, useSesion } from '@/lib/auth';
import {
  type CascoPendiente,
  listarCascosPendientes,
  resolverCasco,
} from '@/lib/admin';
import {
  type Producto,
  formatearDinero,
  listarProductos,
} from '@/lib/catalogo';
import { ThemeToggle } from '@/components/ThemeToggle';
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
  IconRefresh,
} from '@/components/Icons';
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
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestañaPrincipal, setPestañaPrincipal] = useState<'depositos' | 'modelos'>('depositos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'resuelto' | 'vencido'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cascoAResolver, setCascoAResolver] = useState<CascoPendiente | null>(null);

  useEffect(() => {
    if (!autenticado) router.replace('/login');
  }, [autenticado, router]);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [datosCascos, datosProductos] = await Promise.all([
        listarCascosPendientes(),
        listarProductos().catch(() => []),
      ]);
      setCascos(datosCascos);
      setProductos(datosProductos);
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

  const totalPendientes = cascos.filter((c) => c.estado === 'pendiente').length;
  const montoRetenido = cascos
    .filter((c) => c.estado === 'pendiente')
    .reduce((s, c) => s + c.comision_cobrada, 0);
  const totalResueltos = cascos.filter((c) => c.estado === 'resuelto').length;
  const montoDevuelto = cascos
    .filter((c) => c.estado === 'resuelto')
    .reduce((s, c) => s + c.monto_devuelto, 0);

  // Agrupación de cascos recibidos por modelo
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
      {/* Backdrop móvil */}
      {menuAbierto && (
        <div
          className={styles.sidebarBackdrop}
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Persistente */}
      <aside className={`${styles.sidebar} ${menuAbierto ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandInfo}>
            <span className={styles.brandIcon}><IconBolt /></span>
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
          <Link
            href="/"
            className={styles.navItem}
            onClick={() => setMenuAbierto(false)}
          >
            <IconDashboard className={styles.navIcon} />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/catalogo"
            className={styles.navItem}
            onClick={() => setMenuAbierto(false)}
          >
            <IconCatalog className={styles.navIcon} />
            <span>Catálogo</span>
          </Link>
          <Link
            href="/inventario"
            className={styles.navItem}
            onClick={() => setMenuAbierto(false)}
          >
            <IconInventory className={styles.navIcon} />
            <span>Inventario</span>
          </Link>
          <Link
            href="/cascos"
            className={`${styles.navItem} ${styles.navItemActive}`}
            onClick={() => setMenuAbierto(false)}
          >
            <IconCasco className={styles.navIcon} />
            <span>Cascos</span>
          </Link>
          <Link
            href="/reportes"
            className={styles.navItem}
            onClick={() => setMenuAbierto(false)}
          >
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

      {/* Main Wrapper */}
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
              <span className={styles.breadcrumbActive}>Control de Cascos</span>
            </div>
          </div>
          <ThemeToggle />
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
                <span className={styles.statLabel}>Cascos Pendientes</span>
                <IconCasco style={{ color: '#ca8a04', opacity: 0.8 }} />
              </div>
              <div className={styles.statValue} style={{ color: '#ca8a04' }}>
                {totalPendientes}
              </div>
              <div className={styles.statHint}>Baterías por devolver por clientes</div>
            </div>

            <div className={`${styles.statCard} ${styles.statCardPrimary}`}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Monto Retenido</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>MXN</span>
              </div>
              <div className={styles.statValue} style={{ color: 'var(--primary)' }}>
                {formatearDinero(montoRetenido)}
              </div>
              <div className={styles.statHint}>Depósitos en garantía en caja</div>
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
                <span className={styles.statLabel}>Total Reembolsado</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6' }}>MXN</span>
              </div>
              <div className={styles.statValue} style={{ color: '#3b82f6' }}>
                {formatearDinero(montoDevuelto)}
              </div>
              <div className={styles.statHint}>Reembolsos entregados en caja</div>
            </div>
          </section>

          {/* Pestañas de Sección */}
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
          </div>

          {/* VISTA 1: DEPÓSITOS Y DEVOLUCIONES */}
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

              {/* Toolbar con filtros y buscador */}
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

              {/* Tabla */}
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Folio y Fecha</th>
                      <th style={{ width: '28%' }}>Batería y Cliente</th>
                      <th style={{ width: '14%' }}>Sucursal</th>
                      <th style={{ width: '14%', textAlign: 'right' }}>Depósito en Garantía</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Vigencia y Estado</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargando ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          Cargando registros de cascos…
                        </td>
                      </tr>
                    ) : cascosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No se encontraron registros de cascos con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      cascosFiltrados.map((casco) => {
                        const dias = calcularDiasRestantes(casco.fecha_limite);
                        const esPendiente = casco.estado === 'pendiente';
                        const esUrgente = esPendiente && dias <= 3 && dias >= 0;
                        const vencido = esPendiente && dias < 0;

                        return (
                          <tr key={casco.id}>
                            <td>
                              <div className="mono" style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '13px' }}>
                                {casco.folio ?? '—'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {new Date(casco.created_at).toLocaleDateString('es-MX', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {casco.producto ?? 'Batería'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {casco.nombre_cliente
                                  ? `${casco.nombre_cliente}${casco.telefono_cliente ? ` · ${casco.telefono_cliente}` : ''}`
                                  : 'Sin cliente registrado'}
                              </div>
                              {casco.casco_recibido && (
                                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                                  Casco recibido: {casco.casco_recibido}
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {casco.sucursal ?? '—'}
                            </td>
                            <td className="mono" style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '13px' }}>
                                {formatearDinero(casco.comision_cobrada)}
                              </div>
                              {casco.estado === 'resuelto' && casco.monto_devuelto > 0 && (
                                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                                  Devuelto: {formatearDinero(casco.monto_devuelto)}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div>
                                {casco.estado === 'resuelto' ? (
                                  <span className={styles.badgeResuelto}>Resuelto</span>
                                ) : vencido ? (
                                  <span className={styles.badgeVencido}>Vencido</span>
                                ) : esUrgente ? (
                                  <span className={styles.badgeUrgente}>Por vencer</span>
                                ) : (
                                  <span className={styles.badgePendiente}>Pendiente</span>
                                )}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                                {new Date(casco.fecha_limite).toLocaleDateString('es-MX', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                                {esPendiente && (
                                  <span style={{ color: esUrgente || vencido ? '#dc2626' : 'inherit', fontWeight: esUrgente || vencido ? 700 : 500 }}>
                                    {' '}({vencido ? `Venció hace ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoy' : `${dias}d rest.`})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {casco.estado === 'pendiente' ? (
                                <button
                                  className={styles.btnResolver}
                                  onClick={() => setCascoAResolver(casco)}
                                >
                                  Resolver
                                </button>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {casco.resuelto_por ? `Por ${casco.resuelto_por}` : 'Cerrado'}
                                </span>
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

          {/* VISTA 2: CASCOS RECIBIDOS POR MODELO Y BITÁCORA */}
          {pestañaPrincipal === 'modelos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Tarjetas Bento por Modelo */}
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Inventario de Cascos Físicos en Bodega por Modelo ({resumenPorModelo.length})
                </h3>
                {resumenPorModelo.length === 0 ? (
                  <div className={styles.bentoCard} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Aún no se han recibido devoluciones de cascos físicos.
                  </div>
                ) : (
                  <div className={styles.modelCardsGrid}>
                    {resumenPorModelo.map((item) => (
                      <div key={item.modelo} className={styles.modelCard}>
                        <div className={styles.modelCardHeader}>
                          <div>
                            <h4 className={styles.modelCardTitle}>{item.modelo}</h4>
                            <p className={styles.modelCardSubtitle}>
                              {item.esCatalogo ? 'Batería de catálogo' : 'Modelo libre / cliente'}
                            </p>
                          </div>
                          <span className={styles.modelCountBadge}>
                            {item.cantidad} {item.cantidad === 1 ? 'casco' : 'cascos'}
                          </span>
                        </div>
                        <div className={styles.modelCardFooter}>
                          <span>Reembolsos: <strong style={{ color: '#16a34a' }}>{formatearDinero(item.montoTotal)}</strong></span>
                          <span>Último: {new Date(item.ultimaFecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bitácora Detallada de Recepciones */}
              <section className={styles.bentoCard}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>
                    <IconReports style={{ color: 'var(--primary)' }} />
                    <span>Bitácora de Recepciones y Devoluciones de Casco ({cascos.filter(c => c.estado === 'resuelto').length})</span>
                  </h3>
                </div>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '18%' }}>Fecha y Hora</th>
                        <th style={{ width: '26%' }}>Modelo de Casco Recibido</th>
                        <th style={{ width: '22%' }}>Venta / Folio Origen</th>
                        <th style={{ width: '12%' }}>Sucursal</th>
                        <th style={{ width: '12%', textAlign: 'right' }}>Monto Reembolsado</th>
                        <th style={{ width: '10%' }}>Recibido Por</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cascos.filter(c => c.estado === 'resuelto').length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                            No hay registros de cascos resueltos aún.
                          </td>
                        </tr>
                      ) : (
                        cascos.filter(c => c.estado === 'resuelto').map((c) => {
                          let modeloNombre = c.casco_recibido;
                          if (!modeloNombre && c.notas && c.notas.includes('[Modelo:')) {
                            const match = c.notas.match(/\[Modelo:\s*([^\]]+)\]/);
                            if (match && match[1]) modeloNombre = match[1].trim();
                          }
                          if (!modeloNombre) modeloNombre = c.producto ?? 'Casco Recibido';

                          return (
                            <tr key={c.id}>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12px' }}>
                                  {new Date(c.resuelto_en ?? c.created_at).toLocaleDateString('es-MX', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {new Date(c.resuelto_en ?? c.created_at).toLocaleTimeString('es-MX', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {modeloNombre}
                                </div>
                                {c.notas && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    {c.notas}
                                  </div>
                                )}
                              </td>
                              <td>
                                <div className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                  {c.folio ?? '—'}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {c.nombre_cliente ?? 'Cliente en mostrador'}
                                </div>
                              </td>
                              <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {c.sucursal ?? '—'}
                              </td>
                              <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                                {formatearDinero(c.monto_devuelto)}
                              </td>
                              <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {c.resuelto_por ?? 'Administrador'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Modal de Resolución */}
      {cascoAResolver && (
        <ModalResolverCasco
          casco={cascoAResolver}
          productos={productos}
          onCerrar={() => setCascoAResolver(null)}
          onGuardado={async () => {
            setCascoAResolver(null);
            await cargar();
          }}
        />
      )}
    </div>
  );
}

function ModalResolverCasco({
  casco,
  productos,
  onCerrar,
  onGuardado,
}: {
  casco: CascoPendiente;
  productos: Producto[];
  onCerrar: () => void;
  onGuardado: () => Promise<void>;
}) {
  const [tipoModelo, setTipoModelo] = useState<'catalogo' | 'personalizado'>('catalogo');
  const [cascoProductoId, setCascoProductoId] = useState('');
  const [modeloPersonalizado, setModeloPersonalizado] = useState('');
  const [montoDevolver, setMontoDevolver] = useState(String(casco.comision_cobrada));
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baterias = useMemo(
    () => productos.filter((p) => p.requiere_casco && p.activo),
    [productos],
  );

  function seleccionarBateriaCatalogo(prodId: string) {
    setCascoProductoId(prodId);
    if (!prodId) {
      setMontoDevolver(String(casco.comision_cobrada));
      return;
    }
    const prod = baterias.find((b) => b.id === prodId);
    if (prod && prod.comision_casco != null && prod.comision_casco > 0) {
      // El precio del casco se basa en la comisión configurada de esa batería
      const valorDevolucion = Math.min(Number(prod.comision_casco), casco.comision_cobrada);
      setMontoDevolver(String(valorDevolucion));
    } else {
      setMontoDevolver(String(casco.comision_cobrada));
    }
  }

  async function handleResolver(e: FormEvent) {
    e.preventDefault();
    const monto = Number(montoDevolver);
    if (Number.isNaN(monto) || monto < 0) {
      setError('Ingresa un monto a devolver válido (mayor o igual a cero).');
      return;
    }
    if (monto > casco.comision_cobrada) {
      setError(`El monto a devolver no puede exceder la comisión retenida ($${casco.comision_cobrada}).`);
      return;
    }

    if (tipoModelo === 'personalizado' && !modeloPersonalizado.trim()) {
      setError('Escribe el modelo o marca del casco que fue recibido.');
      return;
    }

    setGuardando(true);
    setError(null);

    const notaFinal = tipoModelo === 'personalizado'
      ? `[Modelo: ${modeloPersonalizado.trim()}] ${notas.trim()}`.trim()
      : notas.trim();

    try {
      await resolverCasco(casco.id, {
        monto_devuelto: monto,
        casco_producto_id: tipoModelo === 'catalogo' && cascoProductoId ? cascoProductoId : undefined,
        notas: notaFinal || undefined,
      });
      await onGuardado();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Registrar Devolución de Casco</h3>
          <button className={styles.closeBtn} onClick={onCerrar}>
            <IconClose />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleResolver}>
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
            {casco.nombre_cliente && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Cliente:</span>
                <span className={styles.infoValue}>{casco.nombre_cliente} ({casco.telefono_cliente ?? 'S/T'})</span>
              </div>
            )}
          </div>

          {/* Selector de tipo de modelo */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>¿Qué modelo de casco está entregando el cliente? *</span>
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
                <span>Otro Modelo (No está en la lista)</span>
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
                    {b.marcas?.nombre} {b.modelo} (Valor de Casco: {b.comision_casco ? formatearDinero(b.comision_casco) : '$0.00'})
                  </option>
                ))}
              </select>
              <span className={styles.helperText}>
                Al elegir una batería de la lista, el precio del casco se ajusta automáticamente según su valor de catálogo.
              </span>
            </label>
          ) : (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Escribir Modelo / Marca del Casco Recibido *</span>
              <input
                className={styles.input}
                value={modeloPersonalizado}
                onChange={(e) => setModeloPersonalizado(e.target.value)}
                placeholder="Ej. LTH L-42-400 vieja, América 60Ah, Duralast..."
                required
              />
              <span className={styles.helperText}>
                Especifica el modelo físico que recibiste para llevar el control en la sección de cascos por modelo.
              </span>
            </label>
          )}

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Monto a Devolver en Efectivo ($ MXN) *</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={montoDevolver}
              onChange={(e) => setMontoDevolver(e.target.value)}
              placeholder="0.00"
              required
            />
            <span className={styles.helperText}>
              Depósito original: {formatearDinero(casco.comision_cobrada)}.
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Observaciones / Notas (Opcional)</span>
            <input
              className={styles.input}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. Casco en buen estado físico, devuelto en tiempo y forma."
            />
          </label>

          {error && <p className={styles.errorBanner}>{error}</p>}

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.btnSuccessSm}
              disabled={guardando}
            >
              {guardando ? 'Guardando…' : 'Confirmar Recepción y Devolver Monto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
