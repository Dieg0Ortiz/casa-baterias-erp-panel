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
import styles from './catalogo.module.css';

function mensajeError(e: unknown): string {
  return e instanceof ApiError
    ? e.message
    : 'Ocurrió un error. Intenta de nuevo.';
}

type ModalEstado =
  | { tipo: 'nuevaMarca' }
  | { tipo: 'editarMarca'; marca: Marca }
  | { tipo: 'nuevoProducto' }
  | { tipo: 'precio'; producto: Producto }
  | null;

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
  const [filtro, setFiltro] = useState('');
  const [modal, setModal] = useState<ModalEstado>(null);
  const [operando, setOperando] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const datos = await Promise.all([
          listarMarcas(),
          listarProductos(),
          listarSucursales(),
        ]);
        if (!activo) return;
        setMarcas(datos[0]);
        setProductos(datos[1]);
        setSucursales(datos[2]);
      } catch (e) {
        if (!activo) return;
        setError(mensajeError(e));
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  async function recargar() {
    setError(null);
    setCargando(true);
    try {
      const datos = await Promise.all([
        listarMarcas(),
        listarProductos(),
        listarSucursales(),
      ]);
      setMarcas(datos[0]);
      setProductos(datos[1]);
      setSucursales(datos[2]);
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

  const visibles = productos.filter((p) => {
    const q = filtro.trim().toLowerCase();
    if (!q) return true;
    return (
      p.modelo.toLowerCase().includes(q) ||
      p.codigo_barras.toLowerCase().includes(q)
    );
  });

  async function bajarDeCatalogo(producto: Producto) {
    if (!window.confirm(`¿Dar de baja "${producto.modelo}"? La baja es definitiva.`)) {
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

  async function eliminar(marca: Marca) {
    if (!window.confirm(`¿Eliminar la marca "${marca.nombre}"?`)) return;
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

  return (
    <div className={styles.layout}>
      {/* Sidebar Persistente */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>⚡</span>
          <div>
            <h1 className={styles.brandTitle}>Casa Baterías</h1>
            <p className={styles.brandSubtitle}>Control Central</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link href="/" className={styles.navItem}>
            <span className={styles.navIcon}>📊</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/catalogo" className={`${styles.navItem} ${styles.navItemActive}`}>
            <span className={styles.navIcon}>📦</span>
            <span>Catálogo</span>
          </Link>
          <Link href="/inventario" className={styles.navItem}>
            <span className={styles.navIcon}>🏭</span>
            <span>Inventario</span>
          </Link>
          <Link href="/reportes" className={styles.navItem}>
            <span className={styles.navIcon}>📋</span>
            <span>Reportes</span>
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutBtn} onClick={salir}>
            <span>🚪</span>
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
            <span className={styles.breadcrumbActive}>Catálogo de Productos</span>
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
                  + Nueva
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
                        >
                          Editar
                        </button>
                        <button
                          className={styles.actionBtnDanger}
                          onClick={() => void eliminar(marca)}
                          disabled={operando}
                        >
                          Eliminar
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
                  + Nuevo Producto
                </button>
              </div>

              <div className={styles.toolbar}>
                <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>🔍</span>
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
                            {producto.requiere_casco ? '⚡ Sí' : 'No'}
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
                                className={styles.actionBtn}
                                onClick={() => setModal({ tipo: 'precio', producto })}
                                disabled={operando || !producto.activo}
                              >
                                Precio
                              </button>
                              {producto.activo && (
                                <button
                                  className={styles.actionBtnDanger}
                                  onClick={() => void bajarDeCatalogo(producto)}
                                  disabled={operando}
                                >
                                  Baja
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
        <MarcaModal
          onCerrar={() => setModal(null)}
          onGuardada={async () => {
            setModal(null);
            await recargar();
          }}
        />
      )}
      {modal?.tipo === 'editarMarca' && (
        <MarcaModal
          marca={modal.marca}
          onCerrar={() => setModal(null)}
          onGuardada={async () => {
            setModal(null);
            await recargar();
          }}
        />
      )}
      {modal?.tipo === 'nuevoProducto' && (
        <ProductoModal
          marcas={marcas}
          sucursales={sucursales}
          onCerrar={() => setModal(null)}
          onGuardada={async () => {
            setModal(null);
            await recargar();
          }}
        />
      )}
      {modal?.tipo === 'precio' && (
        <PrecioModal
          producto={modal.producto}
          onCerrar={() => setModal(null)}
          onGuardada={async () => {
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
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MarcaModal({
  marca,
  onCerrar,
  onGuardada,
}: {
  marca?: Marca;
  onCerrar: () => void;
  onGuardada: () => void | Promise<void>;
}) {
  const [nombre, setNombre] = useState(marca?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(marca?.descripcion ?? '');
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
      const datos = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
      };
      if (marca) await actualizarMarca(marca.id, datos);
      else await crearMarca(datos);
      await onGuardada();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={marca ? 'Editar Marca' : 'Nueva Marca'} onCerrar={onCerrar}>
      <form className={styles.form} onSubmit={guardar}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nombre de la Marca</span>
          <input
            className={styles.input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. LTH, Óptima, América"
            autoFocus
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Descripción (opcional)</span>
          <input
            className={styles.input}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Línea premium, estándar, etc."
          />
        </label>
        {error && <p className={styles.errorBanner}>{error}</p>}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnPrimarySm} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar Marca'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProductoModal({
  marcas,
  sucursales,
  onCerrar,
  onGuardada,
}: {
  marcas: Marca[];
  sucursales: Sucursal[];
  onCerrar: () => void;
  onGuardada: () => void | Promise<void>;
}) {
  const [marcaId, setMarcaId] = useState(marcas[0]?.id ?? '');
  const [modelo, setModelo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [requiereCasco, setRequiereCasco] = useState(true);
  const [codigoFabrica, setCodigoFabrica] = useState('');
  const [sucursalId, setSucursalId] = useState(sucursales[0]?.id ?? '');
  const [cantidadInicial, setCantidadInicial] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const precioNum = Number(precio);
    if (!marcaId) {
      setError('Selecciona una marca.');
      return;
    }
    if (!modelo.trim()) {
      setError('El modelo del producto es obligatorio.');
      return;
    }
    if (Number.isNaN(precioNum) || precioNum < 0) {
      setError('Precio en MXN inválido.');
      return;
    }
    const cantidad =
      cantidadInicial.trim() === '' ? undefined : Number(cantidadInicial);
    if (cantidad !== undefined && (Number.isNaN(cantidad) || cantidad < 0)) {
      setError('Cantidad inicial inválida.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await crearProducto({
        marca_id: marcaId,
        modelo: modelo.trim(),
        descripcion: descripcion.trim() || undefined,
        precio: precioNum,
        requiere_casco: requiereCasco,
        codigo_barras_fabrica: codigoFabrica.trim() || undefined,
        sucursal_id: sucursalId,
        cantidad_inicial: cantidad,
      });
      await onGuardada();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Nuevo Producto en Catálogo" onCerrar={onCerrar}>
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
            <span className={styles.fieldLabel}>Sucursal de Entrada</span>
            <select
              className={styles.select}
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
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
          <span className={styles.fieldLabel}>Modelo del Producto</span>
          <input
            className={styles.input}
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder="Ej. L-42-400, AGM-34"
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Descripción Técnica (opcional)</span>
          <input
            className={styles.input}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="12V, 400 CCA, Terminal estándar"
          />
        </label>

        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Precio Autorizado (MXN)</span>
            <input
              className={styles.input}
              inputMode="decimal"
              placeholder="0.00"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Stock Inicial</span>
            <input
              className={styles.input}
              inputMode="numeric"
              placeholder="0"
              value={cantidadInicial}
              onChange={(e) => setCantidadInicial(e.target.value)}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Código de Fábrica (opcional)</span>
          <input
            className={styles.input}
            placeholder="Si se deja vacío, se generará código interno automáticamente"
            value={codigoFabrica}
            onChange={(e) => setCodigoFabrica(e.target.value)}
          />
        </label>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={requiereCasco}
            onChange={(e) => setRequiereCasco(e.target.checked)}
          />
          <span>Requiere intercambio de casco a cambio</span>
        </label>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnPrimarySm} disabled={guardando}>
            {guardando ? 'Creando…' : 'Crear Producto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PrecioModal({
  producto,
  onCerrar,
  onGuardada,
}: {
  producto: Producto;
  onCerrar: () => void;
  onGuardada: () => void | Promise<void>;
}) {
  const [precio, setPrecio] = useState(String(producto.precio));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const precioNum = Number(precio);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      setError('Ingresa un precio válido en MXN.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await actualizarPrecio(producto.id, precioNum);
      await onGuardada();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo={`Actualizar Precio — ${producto.modelo}`}
      onCerrar={onCerrar}
    >
      <form className={styles.form} onSubmit={guardar}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Precio vigente actual:{' '}
          <strong className="mono" style={{ color: 'var(--primary)', fontSize: '15px' }}>
            {formatearDinero(producto.precio)}
          </strong>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nuevo Precio Autorizado (MXN)</span>
          <input
            className={styles.input}
            inputMode="decimal"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
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
