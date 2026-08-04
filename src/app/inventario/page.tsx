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
    sucursales.find((s) => s.id === sucursalId)?.nombre ?? 'Todas';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Inventario</h1>
          <p>Existencias, cascos disponibles y transferencias</p>
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
            <button
              className={styles.boton}
              onClick={() => void cargar(sucursalId)}
            >
              Reintentar
            </button>
          </div>
        )}

        <section className={styles.section}>
          <div className={styles.filtros}>
            <label className={styles.campo}>
              <span>Sucursal</span>
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
            </label>
            <button
              className={styles.boton}
              onClick={() => void cargar(sucursalId)}
              disabled={cargando}
            >
              Actualizar
            </button>
            <button
              className={styles.boton}
              onClick={() => setModal(true)}
              disabled={cargando || sucursales.length < 2}
              title={
                sucursales.length < 2
                  ? 'Se necesitan al menos dos sucursales'
                  : undefined
              }
            >
              Nueva transferencia
            </button>
          </div>

          <div className={styles.resumen}>
            <div className={styles.tarjeta}>
              <div className={styles.valor}>{totalUnidades}</div>
              <div className={styles.etiqueta}>
                Unidades en {nombreSucursal.toLowerCase()}
              </div>
            </div>
            <div className={styles.tarjeta}>
              <div className={styles.valor}>{totalCascos}</div>
              <div className={styles.etiqueta}>
                Cascos disponibles ({nombreSucursal.toLowerCase()})
              </div>
            </div>
          </div>

          {cargando ? (
            <p className={styles.cargando}>Cargando…</p>
          ) : items.length === 0 ? (
            <p className={styles.vacio}>
              No hay existencias registradas para esta sucursal.
            </p>
          ) : (
            <div className={styles.tablaScroll}>
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Modelo</th>
                    <th>Marca</th>
                    <th>Código</th>
                    <th>Precio</th>
                    <th>Requiere casco</th>
                    <th>Cantidad</th>
                    <th>Cascos disponibles</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={`${item.sucursal_id}-${item.producto_id}`}>
                      <td>{item.modelo ?? '—'}</td>
                      <td>{item.marca ?? '—'}</td>
                      <td className={styles.mono}>
                        {item.codigo_barras ?? '—'}
                      </td>
                      <td>{formatearDinero(item.precio)}</td>
                      <td>{item.requiere_casco ? 'Sí' : 'No'}</td>
                      <td>{item.cantidad}</td>
                      <td>{item.cascos_disponibles}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Historial de transferencias</h2>
          </div>
          {cargando ? (
            <p className={styles.cargando}>Cargando…</p>
          ) : transferencias.length === 0 ? (
            <p className={styles.vacio}>Aún no hay transferencias.</p>
          ) : (
            <div className={styles.tablaScroll}>
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Cantidad</th>
                    <th>Autorizado por</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {transferencias.map((t) => (
                    <tr key={t.id}>
                      <td>{new Date(t.created_at).toLocaleString('es-MX')}</td>
                      <td>{t.producto ?? '—'}</td>
                      <td>{t.sucursal_origen ?? '—'}</td>
                      <td>{t.sucursal_destino ?? '—'}</td>
                      <td>{t.cantidad}</td>
                      <td>{t.autorizado_por ?? '—'}</td>
                      <td>{t.nota ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

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
      setError('El origen y el destino deben ser distintos.');
      return;
    }
    if (!productoId) {
      setError('Selecciona un producto.');
      return;
    }
    const cant = Number(cantidad);
    if (Number.isNaN(cant) || cant < 1) {
      setError('Cantidad inválida.');
      return;
    }
    if (producto && cant > producto.cantidad) {
      setError(`Solo hay ${producto.cantidad} disponibles en el origen.`);
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
    <Modal titulo="Nueva transferencia" onCerrar={onCerrar}>
      <form className={styles.form} onSubmit={guardar}>
        <div className={styles.fila}>
          <label className={styles.campo}>
            <span>Sucursal de origen</span>
            <select
              className={styles.select}
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
          <label className={styles.campo}>
            <span>Sucursal de destino</span>
            <select
              className={styles.select}
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
        <label className={styles.campo}>
          <span>Producto</span>
          <select
            className={styles.select}
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
          >
            {inventario.length === 0 && (
              <option value="">Sin existencias en el origen</option>
            )}
            {inventario.map((i) => (
              <option key={i.producto_id} value={i.producto_id ?? ''}>
                {i.modelo} ({i.cantidad} disponibles)
              </option>
            ))}
          </select>
        </label>
        <div className={styles.fila}>
          <label className={styles.campo}>
            <span>Cantidad</span>
            <input
              className={styles.input}
              inputMode="numeric"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              autoFocus
            />
          </label>
          <label className={styles.campo}>
            <span>Nota (opcional)</span>
            <input
              className={styles.input}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </label>
        </div>
        {error && <p className={styles.errorForm}>{error}</p>}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.botonSecundario}
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.boton}
            disabled={guardando}
          >
            {guardando ? 'Transfiriendo…' : 'Transferir'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
