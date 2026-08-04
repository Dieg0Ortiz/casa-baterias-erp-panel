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
      <div className={styles.page}>
        <div className={styles.cardCentrado}>
          <h1>Acceso restringido</h1>
          <p>
            Este panel es solo para administradores. Tu usuario tiene el rol{' '}
            <strong>trabajador</strong> y debe usar la app de ventas.
          </p>
          <button className={styles.boton} onClick={salir}>
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
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Catálogo</h1>
          <p>Marcas y productos — panel de administración</p>
        </div>
        <nav className={styles.headerNav}>
          <Link href="/" className={styles.backLink}>
            ← Panel
          </Link>
          <button className={styles.linkButton} onClick={salir}>
            Salir
          </button>
        </nav>
      </header>

      <main className={styles.main}>
        {error && (
          <div className={styles.error} role="alert">
            <span>{error}</span>
            <button className={styles.enlace} onClick={() => void recargar()}>
              Reintentar
            </button>
          </div>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Marcas</h2>
            <button
              className={styles.boton}
              onClick={() => setModal({ tipo: 'nuevaMarca' })}
              disabled={operando}
            >
              Nueva marca
            </button>
          </div>
          {cargando ? (
            <p className={styles.cargando}>Cargando…</p>
          ) : marcas.length === 0 ? (
            <p className={styles.vacio}>No hay marcas registradas.</p>
          ) : (
            <ul className={styles.lista}>
              {marcas.map((marca) => (
                <li key={marca.id} className={styles.filaMarca}>
                  <div>
                    <strong>{marca.nombre}</strong>
                    {marca.descripcion && <p>{marca.descripcion}</p>}
                  </div>
                  <div className={styles.acciones}>
                    <button
                      className={styles.enlace}
                      onClick={() => setModal({ tipo: 'editarMarca', marca })}
                      disabled={operando}
                    >
                      Editar
                    </button>
                    <button
                      className={`${styles.enlace} ${styles.enlacePeligro}`}
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

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Productos</h2>
            <button
              className={styles.boton}
              onClick={() => setModal({ tipo: 'nuevoProducto' })}
              disabled={operando || marcas.length === 0}
            >
              Nuevo producto
            </button>
          </div>
          <input
            className={styles.busqueda}
            placeholder="Buscar por modelo o código de barras"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          {cargando ? (
            <p className={styles.cargando}>Cargando…</p>
          ) : (
            <div className={styles.tablaScroll}>
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Modelo</th>
                    <th>Marca</th>
                    <th>Código</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Casco</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.length === 0 && (
                    <tr>
                      <td colSpan={8} className={styles.vacio}>
                        No hay productos.
                      </td>
                    </tr>
                  )}
                  {visibles.map((producto) => (
                    <tr
                      key={producto.id}
                      className={producto.activo ? undefined : styles.inactivo}
                    >
                      <td>{producto.modelo}</td>
                      <td>{producto.marcas?.nombre ?? '—'}</td>
                      <td className={styles.mono}>{producto.codigo_barras}</td>
                      <td>{formatearDinero(producto.precio)}</td>
                      <td>{stockTotal(producto)}</td>
                      <td>{producto.requiere_casco ? 'Sí' : 'No'}</td>
                      <td>{producto.activo ? 'Activo' : 'Dado de baja'}</td>
                      <td>
                        <div className={styles.acciones}>
                          <button
                            className={styles.enlace}
                            onClick={() =>
                              setModal({ tipo: 'precio', producto })
                            }
                            disabled={operando || !producto.activo}
                          >
                            Cambiar precio
                          </button>
                          {producto.activo && (
                            <button
                              className={`${styles.enlace} ${styles.enlacePeligro}`}
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
            </div>
          )}
        </section>
      </main>

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
          <button
            className={styles.iconButton}
            onClick={onCerrar}
            aria-label="Cerrar"
          >
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
      setError('El nombre es obligatorio.');
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
    <Modal titulo={marca ? 'Editar marca' : 'Nueva marca'} onCerrar={onCerrar}>
      <form className={styles.form} onSubmit={guardar}>
        <label className={styles.campo}>
          <span>Nombre</span>
          <input
            className={styles.input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
        </label>
        <label className={styles.campo}>
          <span>Descripción (opcional)</span>
          <input
            className={styles.input}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>
        {error && <p className={styles.errorForm}>{error}</p>}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.botonSecundario}
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button type="submit" className={styles.boton} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
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
      setError('El modelo es obligatorio.');
      return;
    }
    if (Number.isNaN(precioNum) || precioNum < 0) {
      setError('Precio inválido.');
      return;
    }
    const cantidad =
      cantidadInicial.trim() === '' ? undefined : Number(cantidadInicial);
    if (cantidad !== undefined && (Number.isNaN(cantidad) || cantidad < 0)) {
      setError('Cantidad inválida.');
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
    <Modal titulo="Nuevo producto" onCerrar={onCerrar}>
      <form className={styles.form} onSubmit={guardar}>
        <div className={styles.fila}>
          <label className={styles.campo}>
            <span>Marca</span>
            <select
              className={styles.input}
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
          <label className={styles.campo}>
            <span>Sucursal</span>
            <select
              className={styles.input}
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
        <label className={styles.campo}>
          <span>Modelo</span>
          <input
            className={styles.input}
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            autoFocus
          />
        </label>
        <label className={styles.campo}>
          <span>Descripción (opcional)</span>
          <input
            className={styles.input}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>
        <div className={styles.fila}>
          <label className={styles.campo}>
            <span>Precio (MXN)</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </label>
          <label className={styles.campo}>
            <span>Cantidad inicial</span>
            <input
              className={styles.input}
              inputMode="numeric"
              placeholder="0"
              value={cantidadInicial}
              onChange={(e) => setCantidadInicial(e.target.value)}
            />
          </label>
        </div>
        <label className={styles.campo}>
          <span>Código de fábrica (opcional)</span>
          <input
            className={styles.input}
            placeholder="Si se deja vacío, se genera automáticamente"
            value={codigoFabrica}
            onChange={(e) => setCodigoFabrica(e.target.value)}
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={requiereCasco}
            onChange={(e) => setRequiereCasco(e.target.checked)}
          />
          <span>Requiere casco</span>
        </label>
        {error && <p className={styles.errorForm}>{error}</p>}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.botonSecundario}
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button type="submit" className={styles.boton} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Crear producto'}
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
      setError('Precio inválido.');
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
      titulo={`Cambiar precio — ${producto.modelo}`}
      onCerrar={onCerrar}
    >
      <form className={styles.form} onSubmit={guardar}>
        <p className={styles.actual}>
          Precio actual:{' '}
          <strong>{formatearDinero(producto.precio)}</strong>
        </p>
        <label className={styles.campo}>
          <span>Nuevo precio (MXN)</span>
          <input
            className={styles.input}
            inputMode="decimal"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            autoFocus
          />
        </label>
        {error && <p className={styles.errorForm}>{error}</p>}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.botonSecundario}
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button type="submit" className={styles.boton} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
