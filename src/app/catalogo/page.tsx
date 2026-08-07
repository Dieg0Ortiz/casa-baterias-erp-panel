'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '@/lib/api';
import { logout, useSesion } from '@/lib/auth';
import {
  type Marca,
  type Producto,
  actualizarMarca,
  actualizarPrecio,
  crearMarca,
  crearProducto,
  darDeBaja,
  eliminarMarca,
  formatearDinero,
  listarMarcas,
  listarProductos,
  stockTotal,
} from '@/lib/catalogo';
import {
  IconBolt,
  IconDashboard,
  IconCatalog,
  IconInventory,
  IconReports,
  IconLogout,
  IconSearch,
  IconAdd,
  IconEdit,
  IconDelete,
  IconClose,
  IconPriceTag,
} from '@/components/Icons';
import styles from './catalogo.module.css';

type ModalState =
  | { tipo: 'nuevaMarca' }
  | { tipo: 'editarMarca'; marca: Marca }
  | { tipo: 'nuevoProducto' }
  | { tipo: 'precio'; producto: Producto }
  | null;

function mensajeError(e: unknown): string {
  return e instanceof ApiError
    ? e.message
    : 'Ocurrió un error. Intenta de nuevo.';
}

export default function CatalogoPage() {
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
          <button className={styles.btnPrimarySm} onClick={salir}>
            Salir
          </button>
        </div>
      </div>
    );
  }

  return <CatalogoAdmin />;
}

