'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '@/lib/api';
import { logout, useSesion } from '@/lib/auth';
import { formatearDinero, listarSucursales } from '@/lib/catalogo';
import {
  type ItemInventario,
  type Transferencia,
  listarInventario,
  listarTransferencias,
  transferirInventario,
} from '@/lib/inventario';
import {
  IconBolt,
  IconDashboard,
  IconCatalog,
  IconInventory,
  IconReports,
  IconLogout,
  IconTransfer,
  IconClose,
} from '@/components/Icons';
import styles from './inventario.module.css';

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
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>(
    [],
  );
  const [sucursalId, setSucursalId] = useState('');
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const suc = await listarSucursales();
        if (!activo) return;
        setSucursales(suc);
      } catch (e) {
        if (activo) setError(mensajeError(e));
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

  const totalUnidades = items.reduce((s, i) => s + i.cantidad, 0);
  const totalCascos = items.reduce((s, i) => s + i.cascos_disponibles, 0);
  const nombreSucursal =
    sucursales.find((s) => s.id === sucursalId)?.nombre ?? 'Todas las Sucursales';

  return (
    <div className={styles.layout}>
      {/* Sidebar Persistente */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span style={{ color: 'var(--primary)', display: 'flex' }}><IconBolt /></span>
          <div>
            <h1 className={styles.brandTitle}>Casa Baterías</h1>
            <p className={styles.brandSubtitle}>Control Central</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link href="/" className={styles.navItem}>
            <IconDashboard className={styles.navIcon} />
            <span>Dashboard</span>
          </Link>
          <Link href="/catalogo" className={styles.navItem}>
            <IconCatalog className={styles.navIcon} />
            <span>Catálogo</span>
          </Link>
          <Link href="/inventario" className={`${styles.navItem} ${styles.navItemActive}`}>
            <IconInventory className={styles.navIcon} />
            <span>Inventario</span>
          </Link>
          <Link href="/reportes" className={styles.navItem}>
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
          <div className={styles.breadcrumb}>
            <Link href="/" style={{ color: 'var(--text-muted)' }}>Panel</Link>
            <span>/</span>
            <span className={styles.breadcrumbActive}>Inventario y Existencias</span>
          </div>
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

          {/* Barra de Filtro de Sucursal */}
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
                onClick={() => setModal(true)}
                disabled={cargando || sucursales.length < 2}
                title={
                  sucursales.length < 2
                    ? 'Se necesitan al menos dos sucursales para transferir'
                    : undefined
                }
              >
                + Nueva Transferencia
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

      {/* Modal de Transferencia */}
      {modal && (
        <TransferenciaModal
          sucursales={sucursales}
          onCerrar={() => setModal(false)}
          onHecha={async () => {
            setModal(false);
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
        if (activo) setError(mensajeError(e));
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
