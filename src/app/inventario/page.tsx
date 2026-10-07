/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '@/lib/api';
import { logout, useSesion } from '@/lib/auth';
import { type Producto, formatearDinero, listarProductos, listarSucursales } from '@/lib/catalogo';
import {
  type CargaMasivaResultado,
  type ItemInventario,
  type Transferencia,
  cargarExistenciasMasivo,
  eliminarExistencias,
  listarInventario,
  listarTransferencias,
  reabastecerInventario,
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
  IconAdd,
  IconDelete,
  IconCasco,
  IconUsers,
  IconMenu,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
} from '@/components/Icons';
import { Sidebar } from '@/components/Sidebar';
import styles from './inventario.module.css';

interface AjustarState {
  productoId: string;
  sucursalId: string;
  modelo: string;
  cantidadActual: number;
}

interface RenglonCarga {
  linea: string;
  referencia: string;
  cantidad: number;
  matches: Producto[];
}

function claveProducto(texto: string): string {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function etiquetaProducto(producto: Producto): string {
  return `${producto.marcas?.nombre ?? ''} ${producto.modelo}`.trim();
}

function coincidenciasCarga(ref: string, catalogo: Producto[]): Producto[] {
  const cruda = ref.trim();
  const norm = claveProducto(cruda);
  if (!norm) return [];
  const exactos = catalogo.filter((p) => {
    if (p.activo === false) return false;
    if (p.codigo_barras === cruda) return true;
    if (claveProducto(`${p.marcas?.nombre ?? ''}${p.modelo}`) === norm) return true;
    if (claveProducto(p.modelo) === norm) return true;
    return false;
  });
  if (exactos.length > 0) return exactos;

  const marcas = new Map<string, string>();
  for (const p of catalogo) {
    const nombre = p.marcas?.nombre ?? '';
    const n = claveProducto(nombre);
    if (n) marcas.set(n, nombre);
  }
  const marca = [...marcas.entries()]
    .filter(([n]) => norm.startsWith(n))
    .sort((a, b) => b[0].length - a[0].length)[0];
  if (!marca) return [];
  const resto = norm.slice(marca[0].length);
  if (!resto) return [];
  return catalogo.filter((p) => {
    if (p.activo === false) return false;
    if (claveProducto(p.marcas?.nombre ?? '') !== marca[0]) return false;
    return claveProducto(p.modelo).startsWith(resto);
  });
}

function partirRenglon(linea: string, catalogo: Producto[]): RenglonCarga {
  const cruda = linea.trim();
  const directos = coincidenciasCarga(cruda, catalogo);
  if (directos.length === 1) {
    return { linea: cruda, referencia: cruda, cantidad: 1, matches: directos };
  }
  const conCantidad = cruda.match(/^(.*\S)\s+(\d+)$/);
  if (conCantidad) {
    const resto = conCantidad[1];
    const cantidad = Number(conCantidad[2]);
    const matches = coincidenciasCarga(resto, catalogo);
    if (matches.length > 0) {
      return { linea: cruda, referencia: resto, cantidad, matches };
    }
  }
  return { linea: cruda, referencia: cruda, cantidad: 1, matches: directos };
}

function parsearRenglones(texto: string, catalogo: Producto[]): RenglonCarga[] {
  const renglones: RenglonCarga[] = [];
  for (const cruda of texto.split(/\r?\n/)) {
    const linea = cruda.trim();
    if (!linea) continue;
    renglones.push(partirRenglon(linea, catalogo));
  }
  return renglones;
}

function coincideProducto(producto: Producto, consulta: string): boolean {
  const tokens = consulta.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const texto =
    `${producto.modelo} ${producto.marcas?.nombre ?? ''} ${producto.codigo_barras}`.toLowerCase();
  return tokens.every((t) => texto.includes(t));
}

function mensajeError(e: unknown): string {
  return e instanceof ApiError
    ? e.message
    : 'Ocurrió un error. Intenta de nuevo.';
}

function generarBotonesPaginacion(paginaActual: number, totalPaginas: number): (number | string)[] {
  if (totalPaginas <= 5) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }

  // Si estamos en la página 1 o 2
  if (paginaActual <= 2) {
    const inicio = [1, 2];
    if (paginaActual === 2 && totalPaginas > 2) inicio.push(3);
    const fin = [totalPaginas - 1, totalPaginas];
    return [...inicio, 'dots-end', ...fin];
  }

  // Si estamos cerca del final (últimas 2 páginas)
  if (paginaActual >= totalPaginas - 1) {
    return [totalPaginas - 2, totalPaginas - 1, totalPaginas];
  }

  // Si estamos en cualquier otra pestaña (ej. 5, 11, etc.),
  // reemplazamos 1 y 2 por la pestaña actual y sus adyacentes:
  const centro = [paginaActual - 1, paginaActual, paginaActual + 1];
  
  if (paginaActual + 1 < totalPaginas - 2) {
    return [...centro, 'dots-end', totalPaginas - 1, totalPaginas];
  } else if (paginaActual + 1 === totalPaginas - 2) {
    return [...centro, totalPaginas - 1, totalPaginas];
  } else {
    return [paginaActual - 1, paginaActual, totalPaginas - 1, totalPaginas];
  }
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
  const [modalCargaMasiva, setModalCargaMasiva] = useState(false);
  const [modalAjustar, setModalAjustar] = useState<AjustarState | null>(null);
  const [operando, setOperando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [pagina, setPagina] = useState(1);
  const ITEMS_POR_PAGINA = 10;

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

  const itemsVisibles = items.filter(i => {
    if (!filtro.trim()) return true;
    const f = filtro.toLowerCase();
    return (
      (i.modelo ?? '').toLowerCase().includes(f) ||
      (i.codigo_barras ?? '').toLowerCase().includes(f) ||
      (i.marca ?? '').toLowerCase().includes(f)
    );
  });

  const totalPaginas = Math.ceil(itemsVisibles.length / ITEMS_POR_PAGINA) || 1;
  const indiceInicio = (pagina - 1) * ITEMS_POR_PAGINA;
  const itemsPaginados = itemsVisibles.slice(indiceInicio, indiceInicio + ITEMS_POR_PAGINA);

  useEffect(() => {
    setPagina(1);
  }, [filtro, sucursalId]);

  return (
    <div className={styles.layout}>
      <Sidebar active="inventario" menuAbierto={menuAbierto} onCerrarMenu={() => setMenuAbierto(false)} />

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
                <span>Entrada de Inventario</span>
              </button>

              <button
                className={styles.btnSecondary}
                onClick={() => setModalCargaMasiva(true)}
                disabled={cargando}
                title="Cargar las existencias de toda una sucursal de una sola vez"
              >
                Carga Masiva
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
            
            <div className={styles.toolbar}>
              <span style={{ display: 'flex', color: 'var(--text-muted)' }}><IconSearch /></span>
              <input
                className={styles.searchInput}
                placeholder="Buscar batería, marca o código..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>

            <div className={styles.tableScroll}>
              {cargando ? (
                <div className={styles.loadingText}>Cargando existencias…</div>
              ) : itemsVisibles.length === 0 ? (
                <div className={styles.emptyText}>No hay existencias que coincidan con la búsqueda.</div>
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
                    {itemsPaginados.map((item) => (
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

            {/* Barra de Paginación Inteligente */}
            {itemsVisibles.length > 0 && (
              <div className={styles.paginationBar}>
                <div className={styles.paginationInfo}>
                  Mostrando {indiceInicio + 1} - {Math.min(indiceInicio + ITEMS_POR_PAGINA, itemsVisibles.length)} de {itemsVisibles.length} productos
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  {/* Selector rápido 'Ir a pestaña/página' */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pestaña:</span>
                    <select
                      className={styles.select}
                      style={{ padding: '4px 8px', fontSize: '12px', minWidth: '85px', width: 'auto', height: '32px' }}
                      value={pagina}
                      onChange={(e) => setPagina(Number(e.target.value))}
                    >
                      {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          Pág. {num}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Botones de navegación numerados */}
                  <div className={styles.paginationControls}>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => setPagina(p => Math.max(1, p - 1))}
                      disabled={pagina === 1}
                      title="Página anterior"
                    >
                      <IconChevronLeft />
                    </button>

                    {generarBotonesPaginacion(pagina, totalPaginas).map((item) => {
                      if (typeof item === 'string') {
                        return (
                          <span key={item} className={styles.pageDots}>
                            …
                          </span>
                        );
                      }
                      return (
                        <button
                          key={item}
                          type="button"
                          className={`${styles.pageBtn} ${pagina === item ? styles.pageBtnActive : ''}`}
                          onClick={() => setPagina(item)}
                          title={`Ir a pestaña ${item}`}
                        >
                          {item}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                      disabled={pagina === totalPaginas}
                      title="Página siguiente"
                    >
                      <IconChevronRight />
                    </button>
                  </div>
                </div>
              </div>
            )}
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
            await cargar(sucursalId);
          }}
        />
      )}

      {/* Modal de Carga Masiva de Existencias */}
      {modalCargaMasiva && (
        <CargaMasivaModal
          sucursales={sucursales}
          sucursalActualId={sucursalId}
          catalogo={catalogo}
          onCerrar={() => setModalCargaMasiva(false)}
          onGuardado={async () => {
            setModalCargaMasiva(false);
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
        ...(modo === 'restar' ? { cantidad: cantNum } : {}),
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

function CargaMasivaModal({
  sucursales,
  sucursalActualId,
  catalogo,
  onCerrar,
  onGuardado,
}: {
  sucursales: { id: string; nombre: string; es_matriz?: boolean }[];
  sucursalActualId: string;
  catalogo: Producto[];
  onCerrar: () => void;
  onGuardado: () => void | Promise<void>;
}) {
  const [sucursalId, setSucursalId] = useState(
    sucursalActualId || sucursales[0]?.id || '',
  );
  const [modo, setModo] = useState<'sumar' | 'reemplazar'>('sumar');
  const [nota, setNota] = useState('');
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<CargaMasivaResultado | null>(null);

  const renglones = parsearRenglones(texto, catalogo);
  const listos = renglones.filter((r) => r.matches.length === 1);
  const ambiguos = renglones.filter((r) => r.matches.length > 1);
  const sinMatch = renglones.filter((r) => r.matches.length === 0);
  const unidades = listos.reduce((suma, r) => suma + r.cantidad, 0);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!sucursalId) {
      setError('Selecciona la sucursal.');
      return;
    }
    if (renglones.length === 0) {
      setError('Pega al menos un renglón con la marca y el modelo.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const res = await cargarExistenciasMasivo({
        sucursal_id: sucursalId,
        modo,
        nota: nota.trim() || undefined,
        items: renglones.map((r) => ({
          codigo_barras: r.linea,
          cantidad: 1,
        })),
      });
      setResultado(res);
      setGuardando(false);
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  const nombreSucursal = sucursales.find((s) => s.id === sucursalId)?.nombre ?? '';
  const ambiguosRes = resultado?.ambiguos ?? [];

  if (resultado) {
    return (
      <Modal titulo="Carga Masiva de Existencias" onCerrar={() => void onGuardado()}>
        <div className={styles.form}>
          <p style={{ fontSize: '14px', margin: 0 }}>
            Se {resultado.modo === 'sumar' ? 'sumaron' : 'fijaron'}{' '}
            <strong className="mono" style={{ color: 'var(--primary)' }}>
              {resultado.unidades}
            </strong>{' '}
            unidades en{' '}
            <strong className="mono" style={{ color: 'var(--primary)' }}>
              {resultado.aplicados}
            </strong>{' '}
            productos de {nombreSucursal}.
          </p>
          {resultado.folio && (
            <p style={{ fontSize: '13px', margin: 0 }}>
              Acuse <strong className="mono">{resultado.folio}</strong>
              {resultado.nota ? (
                <>
                  {' '}
                  · Factura/nota <strong className="mono">{resultado.nota}</strong>
                </>
              ) : null}
              . Queda en Reportes → Altas de inventario para descargarlo.
            </p>
          )}

          {ambiguosRes.length > 0 && (
            <div>
              <p style={{ fontSize: '13px', margin: '0 0 6px' }}>
                Estos nombres coinciden con más de un producto. Escribe también la
                marca (por ejemplo GONHER 47):
              </p>
              <p
                className="mono"
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  maxHeight: '160px',
                  overflowY: 'auto',
                }}
              >
                {ambiguosRes.map((fila) => (
                  <span key={fila.referencia} style={{ display: 'block' }}>
                    {fila.referencia}: {fila.opciones.join(', ')}
                  </span>
                ))}
              </p>
            </div>
          )}

          {resultado.no_encontrados.length > 0 && (
            <div>
              <p style={{ fontSize: '13px', margin: '0 0 6px' }}>
                Estos renglones no se relacionaron con el catálogo y quedaron sin
                aplicar:
              </p>
              <p
                className="mono"
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  maxHeight: '160px',
                  overflowY: 'auto',
                }}
              >
                {resultado.no_encontrados.join(', ')}
              </p>
            </div>
          )}

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => void onGuardado()}
            >
              Listo
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal titulo="Carga Masiva de Existencias" onCerrar={onCerrar}>
      <form className={styles.form} onSubmit={guardar}>
        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Sucursal</span>
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
            <span className={styles.fieldLabel}>Qué hacer con lo que ya hay</span>
            <select
              className={styles.input}
              value={modo}
              onChange={(e) => setModo(e.target.value as 'sumar' | 'reemplazar')}
            >
              <option value="sumar">Sumar (entrada de mercancía)</option>
              <option value="reemplazar">Reemplazar (conteo físico)</option>
            </select>
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Folio de factura o nota (una vez para todas las pilas)</span>
          <input
            className={styles.input}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej. FAC-4928 o Nota 15"
            maxLength={80}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Marca y modelo, uno por línea. La cantidad al final es opcional
          </span>
          <textarea
            className={styles.input}
            rows={10}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={'GONHER 47 6\nGONHER 35\nLTH 22 F 4\nGONHER22F'}
            autoFocus
            style={{ fontFamily: 'monospace', resize: 'vertical' }}
          />
        </label>

        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '-4px 0 4px' }}>
          Relaciona cada renglón con una batería del catálogo. Sirve{' '}
          <strong>GONHER 47</strong>, <strong>GONHER47</strong> o el código de barras.
          Si omites la cantidad se cuenta 1.{' '}
          <strong className="mono" style={{ color: 'var(--primary)' }}>
            {listos.length}
          </strong>{' '}
          listos,{' '}
          <strong className="mono" style={{ color: 'var(--primary)' }}>
            {unidades}
          </strong>{' '}
          unidades.
          {ambiguos.length > 0 && (
            <>
              {' '}
              {ambiguos.length} con más de una coincidencia: escribe la marca.
            </>
          )}
          {sinMatch.length > 0 && (
            <>
              {' '}
              {sinMatch.length} sin relacionar.
            </>
          )}
        </p>

        {renglones.length > 0 && (
          <div
            className="mono"
            style={{
              fontSize: '12px',
              maxHeight: '140px',
              overflowY: 'auto',
              color: 'var(--text-secondary)',
            }}
          >
            {renglones.slice(0, 12).map((r, i) => (
              <div key={`${i}-${r.linea}`}>
                {r.matches.length === 1
                  ? `${r.linea} → ${etiquetaProducto(r.matches[0])} ×${r.cantidad}`
                  : r.matches.length > 1
                    ? `${r.linea} → ${r.matches.length} coincidencias (${r.matches
                        .slice(0, 4)
                        .map(etiquetaProducto)
                        .join(', ')})`
                    : `${r.linea} → no está en el catálogo`}
              </div>
            ))}
            {renglones.length > 12 && (
              <div>… y {renglones.length - 12} renglones más</div>
            )}
          </div>
        )}

        {error && <p className={styles.errorBanner}>{error}</p>}

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={guardando || renglones.length === 0}
          >
            {guardando ? 'Cargando…' : `Cargar ${listos.length} productos`}
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
  const [productoId, setProductoId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [nota, setNota] = useState('');
  const [lista, setLista] = useState<{ producto: Producto; cantidad: number }[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const coincidencias = catalogo.filter((p) => coincideProducto(p, busqueda));
  const productoSeleccionado = catalogo.find((p) => p.id === productoId);
  const stockEnSucursal = (productoSeleccionado?.inventario ?? []).find(
    (inv) => inv.sucursal_id === sucursalId,
  )?.cantidad ?? 0;
  const cantPendiente = (() => {
    const n = Number(cantidad);
    if (Number.isNaN(n) || n <= 0) return 0;
    return Math.floor(n);
  })();
  const lineasListas = (() => {
    const lineas = lista.map((r) => ({ producto: r.producto, cantidad: r.cantidad }));
    if (productoSeleccionado && cantPendiente > 0) {
      const i = lineas.findIndex((r) => r.producto.id === productoSeleccionado.id);
      if (i >= 0) {
        lineas[i] = { ...lineas[i], cantidad: lineas[i].cantidad + cantPendiente };
      } else {
        lineas.push({ producto: productoSeleccionado, cantidad: cantPendiente });
      }
    }
    return lineas;
  })();
  const unidades = lineasListas.reduce((suma, r) => suma + r.cantidad, 0);

  function meterEnLista(producto: Producto, cantNum: number) {
    setLista((prev) => {
      const i = prev.findIndex((r) => r.producto.id === producto.id);
      if (i >= 0) {
        return prev.map((r, idx) =>
          idx === i ? { ...r, cantidad: r.cantidad + cantNum } : r,
        );
      }
      return [...prev, { producto, cantidad: cantNum }];
    });
    setProductoId('');
    setBusqueda('');
    setCantidad('1');
    setError(null);
    setAviso(null);
  }

  function elegirProducto(id: string) {
    const elegido = catalogo.find((p) => p.id === id);
    if (!elegido) return;
    if (cantPendiente <= 0) {
      setProductoId(id);
      setBusqueda(`${elegido.marcas?.nombre ?? ''} ${elegido.modelo}`.trim());
      setError('Ingresa una cantidad válida mayor a cero.');
      return;
    }
    meterEnLista(elegido, cantPendiente);
  }

  function cambiarBusqueda(valor: string) {
    setBusqueda(valor);
    const matches = catalogo.filter((p) => coincideProducto(p, valor));
    if (matches.length === 1) {
      setProductoId(matches[0].id);
      setError(null);
    } else if (productoId && !matches.some((p) => p.id === productoId)) {
      setProductoId('');
    }
  }

  function agregarPila() {
    if (!productoSeleccionado) {
      setError('Elige la pila en las coincidencias. Con una sola, Dar de alta ya la toma.');
      return;
    }
    if (cantPendiente <= 0) {
      setError('Ingresa una cantidad válida mayor a cero.');
      return;
    }
    meterEnLista(productoSeleccionado, cantPendiente);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!sucursalId) {
      setError('Selecciona la sucursal de destino.');
      return;
    }
    if (lineasListas.length === 0) {
      setError('Elige la pila y la cantidad, o agrégala a la lista.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const res = await reabastecerInventario({
        sucursal_id: sucursalId,
        nota: nota.trim() || undefined,
        items: lineasListas.map((r) => ({
          producto_id: r.producto.id,
          cantidad: r.cantidad,
        })),
      });
      const factura = nota.trim();
      setAviso(
        `Se dieron de alta ${res.unidades} unidades en ${res.aplicados} pilas` +
          (factura ? ` con factura/nota ${factura}` : '') +
          (res.folio ? ` (acuse ${res.folio})` : '') +
          '. El folio sigue para la siguiente pila.',
      );
      setLista([]);
      setProductoId('');
      setBusqueda('');
      setCantidad('1');
      await onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
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
            <span className={styles.fieldLabel}>Folio de factura o nota</span>
            <input
              className={styles.input}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej. FAC-4928 o Nota 15"
              maxLength={80}
            />
          </label>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '-8px 0 4px' }}>
          Lo escribes una vez y queda en todas las pilas de esta alta.
        </p>

        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Buscar pila (marca y modelo)</span>
            <input
              className={styles.input}
              value={busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
              placeholder="Ej. GONHER 47"
              autoFocus
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Cantidad</span>
            <input
              className={styles.input}
              inputMode="numeric"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="10"
            />
          </label>
        </div>

        {busqueda.trim() && coincidencias.length === 0 && (
          <p style={{ fontSize: '12px', color: 'var(--error)', margin: '-4px 0 4px' }}>
            No hay ninguna pila que coincida con “{busqueda.trim()}”.
          </p>
        )}

        {busqueda.trim() && coincidencias.length > 0 && (
          <ul className={styles.resultadosBusqueda}>
            {coincidencias.slice(0, 8).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={productoId === p.id ? styles.resultadoActivo : undefined}
                  onClick={() => elegirProducto(p.id)}
                >
                  <span>
                    {p.marcas?.nombre ?? 'Sin Marca'} {p.modelo}
                  </span>
                  <span className="mono">{formatearDinero(p.precio)}</span>
                </button>
              </li>
            ))}
            {coincidencias.length > 8 && (
              <li className={styles.resultadoMas}>
                +{coincidencias.length - 8} más. Sigue escribiendo para acotar.
              </li>
            )}
          </ul>
        )}
        {busqueda.trim() && coincidencias.length > 1 && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '-4px 0 4px' }}>
            Toca la pila que vas a dar de alta. Queda en la lista con la cantidad de arriba.
          </p>
        )}

        {productoSeleccionado && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '-4px 0 4px' }}>
            Existencia actual en esta tienda:{' '}
            <strong className="mono" style={{ color: 'var(--primary)' }}>
              {stockEnSucursal} unidades
            </strong>
          </p>
        )}

        <button
          type="button"
          className={styles.btnSecondary}
          onClick={agregarPila}
          disabled={!productoSeleccionado || cantPendiente <= 0}
        >
          Agregar otra pila al mismo folio
        </button>

        {lista.length > 0 && (
          <ul
            className="mono"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              fontSize: '13px',
              maxHeight: '160px',
              overflowY: 'auto',
            }}
          >
            {lista.map((r) => (
              <li
                key={r.producto.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '4px 0',
                  borderBottom: '1px dashed var(--outline-variant)',
                }}
              >
                <span>
                  {etiquetaProducto(r.producto)} ×{r.cantidad}
                </span>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  style={{ padding: '2px 8px', fontSize: '12px' }}
                  onClick={() =>
                    setLista((prev) => prev.filter((x) => x.producto.id !== r.producto.id))
                  }
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        {aviso && (
          <p style={{ fontSize: '13px', color: 'var(--success)', margin: 0 }}>{aviso}</p>
        )}
        {error && <p className={styles.errorBanner}>{error}</p>}

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
            {lineasListas.length === 0 && aviso ? 'Cerrar' : 'Cancelar'}
          </button>
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={guardando || lineasListas.length === 0}
          >
            {guardando
              ? 'Ingresando…'
              : `Dar de alta ${lineasListas.length} pila${lineasListas.length === 1 ? '' : 's'} (${unidades})`}
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
