'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '@/lib/api';
import { logout, useSesion } from '@/lib/auth';
import {
  type Marca,
  type Producto,
  type Sucursal,
  actualizarMarca,
  actualizarPrecio,
  crearMarca,
  crearProducto,
  darDeBaja,
  eliminarMarca,
  formatearDinero,
  listarMarcas,
  listarProductos,
  listarSucursales,
  stockTotal,
} from '@/lib/catalogo';
import { transferirInventario } from '@/lib/inventario';
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
  IconTransfer,
} from '@/components/Icons';
import styles from './catalogo.module.css';

type ModalState =
  | { tipo: 'nuevaMarca' }
  | { tipo: 'editarMarca'; marca: Marca }
  | { tipo: 'nuevoProducto' }
  | { tipo: 'precio'; producto: Producto }
  | { tipo: 'reubicar'; producto: Producto }
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
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [filtro, setFiltro] = useState('');
  const [operando, setOperando] = useState(false);

  async function recargar() {
    setCargando(true);
    setError(null);
    try {
      const [m, p, s] = await Promise.all([
        listarMarcas(),
        listarProductos(),
        listarSucursales(),
      ]);
      setMarcas(m);
      setProductos(p);
      setSucursales(s);
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

  function obtenerSucursalInfo(sucId: string): { nombre: string; esMatriz: boolean } {
    const suc = sucursales.find((s) => s.id === sucId);
    return {
      nombre: suc?.nombre ?? 'Tienda',
      esMatriz: suc?.es_matriz ?? false,
    };
  }

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

          {/* Sección Superior: Marcas Registradas en Card Horizontal */}
          <section className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <IconCatalog style={{ color: 'var(--primary)' }} />
                <span>Marcas Registradas ({marcas.length})</span>
              </h2>
              <button
                className={styles.btnPrimarySm}
                onClick={() => setModal({ tipo: 'nuevaMarca' })}
                disabled={operando}
              >
                <IconAdd style={{ width: '14px', height: '14px' }} />
                <span>Nueva Marca</span>
              </button>
            </div>

            {cargando ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Cargando marcas…
              </div>
            ) : marcas.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No hay marcas registradas. Haz clic en «Nueva Marca» para agregar la primera.
              </div>
            ) : (
              <div className={styles.brandsGrid}>
                {marcas.map((marca) => (
                  <div key={marca.id} className={styles.brandChip}>
                    <div>
                      <div className={styles.brandName}>{marca.nombre}</div>
                      {marca.descripcion && (
                        <div className={styles.brandDesc} title={marca.descripcion}>
                          {marca.descripcion}
                        </div>
                      )}
                    </div>
                    <div className={styles.brandActions}>
                      <button
                        className={styles.brandActionBtn}
                        onClick={() => setModal({ tipo: 'editarMarca', marca })}
                        disabled={operando}
                        title="Editar marca"
                      >
                        <IconEdit style={{ width: '14px', height: '14px' }} />
                      </button>
                      <button
                        className={styles.brandActionBtnDanger}
                        onClick={() => void eliminar(marca)}
                        disabled={operando}
                        title="Eliminar marca"
                      >
                        <IconDelete style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Sección Principal: Catálogo de Productos a Ancho Completo */}
          <section className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <IconInventory style={{ color: 'var(--primary)' }} />
                <span>Catálogo General de Baterías y Productos ({productos.length})</span>
              </h2>
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
                placeholder="Buscar producto por modelo, marca o código de barras…"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>

            <div className={styles.tableScroll}>
              {cargando ? (
                <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
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
                      <th>Existencias por Tienda</th>
                      <th style={{ textAlign: 'center' }}>Requiere Casco</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No se encontraron productos que coincidan con la búsqueda.
                        </td>
                      </tr>
                    )}
                    {visibles.map((producto) => {
                      const totalExistencias = stockTotal(producto);
                      const conStock = (producto.inventario ?? []).filter((i) => i.cantidad > 0);

                      return (
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
                            {totalExistencias}
                          </td>
                          <td>
                            {conStock.length === 0 ? (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sin existencias</span>
                            ) : (
                              <div className={styles.stockBreakdownList}>
                                {conStock.map((inv) => {
                                  const info = obtenerSucursalInfo(inv.sucursal_id);
                                  return (
                                    <span
                                      key={inv.sucursal_id}
                                      className={`${styles.stockTag} ${info.esMatriz ? styles.stockTagMatriz : ''}`}
                                    >
                                      <span className={styles.stockTagSucursal}>{info.nombre}:</span>
                                      <span className={styles.stockTagValue}>{inv.cantidad}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
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
                            <div className={styles.itemActions}>
                              <button
                                className={styles.btnPriceAction}
                                onClick={() => setModal({ tipo: 'precio', producto })}
                                disabled={operando || !producto.activo}
                                title="Modificar precio de venta"
                              >
                                <IconPriceTag style={{ width: '12px', height: '12px' }} />
                                <span>Precio</span>
                              </button>

                              {producto.activo && totalExistencias > 0 && sucursales.length > 1 && (
                                <button
                                  className={styles.btnRelocateAction}
                                  onClick={() => setModal({ tipo: 'reubicar', producto })}
                                  disabled={operando}
                                  title="Corregir o reubicar sucursal de existencia"
                                >
                                  <IconTransfer style={{ width: '12px', height: '12px' }} />
                                  <span>Reubicar</span>
                                </button>
                              )}

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
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
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
          sucursales={sucursales}
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

      {modal?.tipo === 'reubicar' && (
        <ReubicarStockModal
          producto={modal.producto}
          sucursales={sucursales}
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
  sucursales,
  onCerrar,
  onGuardado,
}: {
  marcas: Marca[];
  sucursales: Sucursal[];
  onCerrar: () => void;
  onGuardado: () => void | Promise<void>;
}) {
  const matrizDefault = sucursales.find((s) => s.es_matriz)?.id ?? sucursales[0]?.id ?? '';

  const [marcaId, setMarcaId] = useState(marcas[0]?.id ?? '');
  const [sucursalId, setSucursalId] = useState(matrizDefault);
  const [cantidadInicial, setCantidadInicial] = useState('1');
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
    if (!sucursalId) {
      setError('Selecciona la sucursal de alta.');
      return;
    }
    const precioNum = Number(precio);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      setError('Ingresa un precio válido (mayor o igual a cero).');
      return;
    }
    const cantNum = Number(cantidadInicial);
    if (Number.isNaN(cantNum) || cantNum < 0) {
      setError('Ingresa una cantidad inicial válida.');
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
        sucursal_id: sucursalId,
        cantidad_inicial: cantNum,
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
            <span className={styles.fieldLabel}>Sucursal de Alta (Inventario Inicial)</span>
            <select
              className={styles.select}
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} {s.es_matriz ? '(Matriz - Por defecto)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Stock Inicial en Tienda</span>
            <input
              className={styles.input}
              inputMode="numeric"
              value={cantidadInicial}
              onChange={(e) => setCantidadInicial(e.target.value)}
              placeholder="1"
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

function ReubicarStockModal({
  producto,
  sucursales,
  onCerrar,
  onGuardado,
}: {
  producto: Producto;
  sucursales: Sucursal[];
  onCerrar: () => void;
  onGuardado: () => void | Promise<void>;
}) {
  const existencias = (producto.inventario ?? []).filter((i) => i.cantidad > 0);
  const origenDefault = existencias[0]?.sucursal_id ?? sucursales[0]?.id ?? '';
  const destinoDefault =
    sucursales.find((s) => s.id !== origenDefault)?.id ?? sucursales[1]?.id ?? '';

  const [origenId, setOrigenId] = useState(origenDefault);
  const [destinoId, setDestinoId] = useState(destinoDefault);
  const [cantidad, setCantidad] = useState(String(existencias[0]?.cantidad ?? 1));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existenciaOrigen = existencias.find((e) => e.sucursal_id === origenId);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (origenId === destinoId) {
      setError('La sucursal de origen y destino deben ser distintas.');
      return;
    }
    const cantNum = Number(cantidad);
    if (Number.isNaN(cantNum) || cantNum <= 0) {
      setError('Ingresa una cantidad válida a reubicar.');
      return;
    }
    if (existenciaOrigen && cantNum > existenciaOrigen.cantidad) {
      setError(`Solo hay ${existenciaOrigen.cantidad} unidad(es) disponible(s) en la tienda de origen.`);
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await transferirInventario({
        producto_id: producto.id,
        sucursal_origen_id: origenId,
        sucursal_destino_id: destinoId,
        cantidad: cantNum,
        nota: 'Corrección de sucursal inicial',
      });
      await onGuardado();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={`Corregir Sucursal: ${producto.modelo}`} onCerrar={onCerrar}>
      <form className={styles.form} onSubmit={guardar}>
        <p className={styles.helperText}>
          Usa esta opción si el producto fue asignado por error a una sucursal distinta al momento del registro.
        </p>

        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Ubicación Actual (Origen)</span>
            <select
              className={styles.select}
              value={origenId}
              onChange={(e) => {
                const nuevoOrigen = e.target.value;
                setOrigenId(nuevoOrigen);
                const stock = existencias.find((x) => x.sucursal_id === nuevoOrigen)?.cantidad ?? 1;
                setCantidad(String(stock));
              }}
            >
              {existencias.map((inv) => {
                const suc = sucursales.find((s) => s.id === inv.sucursal_id);
                return (
                  <option key={inv.sucursal_id} value={inv.sucursal_id}>
                    {suc?.nombre ?? 'Tienda'} ({inv.cantidad} en existencia)
                  </option>
                );
              })}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Sucursal Correcta (Destino)</span>
            <select
              className={styles.select}
              value={destinoId}
              onChange={(e) => setDestinoId(e.target.value)}
            >
              {sucursales
                .filter((s) => s.id !== origenId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} {s.es_matriz ? '(Matriz)' : ''}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Cantidad de Unidades a Mover</span>
          <input
            className={styles.input}
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="1"
            autoFocus
          />
        </label>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnPrimarySm} disabled={guardando}>
            {guardando ? 'Reubicando…' : 'Corregir Ubicación'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
