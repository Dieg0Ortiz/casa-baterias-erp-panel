'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '@/lib/api';
import { logout, useSesion } from '@/lib/auth';
import { type Producto, formatearDinero, listarProductos, listarSucursales } from '@/lib/catalogo';
import {
  type ItemInventario,
  type Transferencia,
  eliminarExistencias,
  listarInventario,
  listarTransferencias,
  reabastecerInventario,
  transferirInventario,
} from '@/lib/inventario';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  IconBolt,
  IconDashboard,
  IconCatalog,
  IconInventory,
  IconReports,
  IconLogout,
  IconTransfer,
  IconClose,
  IconAdd,
  IconDelete,
  IconCasco,
  IconUsers,
} from '@/components/Icons';
import styles from './inventario.module.css';

interface AjustarState {
  productoId: string;
  sucursalId: string;
  modelo: string;
  cantidadActual: number;
}

function mensajeError(e: unknown): string {
  return e instanceof ApiError
    ? e.message
    : 'Ocurrió un error. Intenta de nuevo.';
}

export default function InventarioPage() {
  const router = useRouter();
  const { autenticado, perfil } = useSesion();

  useEffect(() => {
    if (!autenticado) router.replace('/login');
  }, [autenticado, router]);

  if (!autenticado) return null;

  if (perfil?.rol !== 'administrador') {
    function salir() {
      logout();
      router.replace('/login');
      router.refresh();
    }
    return (
      <div className={styles.lockedPage}>
        <div className={styles.lockedCard}>
          <h1>Acceso restringido</h1>
          <p>
            Este panel es solo para administradores. Tu usuario tiene el rol{' '}
            <strong>trabajador</strong> y debe usar la app de ventas.
          </p>
          <button className={styles.btnPrimary} onClick={salir}>
            Salir
          </button>
        </div>
      </div>
    );
  }

  return <InventarioAdmin />;
}

