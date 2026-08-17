'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
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

  // Filtrado y estadísticas
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
      {/* Sidebar Mobile Backdrop */}
      {menuAbierto && (
        <div
          className={styles.sidebarBackdrop}
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`${styles.sidebar} ${menuAbierto ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandInfo}>
            <span className={styles.brandIcon}>
              <IconBolt />
            </span>
            <div>
              <div className={styles.brandTitle}>Casa de las Baterías</div>
              <div className={styles.brandSubtitle}>Panel de Control</div>
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
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitleWrap}>
            <button
              className={styles.menuToggleBtn}
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
            >
              <IconMenu />
            </button>
            <div>
              <h1 className={styles.title}>Control de Cascos y Depósitos</h1>
              <p className={styles.subtitle}>
                Seguimiento de comisiones retenidas por venta de baterías sin casco y devoluciones de clientes dentro del plazo de 15 días.
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.btnSecondary}
              onClick={cargar}
              disabled={cargando}
              title="Actualizar datos"
            >
              <IconRefresh />
              <span>Actualizar</span>
            </button>
            <ThemeToggle />
          </div>
        </header>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* Resumen KPI */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Cascos Pendientes</span>
            <span className={styles.statValue} style={{ color: '#ca8a04' }}>
              {totalPendientes}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Monto Retenido en Caja</span>
            <span className={styles.statValue} style={{ color: 'var(--primary)' }}>
              {formatearDinero(montoRetenido)}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Cascos Devueltos</span>
            <span className={styles.statValue} style={{ color: '#16a34a' }}>
              {totalResueltos}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Reembolsado</span>
            <span className={styles.statValue}>
              {formatearDinero(montoDevuelto)}
            </span>
          </div>
        </div>

        {/* Panel de Filtros y Tabla */}
        <div className={styles.card}>
          <div className={styles.cardHeader} style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconCasco style={{ color: 'var(--primary)' }} />
              <h2 className={styles.cardTitle}>Listado de Cascos / Depósitos ({cascosFiltrados.length})</h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Filtro por estado */}
              <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-container-low)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    background: filtroEstado === 'todos' ? 'var(--surface)' : 'transparent',
                    boxShadow: filtroEstado === 'todos' ? 'var(--shadow-sm)' : 'none',
                  }}
                  onClick={() => setFiltroEstado('todos')}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    background: filtroEstado === 'pendiente' ? 'var(--surface)' : 'transparent',
                    boxShadow: filtroEstado === 'pendiente' ? 'var(--shadow-sm)' : 'none',
                    color: filtroEstado === 'pendiente' ? '#ca8a04' : undefined,
                  }}
                  onClick={() => setFiltroEstado('pendiente')}
                >
                  Pendientes ({totalPendientes})
                </button>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    background: filtroEstado === 'resuelto' ? 'var(--surface)' : 'transparent',
                    boxShadow: filtroEstado === 'resuelto' ? 'var(--shadow-sm)' : 'none',
                    color: filtroEstado === 'resuelto' ? '#16a34a' : undefined,
                  }}
                  onClick={() => setFiltroEstado('resuelto')}
                >
                  Resueltos ({totalResueltos})
                </button>
              </div>

              {/* Buscador */}
              <div className={styles.searchBox} style={{ maxWidth: '280px' }}>
                <IconSearch className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por folio, batería, cliente…"
                />
              </div>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Folio Venta</th>
                  <th>Batería Vendida</th>
                  <th>Cliente</th>
                  <th>Sucursal</th>
                  <th style={{ textAlign: 'right' }}>Comisión Retenida</th>
                  <th style={{ textAlign: 'center' }}>Plazo Límite (15 días)</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'right' }}>Devolución</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px' }}>
                      Cargando registros de cascos…
                    </td>
                  </tr>
                ) : cascosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No se encontraron cascos registrados con los filtros aplicados.
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
                        <td className="mono" style={{ fontWeight: 700 }}>
                          {casco.folio ?? '—'}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{casco.producto ?? 'Batería'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
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
                          {casco.nombre_cliente ? (
                            <div>
                              <div style={{ fontWeight: 600 }}>{casco.nombre_cliente}</div>
                              {casco.telefono_cliente && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {casco.telefono_cliente}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Sin registrar</span>
                          )}
                        </td>
                        <td>{casco.sucursal ?? '—'}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                          {formatearDinero(casco.comision_cobrada)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div>
                            <span style={{ fontSize: '12px' }}>
                              {new Date(casco.fecha_limite).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </span>
                            {esPendiente && (
                              <div className={`${styles.diasRestantes} ${esUrgente || vencido ? styles.diasUrgente : styles.diasNormal}`}>
                                {vencido
                                  ? `Venció hace ${Math.abs(dias)}d`
                                  : dias === 0
                                  ? 'Vence hoy'
                                  : `${dias} días restantes`}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {casco.estado === 'resuelto' ? (
                            <span className={styles.badgeResuelto}>✓ Resuelto</span>
                          ) : vencido ? (
                            <span className={styles.badgeVencido}>Vencido</span>
                          ) : esUrgente ? (
                            <span className={styles.badgeUrgente}>⚠️ Por vencer</span>
                          ) : (
                            <span className={styles.badgePendiente}>Pendiente</span>
                          )}
                        </td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                          {casco.estado === 'resuelto' ? (
                            <span style={{ color: '#16a34a' }}>
                              {formatearDinero(casco.monto_devuelto)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
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
        </div>
      </div>

      {/* Modal de Resolución de Casco */}
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

  // Solo productos que requieren casco (baterías)
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
      // El valor a devolver es el menor entre la comisión del producto entregado y lo cobrado
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
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Resolver Devolución de Casco</h2>
          <button className={styles.modalClose} onClick={onCerrar}>
            <IconClose />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleResolver}>
          <div style={{ background: 'var(--surface-container-low)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Folio de Venta:</span>
              <span className="mono" style={{ fontWeight: 700 }}>{casco.folio ?? '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Batería Comprada:</span>
              <span style={{ fontWeight: 600 }}>{casco.producto ?? 'Batería'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Comisión Retenida:</span>
              <span className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                {formatearDinero(casco.comision_cobrada)}
              </span>
            </div>
            {casco.nombre_cliente && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cliente:</span>
                <span style={{ fontWeight: 600 }}>{casco.nombre_cliente} ({casco.telefono_cliente ?? 'S/T'})</span>
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
            <textarea
              className={styles.input}
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. Entregó batería vieja en buen estado, devolución en efectivo realizada."
            />
          </label>

          {error && <p className={styles.errorBanner}>{error}</p>}

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.btnPrimarySm}
              disabled={guardando}
              style={{ background: '#16a34a', borderColor: '#16a34a' }}
            >
              {guardando ? 'Guardando…' : 'Confirmar Devolución y Cerrar Caso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
