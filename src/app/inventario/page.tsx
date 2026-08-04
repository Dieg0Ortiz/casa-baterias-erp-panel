'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { logout, useSesion } from '@/lib/auth';
import { formatearDinero, listarSucursales } from '@/lib/catalogo';
import { type ItemInventario, listarInventario } from '@/lib/inventario';
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
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const datos = await listarInventario(id || undefined);
      setItems(datos);
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
          <p>Existencias y cascos disponibles por sucursal</p>
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
            <button className={styles.boton} onClick={() => void cargar(sucursalId)}>
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
                      <td className={styles.mono}>{item.codigo_barras ?? '—'}</td>
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
      </main>
    </div>
  );
}