function CatalogoAdmin() {
  const router = useRouter();
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [filtro, setFiltro] = useState('');
  const [operando, setOperando] = useState(false);

  async function recargar() {
    setCargando(true);
    setError(null);
    try {
      const [m, p] = await Promise.all([listarMarcas(), listarProductos()]);
      setMarcas(m);
      setProductos(p);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void recargar();
  }, []);

  async function eliminar(marca: Marca) {
    const totalEnMarca = productos.filter((p) => p.marcas?.nombre === marca.nombre).length;
    const msg =
      totalEnMarca > 0
        ? `¿Eliminar la marca "${marca.nombre}"? Tiene ${totalEnMarca} producto(s) asociado(s).`
        : `¿Eliminar la marca "${marca.nombre}"?`;
    if (!confirm(msg)) return;
    setOperando(true);
    setError(null);
    try {
      await eliminarMarca(marca.id);
      await recargar();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOperando(false);
    }
  }

  async function bajarDeCatalogo(producto: Producto) {
    if (
      !confirm(
        `¿Dar de baja "${producto.modelo}"? Ya no aparecerá disponible para ventas.`,
      )
    ) {
      return;
    }
    setOperando(true);
    setError(null);
    try {
      await darDeBaja(producto.id);
      await recargar();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOperando(false);
    }
  }

  function salir() {
    logout();
    router.replace('/login');
    router.refresh();
  }

  const visibles = productos.filter((p) => {
    if (!filtro.trim()) return true;
    const f = filtro.toLowerCase();
    return (
      p.modelo.toLowerCase().includes(f) ||
      p.codigo_barras.toLowerCase().includes(f) ||
      (p.marcas?.nombre ?? '').toLowerCase().includes(f)
    );
  });

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
          <Link href="/catalogo" className={`${styles.navItem} ${styles.navItemActive}`}>
            <IconCatalog className={styles.navIcon} />
            <span>Catálogo</span>
          </Link>
          <Link href="/inventario" className={styles.navItem}>
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
            <span className={styles.breadcrumbActive}>Catálogo de Productos y Marcas</span>
          </div>
        </header>

        <main className={styles.mainContent}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              <span>{error}</span>
              <button className={styles.btnSecondary} onClick={() => void recargar()}>
                Reintentar
              </button>
            </div>
          )}

          <div className={styles.catalogGrid}>
            {/* Columna Izquierda: Marcas */}
            <section className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Marcas Registradas</h2>
                <button
                  className={styles.btnPrimarySm}
                  onClick={() => setModal({ tipo: 'nuevaMarca' })}
                  disabled={operando}
                >
                  <IconAdd style={{ width: '14px', height: '14px' }} />
                  <span>Nueva</span>
                </button>
              </div>

              {cargando ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Cargando marcas…
                </div>
              ) : marcas.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No hay marcas registradas.
                </div>
              ) : (
                <ul className={styles.brandList}>
                  {marcas.map((marca) => (
                    <li key={marca.id} className={styles.brandItem}>
                      <div>
                        <div className={styles.brandName}>{marca.nombre}</div>
                        {marca.descripcion && <p className={styles.brandDesc}>{marca.descripcion}</p>}
                      </div>
                      <div className={styles.itemActions}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => setModal({ tipo: 'editarMarca', marca })}
                          disabled={operando}
                          title="Editar marca"
                        >
                          <IconEdit />
                        </button>
                        <button
                          className={styles.btnDeleteAction}
                          onClick={() => void eliminar(marca)}
                          disabled={operando}
                          title="Eliminar marca"
                        >
                          <IconDelete />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Columna Derecha: Productos */}
            <section className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Catálogo de Baterías y Productos</h2>
                <button
                  className={styles.btnPrimarySm}
                  onClick={() => setModal({ tipo: 'nuevoProducto' })}
                  disabled={operando || marcas.length === 0}
                  title={marcas.length === 0 ? 'Registra una marca primero' : undefined}
                >
                  <IconAdd style={{ width: '14px', height: '14px' }} />
                  <span>Nuevo Producto</span>
                </button>
              </div>

              <div className={styles.toolbar}>
                <span style={{ display: 'flex', color: 'var(--text-muted)' }}><IconSearch /></span>
                <input
                  className={styles.searchInput}
                  placeholder="Buscar producto por modelo o código de barras…"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </div>

              <div className={styles.tableScroll}>
                {cargando ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Cargando catálogo…
                  </div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Modelo</th>
                        <th>Marca</th>
                        <th>Código de Barras</th>
                        <th style={{ textAlign: 'right' }}>Precio</th>
                        <th style={{ textAlign: 'right' }}>Stock Total</th>
                        <th style={{ textAlign: 'center' }}>Requiere Casco</th>
                        <th style={{ textAlign: 'center' }}>Estado</th>
                        <th style={{ textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No se encontraron productos coincidentes.
                          </td>
                        </tr>
                      )}
                      {visibles.map((producto) => (
                        <tr
                          key={producto.id}
                          className={producto.activo ? undefined : styles.rowInactive}
                        >
                          <td>
                            <strong>{producto.modelo}</strong>
                            {producto.descripcion && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {producto.descripcion}
                              </div>
                            )}
                          </td>
                          <td>{producto.marcas?.nombre ?? '—'}</td>
                          <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                            {producto.codigo_barras}
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                            {formatearDinero(producto.precio)}
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                            {stockTotal(producto)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {producto.requiere_casco ? 'Sí' : 'No'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {producto.activo ? (
                              <span className={styles.badgeActivo}>Activo</span>
                            ) : (
                              <span className={styles.badgeBaja}>Baja</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className={styles.itemActions} style={{ justifyContent: 'center' }}>
                              <button
                                className={styles.btnPriceAction}
                                onClick={() => setModal({ tipo: 'precio', producto })}
                                disabled={operando || !producto.activo}
                                title="Modificar precio de venta"
                              >
                                <IconPriceTag style={{ width: '13px', height: '13px' }} />
                                <span>Precio</span>
                              </button>
                              {producto.activo && (
                                <button
                                  className={styles.btnDeleteAction}
                                  onClick={() => void bajarDeCatalogo(producto)}
                                  disabled={operando}
                                  title="Dar de baja producto del catálogo"
                                >
                                  <IconDelete style={{ width: '15px', height: '15px' }} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Modales */}
      {modal?.tipo === 'nuevaMarca' && (
        <NuevaMarcaModal
          onCerrar={() => setModal(null)}
          onGuardada={async () => {
            setModal(null);
            await recargar();
          }}
        />
      )}

      {modal?.tipo === 'editarMarca' && (
        <EditarMarcaModal
          marca={modal.marca}
          onCerrar={() => setModal(null)}
          onGuardada={async () => {
            setModal(null);
            await recargar();
          }}
        />
      )}

      {modal?.tipo === 'nuevoProducto' && (
        <NuevoProductoModal
          marcas={marcas}
          onCerrar={() => setModal(null)}
          onGuardado={async () => {
            setModal(null);
            await recargar();
          }}
        />
      )}

      {modal?.tipo === 'precio' && (
        <PrecioModal
          producto={modal.producto}
          onCerrar={() => setModal(null)}
          onGuardado={async () => {
            setModal(null);
            await recargar();
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

function NuevaMarcaModal({
  onCerrar,
  onGuardada,
}: {
  onCerrar: () => void;
  onGuardada: () => void | Promise<void>;
}) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre de la marca es obligatorio.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await crearMarca({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
      });
      await onGuardada();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Nueva Marca" onCerrar={onCerrar}>
      <form className={styles.form} onSubmit={guardar}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nombre de la Marca</span>
          <input
            className={styles.input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. América, LTH, Cronos"
            autoFocus
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Descripción (opcional)</span>
          <input
            className={styles.input}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Garantías, línea comercial, etc."
          />
        </label>
        {error && <p className={styles.errorBanner}>{error}</p>}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnPrimarySm} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Crear Marca'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditarMarcaModal({
  marca,
  onCerrar,
  onGuardada,
}: {
  marca: Marca;
  onCerrar: () => void;
  onGuardada: () => void | Promise<void>;
}) {
  const [nombre, setNombre] = useState(marca.nombre);
  const [descripcion, setDescripcion] = useState(marca.descripcion ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre de la marca es obligatorio.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await actualizarMarca(marca.id, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
      });
      await onGuardada();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Editar Marca" onCerrar={onCerrar}>
      <form className={styles.form} onSubmit={guardar}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nombre de la Marca</span>
          <input
            className={styles.input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Descripción (opcional)</span>
          <input
            className={styles.input}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>
        {error && <p className={styles.errorBanner}>{error}</p>}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnPrimarySm} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NuevoProductoModal({
  marcas,
  onCerrar,
  onGuardado,
}: {
  marcas: Marca[];
  onCerrar: () => void;
  onGuardado: () => void | Promise<void>;
}) {
  const [marcaId, setMarcaId] = useState(marcas[0]?.id ?? '');
  const [modelo, setModelo] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [requiereCasco, setRequiereCasco] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!marcaId) {
      setError('Debes seleccionar una marca.');
      return;
    }
    if (!modelo.trim()) {
      setError('El modelo del producto es obligatorio.');
      return;
    }
    if (!codigoBarras.trim()) {
      setError('El código de barras es obligatorio.');
      return;
    }
    const precioNum = Number(precio);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      setError('Ingresa un precio válido (mayor o igual a cero).');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await crearProducto({
        marca_id: marcaId,
        modelo: modelo.trim(),
        codigo_barras_fabrica: codigoBarras.trim(),
        descripcion: descripcion.trim() || undefined,
        precio: precioNum,
        requiere_casco: requiereCasco,
      });
      await onGuardado();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Nuevo Producto / Batería" onCerrar={onCerrar}>
      <form className={styles.form} onSubmit={guardar}>
        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Marca</span>
            <select
              className={styles.select}
              value={marcaId}
              onChange={(e) => setMarcaId(e.target.value)}
            >
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Modelo</span>
            <input
              className={styles.input}
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Ej. NS40ZL, L-48/91-700"
              autoFocus
            />
          </label>
        </div>

        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Código de Barras</span>
            <input
              className={styles.input}
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              placeholder="Ej. 7501000123456"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Precio de Venta ($ MXN)</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="1850.00"
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Descripción Técnica (opcional)</span>
          <input
            className={styles.input}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Amperaje, bornes, medidas, garantía…"
          />
        </label>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={requiereCasco}
            onChange={(e) => setRequiereCasco(e.target.checked)}
          />
          <span>Requiere entregar casco/batería vieja a cambio</span>
        </label>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnPrimarySm} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Registrar Producto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PrecioModal({
  producto,
  onCerrar,
  onGuardado,
}: {
  producto: Producto;
  onCerrar: () => void;
  onGuardado: () => void | Promise<void>;
}) {
  const [precio, setPrecio] = useState(String(producto.precio));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const pNum = Number(precio);
    if (Number.isNaN(pNum) || pNum < 0) {
      setError('Ingresa un precio válido (mayor o igual a cero).');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await actualizarPrecio(producto.id, pNum);
      await onGuardado();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={`Modificar Precio: ${producto.modelo}`} onCerrar={onCerrar}>
      <form className={styles.form} onSubmit={guardar}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Precio actual:{' '}
          <strong style={{ color: 'var(--primary)' }}>
            {formatearDinero(producto.precio)}
          </strong>
        </p>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nuevo Precio ($ MXN)</span>
          <input
            className={styles.input}
            inputMode="decimal"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </label>
        {error && <p className={styles.errorBanner}>{error}</p>}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnPrimarySm} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Actualizar Precio'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
