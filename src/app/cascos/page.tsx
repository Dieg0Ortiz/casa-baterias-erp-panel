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
      const matchCliente = (c.nombre_cliente ?? '').toLowerCase().includes(q);
      const matchSucursal = (c.sucursal ?? '').toLowerCase().includes(q);
      if (!matchFolio && !matchProducto && !matchCliente && !matchSucursal) return false;
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
                <span className={styles.statLabel}>Cascos Resueltos</span>
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

          {/* Tabla Bento Card */}
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
  const [montoDevolver, setMontoDevolver] = useState(String(casco.comision_cobrada));
  const [cascoProductoId, setCascoProductoId] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baterias = useMemo(
    () => productos.filter((p) => p.requiere_casco && p.activo),
    [productos],
  );

  function seleccionarBateriaEntregada(prodId: string) {
    setCascoProductoId(prodId);
    if (!prodId) {
      setMontoDevolver(String(casco.comision_cobrada));
      return;
    }
    const prod = baterias.find((b) => b.id === prodId);
    if (prod && prod.comision_casco != null && prod.comision_casco > 0) {
      const valorDevolucion = Math.min(Number(prod.comision_casco), casco.comision_cobrada);
      setMontoDevolver(String(valorDevolucion));
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
      setError(`El monto a devolver no puede exceder la comisión cobrada ($${casco.comision_cobrada}).`);
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await resolverCasco(casco.id, {
        monto_devuelto: monto,
        casco_producto_id: cascoProductoId || undefined,
        notas: notas.trim() || undefined,
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
          <h3>Resolver Devolución de Casco</h3>
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
              <span className={styles.infoLabel}>Batería Vendida:</span>
              <span className={styles.infoValue}>{casco.producto ?? 'Batería'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Comisión Retenida:</span>
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

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Batería / Casco Entregado por el Cliente (Opcional)</span>
            <select
              className={styles.select}
              value={cascoProductoId}
              onChange={(e) => seleccionarBateriaEntregada(e.target.value)}
            >
              <option value="">-- Seleccionar batería equivalente (calcula valor) --</option>
              {baterias.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.marcas?.nombre} {b.modelo} (Valor casco: {b.comision_casco ? formatearDinero(b.comision_casco) : 'N/A'})
                </option>
              ))}
            </select>
            <span className={styles.helperText}>
              Si el cliente entregó una batería de menor valor comercial, selecciona el modelo para auto-calcular el reembolso proporcional.
            </span>
          </label>

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
              Máximo a devolver: {formatearDinero(casco.comision_cobrada)}. Si entregó un casco equivalente completo, se devuelven los {formatearDinero(casco.comision_cobrada)}.
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Observaciones / Notas (Opcional)</span>
            <input
              className={styles.input}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. Entregó batería vieja en buen estado, devolución realizada."
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
              {guardando ? 'Guardando…' : 'Confirmar Devolución y Cerrar Caso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