function InventarioAdmin() {
  const router = useRouter();
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string; es_matriz?: boolean }[]>(
    [],
  );
  const [catalogo, setCatalogo] = useState<Producto[]>([]);
  const [sucursalId, setSucursalId] = useState('');
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalTransf, setModalTransf] = useState(false);
  const [modalReabastecer, setModalReabastecer] = useState(false);
  const [modalAjustar, setModalAjustar] = useState<AjustarState | null>(null);
  const [operando, setOperando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [suc, prods] = await Promise.all([
          listarSucursales(),
          listarProductos(),
        ]);
        if (!activo) return;
        setSucursales(suc);
        setCatalogo(prods.filter((p) => p.activo));
      } catch (e) {
        if (!activo) return;
        setError(mensajeError(e));
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    void cargar(sucursalId);
  }, [sucursalId]);

  async function cargar(id: string) {
    setCargando(true);
    setError(null);
    try {
      const [inv, transf] = await Promise.all([
        listarInventario(id || undefined),
        listarTransferencias(),
      ]);
      setItems(inv);
      setTransferencias(transf);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  function salir() {
    logout();
    router.replace('/login');
    router.refresh();
  }

  async function vaciarExistenciaDirecta(item: ItemInventario) {
    if (!item.producto_id) return;
    const sucursalNombre =
      sucursales.find((s) => s.id === item.sucursal_id)?.nombre ?? 'esta tienda';
    const confirmacion = confirm(
      `¿Deseas eliminar y vaciar a 0 las ${item.cantidad} unidades de "${item.modelo}" en ${sucursalNombre}?`,
    );
    if (!confirmacion) return;

    setOperando(true);
    setError(null);
    try {
      await eliminarExistencias({
        producto_id: item.producto_id,
        sucursal_id: item.sucursal_id,
        cantidad: item.cantidad,
      });
      await cargar(sucursalId);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOperando(false);
    }
  }

  const totalUnidades = items.reduce((s, i) => s + i.cantidad, 0);
  const totalCascos = items.reduce((s, i) => s + i.cascos_disponibles, 0);
  const nombreSucursal =
    sucursales.find((s) => s.id === sucursalId)?.nombre ?? 'Todas las Sucursales';

  return (
    <div className={styles.layout}>
      {/* Backdrop para cerrar menú móvil al hacer tap fuera */}
      {menuAbierto && (
        <div
          className={styles.sidebarBackdrop}
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Persistente y Drawer Móvil */}
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
            className={`${styles.navItem} ${styles.navItemActive}`}
            onClick={() => setMenuAbierto(false)}
          >
            <IconInventory className={styles.navIcon} />
            <span>Inventario</span>
          </Link>
          <Link
            href="/cascos"
            className={styles.navItem}
            onClick={() => setMenuAbierto(false)}
          >
            <IconCasco className={styles.navIcon} />
            <span>Cascos</span>
          </Link>
          <Link
            href="/usuarios"
            className={styles.navItem}
            onClick={() => setMenuAbierto(false)}
          >
            <IconUsers className={styles.navIcon} />
            <span>Trabajadores / Usuarios</span>
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

      {/* Contenido Principal */}
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
              <span className={styles.breadcrumbActive}>Inventario</span>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className={styles.mainContent}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              <span>{error}</span>
              <button className={styles.btnSecondary} onClick={() => void cargar(sucursalId)}>
                Reintentar
              </button>
            </div>
          )}

          {/* Barra de Filtro y Acciones de Inventario */}
          <section className={styles.filterBar}>
            <div className={styles.filterControls}>
              <span className={styles.fieldLabel}>Filtrar Tienda:</span>
              <select
                className={styles.select}
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
              >
                <option value="">Todas las sucursales</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.actionGroup}>
              <button
                className={styles.btnSecondary}
                onClick={() => void cargar(sucursalId)}
                disabled={cargando}
              >
                Actualizar
              </button>

              <button
                className={styles.btnPrimary}
                onClick={() => setModalReabastecer(true)}
                disabled={cargando || catalogo.length === 0}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Agregar más existencias de un producto existente"
              >
                <IconAdd style={{ width: '14px', height: '14px' }} />
                <span>+ Entrada de Inventario</span>
              </button>

              <button
                className={styles.btnSecondary}
                onClick={() => setModalTransf(true)}
                disabled={cargando || sucursales.length < 2}
                title={
                  sucursales.length < 2
                    ? 'Se necesitan al menos dos sucursales para transferir'
                    : 'Transferir stock entre tiendas'
                }
              >
                Transferir entre Sucursales
              </button>
            </div>
          </section>

          {/* KPI Cards de Inventario */}
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Unidades Físicas ({nombreSucursal})</span>
                <IconInventory style={{ color: 'var(--primary)' }} />
              </div>
              <div className={`${styles.statValue} mono`}>{totalUnidades}</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Cascos Disponibles ({nombreSucursal})</span>
                <IconBolt style={{ color: 'var(--secondary)' }} />
              </div>
              <div className={`${styles.statValue} mono`} style={{ color: 'var(--primary)' }}>
                {totalCascos}
              </div>
            </div>
          </section>

          {/* Tabla de Existencias */}
          <section className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <IconInventory style={{ color: 'var(--primary)' }} />
                <span>Existencias en {nombreSucursal}</span>
              </h2>
            </div>
            <div className={styles.tableScroll}>
              {cargando ? (
                <div className={styles.loadingText}>Cargando existencias…</div>
              ) : items.length === 0 ? (
                <div className={styles.emptyText}>No hay existencias registradas para esta sucursal.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Modelo</th>
                      <th>Marca</th>
                      <th>Código de Barras</th>
                      <th style={{ textAlign: 'right' }}>Precio</th>
                      <th style={{ textAlign: 'center' }}>Requiere Casco</th>
                      <th style={{ textAlign: 'right' }}>Cantidad</th>
                      <th style={{ textAlign: 'right' }}>Cascos Disponibles</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={`${item.sucursal_id}-${item.producto_id}`}>
                        <td><strong>{item.modelo ?? '—'}</strong></td>
                        <td>{item.marca ?? '—'}</td>
                        <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                          {item.codigo_barras ?? '—'}
                        </td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                          {formatearDinero(item.precio)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {item.requiere_casco ? 'Sí' : 'No'}
                        </td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                          {item.cantidad}
                        </td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--secondary)' }}>
                          {item.cascos_disponibles}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <button
                              className={styles.btnSecondary}
                              style={{
                                padding: '3px 8px',
                                fontSize: '11px',
                                color: 'var(--primary)',
                                borderColor: 'rgba(62, 50, 211, 0.2)',
                                background: 'rgba(62, 50, 211, 0.04)',
                                fontWeight: 600,
                              }}
                              onClick={() => setModalAjustar({
                                productoId: item.producto_id ?? '',
                                sucursalId: item.sucursal_id,
                                modelo: item.modelo ?? 'Producto',
                                cantidadActual: item.cantidad,
                              })}
                              title="Retirar o reducir piezas por merma / ajuste"
                            >
                              <span>Ajustar</span>
                            </button>

                            <button
                              className={styles.btnSecondary}
                              style={{
                                padding: '4px 6px',
                                color: 'var(--error)',
                                borderColor: 'rgba(186, 26, 26, 0.25)',
                                background: 'rgba(186, 26, 26, 0.04)',
                              }}
                              onClick={() => void vaciarExistenciaDirecta(item)}
                              title="Eliminar y vaciar existencias a 0"
                            >
                              <IconDelete style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Historial de Transferencias */}
          <section className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <IconTransfer style={{ color: 'var(--primary)' }} />
                <span>Historial de Transferencias entre Sucursales</span>
              </h2>
            </div>
            <div className={styles.tableScroll}>
              {cargando ? (
                <div className={styles.loadingText}>Cargando transferencias…</div>
              ) : transferencias.length === 0 ? (
                <div className={styles.emptyText}>Aún no se han registrado transferencias entre tiendas.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Sucursal Origen</th>
                      <th>Sucursal Destino</th>
                      <th style={{ textAlign: 'right' }}>Cantidad</th>
                      <th>Autorizado Por</th>
                      <th>Nota de Envío</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferencias.map((t) => (
                      <tr key={t.id}>
                        <td className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(t.created_at).toLocaleString('es-MX')}
                        </td>
                        <td><strong>{t.producto ?? '—'}</strong></td>
                        <td>{t.sucursal_origen ?? '—'}</td>
                        <td>{t.sucursal_destino ?? '—'}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                          {t.cantidad}
                        </td>
                        <td>{t.autorizado_por ?? '—'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{t.nota ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* Modal de Reabastecimiento / Entrada de Stock */}
      {modalReabastecer && (
        <ReabastecerModal
          sucursales={sucursales}
          catalogo={catalogo}
          sucursalActualId={sucursalId}
          onCerrar={() => setModalReabastecer(false)}
          onGuardado={async () => {
            setModalReabastecer(false);
            await cargar(sucursalId);
          }}
        />
      )}

      {/* Modal de Transferencia */}
      {modalTransf && (
        <TransferenciaModal
          sucursales={sucursales}
          onCerrar={() => setModalTransf(false)}
          onHecha={async () => {
            setModalTransf(false);
            await cargar(sucursalId);
          }}
        />
      )}

      {/* Modal de Ajuste o Retiro de Existencias */}
      {modalAjustar && (
        <AjustarExistenciaModal
          ajuste={modalAjustar}
          sucursales={sucursales}
          onCerrar={() => setModalAjustar(null)}
          onGuardado={async () => {
            setModalAjustar(null);
            await cargar(sucursalId);
          }}
        />
      )}
    </div>
  );
}

function Modal({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.overlay} onClick={onCerrar}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h3>{titulo}</h3>
          <button className={styles.closeBtn} onClick={onCerrar} aria-label="Cerrar">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AjustarExistenciaModal({
  ajuste,
  sucursales,
  onCerrar,
  onGuardado,
}: {
  ajuste: AjustarState;
  sucursales: { id: string; nombre: string }[];
  onCerrar: () => void;
  onGuardado: () => void | Promise<void>;
}) {
  const sucursalNombre =
    sucursales.find((s) => s.id === ajuste.sucursalId)?.nombre ?? 'esta tienda';

  const [modo, setModo] = useState<'restar' | 'vaciar'>('restar');
  const [cantidadRestar, setCantidadRestar] = useState('1');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cantNum = Number(cantidadRestar);
  const stockResultante =
    modo === 'vaciar' ? 0 : Math.max(0, ajuste.cantidadActual - (Number.isNaN(cantNum) ? 0 : cantNum));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (modo === 'restar') {
      if (Number.isNaN(cantNum) || cantNum <= 0) {
        setError('Ingresa una cantidad válida mayor a cero a retirar.');
        return;
      }
      if (cantNum > ajuste.cantidadActual) {
        setError(`No puedes retirar más de ${ajuste.cantidadActual} unidades.`);
        return;
      }
    }

    setGuardando(true);
    setError(null);
    try {
      await eliminarExistencias({
        producto_id: ajuste.productoId,
        sucursal_id: ajuste.sucursalId,
        cantidad: modo === 'restar' ? cantNum : undefined,
      });
      await onGuardado();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={`Ajustar / Eliminar Existencia: ${ajuste.modelo}`} onCerrar={onCerrar}>
      <form className={styles.form} onSubmit={guardar}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--surface-container-low)', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--outline-variant)' }}>
          <div>Tienda: <strong>{sucursalNombre}</strong></div>
          <div>Existencia actual: <strong className="mono" style={{ color: 'var(--primary)' }}>{ajuste.cantidadActual} unidades</strong></div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="modo"
              checked={modo === 'restar'}
              onChange={() => setModo('restar')}
            />
            <span>Retirar piezas (merma / ajuste)</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="modo"
              checked={modo === 'vaciar'}
              onChange={() => setModo('vaciar')}
            />
            <span style={{ color: 'var(--error)', fontWeight: 600 }}>Vaciar a 0 (Eliminar todo)</span>
          </label>
        </div>

        {modo === 'restar' && (
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Unidades a Retirar (- Cantidad)</span>
            <input
              className={styles.input}
              inputMode="numeric"
              value={cantidadRestar}
              onChange={(e) => setCantidadRestar(e.target.value)}
              placeholder="1"
              autoFocus
            />
          </label>
        )}

        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Nueva existencia quedará en:{' '}
          <strong className="mono" style={{ color: stockResultante === 0 ? 'var(--error)' : 'var(--success)' }}>
            {stockResultante} unidades
          </strong>
        </div>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.btnPrimary}
            style={{ background: modo === 'vaciar' ? 'var(--error)' : 'var(--primary)' }}
            disabled={guardando}
          >
            {guardando
              ? 'Aplicando…'
              : modo === 'vaciar'
              ? 'Eliminar y Vaciar a 0'
              : 'Aplicar Retiro de Stock'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReabastecerModal({
  sucursales,
  catalogo,
  sucursalActualId,
  onCerrar,
  onGuardado,
}: {
  sucursales: { id: string; nombre: string; es_matriz?: boolean }[];
  catalogo: Producto[];
  sucursalActualId: string;
  onCerrar: () => void;
  onGuardado: () => void | Promise<void>;
}) {
  const [sucursalId, setSucursalId] = useState(
    sucursalActualId || sucursales[0]?.id || '',
  );
  const [productoId, setProductoId] = useState(catalogo[0]?.id || '');
  const [cantidad, setCantidad] = useState('1');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productoSeleccionado = catalogo.find((p) => p.id === productoId);
  const stockEnSucursal = (productoSeleccionado?.inventario ?? []).find(
    (inv) => inv.sucursal_id === sucursalId,
  )?.cantidad ?? 0;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!sucursalId) {
      setError('Selecciona la sucursal de destino.');
      return;
    }
    if (!productoId) {
      setError('Selecciona el producto a reabastecer.');
      return;
    }
    const cantNum = Number(cantidad);
    if (Number.isNaN(cantNum) || cantNum <= 0) {
      setError('Ingresa una cantidad válida mayor a cero.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await reabastecerInventario({
        producto_id: productoId,
        sucursal_id: sucursalId,
        cantidad: cantNum,
        nota: nota.trim() || undefined,
      });
      await onGuardado();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Entrada de Inventario / Reabastecimiento" onCerrar={onCerrar}>
      <form className={styles.form} onSubmit={guardar}>
        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Sucursal Receptora</span>
            <select
              className={styles.input}
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} {s.es_matriz ? '(Matriz)' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Cantidad a Ingresar (+ Unidades)</span>
            <input
              className={styles.input}
              inputMode="numeric"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="10"
              autoFocus
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Producto / Batería</span>
          <select
            className={styles.input}
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
          >
            {catalogo.map((p) => (
              <option key={p.id} value={p.id}>
                {p.modelo} — {p.marcas?.nombre ?? 'Sin Marca'} ({formatearDinero(p.precio)})
              </option>
            ))}
          </select>
        </label>

        {productoSeleccionado && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '-4px 0 4px' }}>
            Existencia actual en esta tienda:{' '}
            <strong className="mono" style={{ color: 'var(--primary)' }}>
              {stockEnSucursal} unidades
            </strong>
          </p>
        )}

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nota / Folio de Compra (opcional)</span>
          <input
            className={styles.input}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej. Factura Proveedor LTH #4928"
          />
        </label>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnPrimary} disabled={guardando}>
            {guardando ? 'Ingresando…' : '+ Registrar Entrada de Stock'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TransferenciaModal({
  sucursales,
  onCerrar,
  onHecha,
}: {
  sucursales: { id: string; nombre: string }[];
  onCerrar: () => void;
  onHecha: () => void | Promise<void>;
}) {
  const [origenId, setOrigenId] = useState(sucursales[0]?.id ?? '');
  const [destinoId, setDestinoId] = useState(sucursales[1]?.id ?? '');
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const datos = await listarInventario(origenId);
        if (!activo) return;
        const conStock = datos.filter((i) => i.cantidad > 0);
        setInventario(conStock);
        setProductoId(conStock.length > 0 ? (conStock[0].producto_id ?? '') : '');
        setCantidad('');
      } catch (e) {
        if (!activo) return;
        setError(mensajeError(e));
      }
    })();
    return () => {
      activo = false;
    };
  }, [origenId]);

  const producto = inventario.find((i) => i.producto_id === productoId);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (origenId === destinoId) {
      setError('La sucursal de origen y destino deben ser distintas.');
      return;
    }
    if (!productoId) {
      setError('Selecciona un producto con stock disponible.');
      return;
    }
    const cant = Number(cantidad);
    if (Number.isNaN(cant) || cant < 1) {
      setError('Ingresa una cantidad válida a transferir.');
      return;
    }
    if (producto && cant > producto.cantidad) {
      setError(`Solo hay ${producto.cantidad} unidades disponibles en la tienda de origen.`);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await transferirInventario({
        producto_id: productoId,
        sucursal_origen_id: origenId,
        sucursal_destino_id: destinoId,
        cantidad: cant,
        nota: nota.trim() || undefined,
      });
      await onHecha();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Nueva Transferencia entre Sucursales" onCerrar={onCerrar}>
      <form className={styles.form} onSubmit={guardar}>
        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Sucursal de Origen</span>
            <select
              className={styles.input}
              value={origenId}
              onChange={(e) => setOrigenId(e.target.value)}
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Sucursal de Destino</span>
            <select
              className={styles.input}
              value={destinoId}
              onChange={(e) => setDestinoId(e.target.value)}
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Producto Disponible en Origen</span>
          <select
            className={styles.input}
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
          >
            {inventario.length === 0 && (
              <option value="">Sin existencias disponibles en origen</option>
            )}
            {inventario.map((i) => (
              <option key={i.producto_id} value={i.producto_id ?? ''}>
                {i.modelo} ({i.cantidad} disponibles)
              </option>
            ))}
          </select>
        </label>

        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Cantidad a Mover</span>
            <input
              className={styles.input}
              inputMode="numeric"
              placeholder="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              autoFocus
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Nota de Envío (opcional)</span>
            <input
              className={styles.input}
              placeholder="Motivo o chofer responsable"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </label>
        </div>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnPrimary} disabled={guardando}>
            {guardando ? 'Transfiriendo…' : 'Autorizar Transferencia'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
