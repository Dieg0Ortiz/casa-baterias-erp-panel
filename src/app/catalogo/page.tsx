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
  actualizarProducto,
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
  IconMenu,
  IconCasco,
  IconUsers,
} from '@/components/Icons';
import { Sidebar } from '@/components/Sidebar';
import styles from './catalogo.module.css';

type ModalState =
  | { tipo: 'nuevaMarca' }
  | { tipo: 'editarMarca'; marca: Marca }
  | { tipo: 'nuevoProducto' }
  | { tipo: 'editarProducto'; producto: Producto }
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
  const [menuAbierto, setMenuAbierto] = useState(false);

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

  return (
    <div className={styles.layout}>
      <Sidebar active="catalogo" menuAbierto={menuAbierto} onCerrarMenu={() => setMenuAbierto(false)} />

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
              <span className={styles.breadcrumbActive}>Catálogo</span>
            </div>
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

          {/* Sección Principal: Catálogo Técnico de Productos */}
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
                      <th style={{ minWidth: '180px' }}>Modelo / Especificaciones</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Marca</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Código de Barras</th>
                      <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Precio Compra</th>
                      <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Precios de Venta</th>
                      <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Utilidad</th>
                      <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Stock</th>
                      <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Casco</th>
                      <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Estado</th>
                      <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No se encontraron productos que coincidan con la búsqueda.
                        </td>
                      </tr>
                    )}
                    {visibles.map((producto) => {
                      const totalExistencias = stockTotal(producto);

                      return (
                        <tr
                          key={producto.id}
                          className={producto.activo ? undefined : styles.rowInactive}
                        >
                          <td style={{ maxWidth: '250px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{producto.modelo}</div>
                            {producto.descripcion && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3, marginTop: '2px' }}>
                                {producto.descripcion}
                              </div>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{producto.marcas?.nombre ?? '—'}</td>
                          <td className="mono" style={{ color: 'var(--text-secondary)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                            {producto.codigo_barras}
                          </td>
                          <td className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ color: 'var(--text-primary)' }}>
                              {formatearDinero(producto.precio_compra ?? 0)}
                            </div>
                          </td>
                          <td className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                              {formatearDinero(producto.precio)}
                            </div>
                            {(producto.precio_2 != null || producto.precio_3 != null) && (
                              <div
                                style={{
                                  fontSize: '10px',
                                  color: 'var(--text-secondary)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '1px',
                                  marginTop: '2px',
                                }}
                              >
                                {producto.precio_2 != null && (
                                  <span>P2: {formatearDinero(producto.precio_2)}</span>
                                )}
                                {producto.precio_3 != null && (
                                  <span>P3: {formatearDinero(producto.precio_3)}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 700, color: 'var(--success, #16a34a)' }}>
                              {formatearDinero(producto.precio - (producto.precio_compra ?? 0))}
                            </div>
                          </td>
                          <td className="mono" style={{ textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {totalExistencias}
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {producto.requiere_casco ? (
                              <div>
                                <span style={{ fontWeight: 600, color: 'var(--primary, #0d6efd)' }}>Sí</span>
                                {producto.comision_casco != null && Number(producto.comision_casco) > 0 && (
                                  <div style={{ fontSize: '10px', color: '#dc2626', marginTop: '1px', fontWeight: 600 }}>
                                    +{formatearDinero(Number(producto.comision_casco))} s/casco
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>No</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {producto.activo ? (
                              <span className={styles.badgeActivo}>Activo</span>
                            ) : (
                              <span className={styles.badgeBaja}>Baja</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div className={styles.itemActions}>
                              <button
                                className={styles.btnPriceAction}
                                onClick={() => setModal({ tipo: 'editarProducto', producto })}
                                disabled={operando || !producto.activo}
                                title="Editar datos y precios del producto"
                              >
                                <IconEdit style={{ width: '12px', height: '12px' }} />
                                <span>Editar</span>
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

      {modal?.tipo === 'editarProducto' && (
        <EditarProductoModal
          producto={modal.producto}
          marcas={marcas}
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
  const [precioCompra, setPrecioCompra] = useState('');
  const [precio, setPrecio] = useState('');
  const [precio2, setPrecio2] = useState('');
  const [precio3, setPrecio3] = useState('');
  const [comisionCasco, setComisionCasco] = useState('');
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
    if (!sucursalId) {
      setError('Selecciona la sucursal de alta inicial.');
      return;
    }
    const precioNum = Number(precio);
    if (Number.isNaN(precioNum) || precioNum < 0 || precio.trim() === '') {
      setError('Ingresa un precio default válido (mayor o igual a cero).');
      return;
    }
    let p2Num: number | undefined = undefined;
    if (precio2.trim()) {
      p2Num = Number(precio2);
      if (Number.isNaN(p2Num) || p2Num < 0) {
        setError('Ingresa un Precio 2 válido (mayor o igual a cero).');
        return;
      }
    }
    let p3Num: number | undefined = undefined;
    if (precio3.trim()) {
      p3Num = Number(precio3);
      if (Number.isNaN(p3Num) || p3Num < 0) {
        setError('Ingresa un Precio 3 válido (mayor o igual a cero).');
        return;
      }
    }

    let comisionNum: number | undefined = undefined;
    if (requiereCasco && comisionCasco.trim()) {
      comisionNum = Number(comisionCasco);
      if (Number.isNaN(comisionNum) || comisionNum < 0) {
        setError('Ingresa una comisión de casco válida (mayor o igual a cero).');
        return;
      }
    }

    const cantNum = Number(cantidadInicial);
    if (Number.isNaN(cantNum) || cantNum < 0) {
      setError('Ingresa una cantidad inicial válida.');
      return;
    }

    const precioCompraNum = precioCompra.trim() ? Number(precioCompra) : 0;
    if (Number.isNaN(precioCompraNum) || precioCompraNum < 0) {
      setError('Ingresa un Precio de Compra válido (mayor o igual a cero).');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await crearProducto({
        marca_id: marcaId,
        modelo: modelo.trim(),
        codigo_barras_fabrica: codigoBarras.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        precio: precioNum,
        precio_2: p2Num,
        precio_3: p3Num,
        precio_compra: precioCompraNum,
        comision_casco: comisionNum,
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
                  {s.nombre} {s.es_matriz ? '(Matriz)' : ''}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className={styles.fieldLabel}>Código de Barras / SKU (Opcional)</span>
            </div>
            <input
              className={styles.input}
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              placeholder="Automático (CB...) o ingresa uno de fábrica"
            />
            <span className={styles.helperText}>
              Si se deja vacío, el sistema generará automáticamente un código único oficial (CB...).
            </span>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Precio 1 (Default / Público) *</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="1850.00"
            />
          </label>
        </div>

        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Precio Compra / Costo *</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={precioCompra}
              onChange={(e) => setPrecioCompra(e.target.value)}
              placeholder="1200.00"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Precio 2 (Opcional - e.g. Mayoreo / Taller)</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={precio2}
              onChange={(e) => setPrecio2(e.target.value)}
              placeholder="1700.00"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Precio 3 (Opcional - e.g. Especial)</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={precio3}
              onChange={(e) => setPrecio3(e.target.value)}
              placeholder="1600.00"
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

        {requiereCasco && (
          <label className={styles.field} style={{ marginTop: '0.25rem' }}>
            <span className={styles.fieldLabel}>Comisión por NO dejar casco ($ MXN)</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={comisionCasco}
              onChange={(e) => setComisionCasco(e.target.value)}
              placeholder="Ej. 300.00 (monto extra si el cliente no deja batería vieja)"
            />
            <span className={styles.helperText}>
              Este monto se cobrará extra al cliente si se lleva la batería sin casco. Tendrá 15 días para entregar un casco y recuperar su dinero.
            </span>
          </label>
        )}

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

function EditarProductoModal({
  producto,
  marcas,
  onCerrar,
  onGuardado,
}: {
  producto: Producto;
  marcas: Marca[];
  onCerrar: () => void;
  onGuardado: () => void | Promise<void>;
}) {
  const marcaActual = marcas.find((m) => m.nombre === producto.marcas?.nombre)?.id ?? marcas[0]?.id ?? '';

  const [marcaId, setMarcaId] = useState(marcaActual);
  const [modelo, setModelo] = useState(producto.modelo);
  const [codigoBarras, setCodigoBarras] = useState(producto.codigo_barras || '');
  const [descripcion, setDescripcion] = useState(producto.descripcion ?? '');
  const [precioCompra, setPrecioCompra] = useState(producto.precio_compra != null ? String(producto.precio_compra) : '0');
  const [precio, setPrecio] = useState(String(producto.precio));
  const [precio2, setPrecio2] = useState(producto.precio_2 != null ? String(producto.precio_2) : '');
  const [precio3, setPrecio3] = useState(producto.precio_3 != null ? String(producto.precio_3) : '');
  const [comisionCasco, setComisionCasco] = useState(producto.comision_casco != null ? String(producto.comision_casco) : '');
  const [requiereCasco, setRequiereCasco] = useState(producto.requiere_casco);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!modelo.trim()) {
      setError('El modelo del producto es obligatorio.');
      return;
    }
    const precioNum = Number(precio);
    if (Number.isNaN(precioNum) || precioNum < 0 || precio.trim() === '') {
      setError('Ingresa un precio default válido (mayor o igual a cero).');
      return;
    }
    let p2Num: number | undefined = undefined;
    if (precio2.trim()) {
      p2Num = Number(precio2);
      if (Number.isNaN(p2Num) || p2Num < 0) {
        setError('Ingresa un Precio 2 válido (mayor o igual a cero).');
        return;
      }
    }
    let p3Num: number | undefined = undefined;
    if (precio3.trim()) {
      p3Num = Number(precio3);
      if (Number.isNaN(p3Num) || p3Num < 0) {
        setError('Ingresa un Precio 3 válido (mayor o igual a cero).');
        return;
      }
    }

    let comisionNum: number | undefined = undefined;
    if (requiereCasco && comisionCasco.trim()) {
      comisionNum = Number(comisionCasco);
      if (Number.isNaN(comisionNum) || comisionNum < 0) {
        setError('Ingresa una comisión de casco válida (mayor o igual a cero).');
        return;
      }
    }

    const precioCompraNum = precioCompra.trim() ? Number(precioCompra) : 0;
    if (Number.isNaN(precioCompraNum) || precioCompraNum < 0) {
      setError('Ingresa un Precio de Compra válido (mayor o igual a cero).');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await actualizarProducto(producto.id, {
        marca_id: marcaId || undefined,
        modelo: modelo.trim(),
        codigo_barras: codigoBarras.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        precio: precioNum,
        precio_2: p2Num,
        precio_3: p3Num,
        precio_compra: precioCompraNum,
        comision_casco: requiereCasco ? comisionNum : 0,
        requiere_casco: requiereCasco,
      });
      await onGuardado();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={`Editar Producto: ${producto.modelo}`} onCerrar={onCerrar}>
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
              autoFocus
            />
          </label>
        </div>

        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Código de Barras / SKU</span>
            <input
              className={styles.input}
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              placeholder="Ej. 744926400475 o CB..."
            />
            <span className={styles.helperText}>
              Código de barras lineal (1D) para escanear en caja POS.
            </span>
          </label>
        </div>

        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Precio 1 (Default / Público) *</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="0.00"
            />
          </label>
        </div>

        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Precio Compra / Costo *</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={precioCompra}
              onChange={(e) => setPrecioCompra(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Precio 2 (Opcional - e.g. Mayoreo)</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={precio2}
              onChange={(e) => setPrecio2(e.target.value)}
              placeholder="Dejar vacío si no aplica"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Precio 3 (Opcional - e.g. Especial)</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={precio3}
              onChange={(e) => setPrecio3(e.target.value)}
              placeholder="Dejar vacío si no aplica"
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

        {requiereCasco && (
          <label className={styles.field} style={{ marginTop: '0.25rem' }}>
            <span className={styles.fieldLabel}>Comisión por NO dejar casco ($ MXN)</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={comisionCasco}
              onChange={(e) => setComisionCasco(e.target.value)}
              placeholder="Ej. 300.00 (monto extra si el cliente no deja batería vieja)"
            />
            <span className={styles.helperText}>
              Este monto se cobrará extra al cliente si se lleva la batería sin casco. Tendrá 15 días para entregar un casco y recuperar su dinero.
            </span>
          </label>
        )}

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
