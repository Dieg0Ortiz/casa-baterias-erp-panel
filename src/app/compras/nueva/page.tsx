'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useSesion, logout } from '@/lib/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CompraItemInput, Proveedor, listarProveedores, registrarCompra } from '@/lib/purchases';
import { Producto, Sucursal, formatearDinero, listarProductos, listarSucursales } from '@/lib/catalogo';
import { ApiError } from '@/lib/api';
import {
  IconBolt,
  IconDashboard,
  IconCatalog,
  IconInventory,
  IconReports,
  IconLogout,
  IconMenu,
  IconCasco,
  IconUsers,
  IconAdd,
  IconDelete,
  IconSearch,
  IconClose,
} from '@/components/Icons';
import styles from '../compras.module.css';

interface ItemCarrito {
  id_carrito: string;
  tipo_item: 'bateria' | 'casco';
  producto_id: string;
  descripcion: string;
  marca?: string;
  codigo?: string;
  cantidad: number;
  precio_unitario: number;
}

export default function NuevaCompraPage() {
  const router = useRouter();
  const { autenticado, perfil } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [sucursalId, setSucursalId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

  const [tipoAgregando, setTipoAgregando] = useState<'bateria' | 'casco'>('bateria');
  const [productoSelec, setProductoSelec] = useState<Producto | null>(null);
  const [filtroBaterias, setFiltroBaterias] = useState('');
  const [cantSelec, setCantSelec] = useState('1');
  const [costoSelec, setCostoSelec] = useState('');

  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!autenticado) router.replace('/login');
  }, [autenticado, router]);

  useEffect(() => {
    async function load() {
      if (!autenticado || perfil?.rol !== 'administrador') return;
      setCargando(true);
      setError(null);
      try {
        const [suc, prod] = await Promise.all([
          listarSucursales(),
          listarProductos(),
        ]);
        setSucursales(suc ?? []);
        const prodsActivos = (prod ?? []).filter((p) => p.activo);
        setProductos(prodsActivos);

        if (suc && suc.length > 0) setSucursalId(suc[0].id);
        if (prodsActivos.length > 0) {
          setProductoSelec(prodsActivos[0]);
          setCostoSelec(prodsActivos[0].precio_compra != null ? String(prodsActivos[0].precio_compra) : '');
        }

        // Cargar proveedores de forma tolerante (por si la API aún se está desplegando)
        try {
          const prov = await listarProveedores();
          setProveedores(prov ?? []);
        } catch {
          // Proveedores es opcional, no bloqueamos la pantalla
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Error al cargar catálogo y sucursales');
      } finally {
        setCargando(false);
      }
    }
    void load();
  }, [autenticado, perfil]);

  function salir() {
    logout();
    router.replace('/login');
    router.refresh();
  }

  function seleccionarProducto(p: Producto) {
    setProductoSelec(p);
    setCostoSelec(p.precio_compra != null && p.precio_compra > 0 ? String(p.precio_compra) : '');
  }

  function agregarAlCarrito(e: FormEvent) {
    e.preventDefault();

    const cantidad = Number(cantSelec);
    if (isNaN(cantidad) || cantidad <= 0) {
      alert('Ingresa una cantidad válida mayor a 0');
      return;
    }

    const costo = Number(costoSelec);
    if (isNaN(costo) || costo < 0 || costoSelec.trim() === '') {
      alert('Ingresa un costo unitario válido (ej. 1200.00)');
      return;
    }

    if (tipoAgregando === 'bateria') {
      if (!productoSelec) {
        alert('Selecciona una batería del listado');
        return;
      }

      setCarrito([
        ...carrito,
        {
          id_carrito: Math.random().toString(36).substring(7),
          tipo_item: 'bateria',
          producto_id: productoSelec.id,
          descripcion: productoSelec.modelo,
          marca: productoSelec.marcas?.nombre,
          codigo: productoSelec.codigo_barras,
          cantidad,
          precio_unitario: costo,
        },
      ]);
    } else {
      setCarrito([
        ...carrito,
        {
          id_carrito: Math.random().toString(36).substring(7),
          tipo_item: 'casco',
          producto_id: 'casco-lote',
          descripcion: 'Lote de Cascos / Baterías Viejas',
          cantidad,
          precio_unitario: costo,
        },
      ]);
    }

    setCantSelec('1');
  }

  function eliminarDelCarrito(id_carrito: string) {
    setCarrito(carrito.filter((c) => c.id_carrito !== id_carrito));
  }

  async function procesarCompra() {
    if (carrito.length === 0) {
      alert('Agrega al menos un artículo a la compra');
      return;
    }
    if (!sucursalId) {
      alert('Selecciona la sucursal de destino');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const items: CompraItemInput[] = carrito.map((c) => ({
        tipo_item: c.tipo_item,
        producto_id: c.tipo_item === 'bateria' ? c.producto_id : (null as any),
        cantidad: c.cantidad,
        precio_unitario: c.precio_unitario,
      }));

      await registrarCompra({
        sucursal_id: sucursalId,
        proveedor_id: proveedorId || undefined,
        items,
      });

      alert('¡Compra registrada exitosamente! El stock y los precios han sido actualizados.');
      router.push('/compras');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al registrar la compra');
      setGuardando(false);
    }
  }

  if (!autenticado) return null;

  if (perfil?.rol !== 'administrador') {
    return (
      <div className={styles.lockedPage}>
        <div className={styles.lockedCard}>
          <h1>Acceso restringido</h1>
          <p>Este panel es solo para administradores.</p>
          <button className={styles.btnPrimarySm} onClick={salir}>Salir</button>
        </div>
      </div>
    );
  }

  const totalCompra = carrito.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);
  const totalArticulos = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  const productosFiltrados = productos.filter((p) => {
    if (!filtroBaterias.trim()) return true;
    const f = filtroBaterias.toLowerCase();
    return (
      (p.modelo ?? '').toLowerCase().includes(f) ||
      (p.codigo_barras ?? '').toLowerCase().includes(f) ||
      (p.marcas?.nombre ?? '').toLowerCase().includes(f)
    );
  });

  return (
    <div className={styles.layout}>
      {menuAbierto && (
        <div
          className={styles.sidebarBackdrop}
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
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
          <Link href="/" className={styles.navItem} onClick={() => setMenuAbierto(false)}>
            <IconDashboard className={styles.navIcon} />
            <span>Dashboard</span>
          </Link>
          <Link href="/catalogo" className={styles.navItem} onClick={() => setMenuAbierto(false)}>
            <IconCatalog className={styles.navIcon} />
            <span>Catálogo</span>
          </Link>
          <Link href="/inventario" className={styles.navItem} onClick={() => setMenuAbierto(false)}>
            <IconInventory className={styles.navIcon} />
            <span>Inventario</span>
          </Link>
          <Link href="/cascos" className={styles.navItem} onClick={() => setMenuAbierto(false)}>
            <IconCasco className={styles.navIcon} />
            <span>Cascos</span>
          </Link>
          <Link href="/usuarios" className={styles.navItem} onClick={() => setMenuAbierto(false)}>
            <IconUsers className={styles.navIcon} />
            <span>Trabajadores / Usuarios</span>
          </Link>
          <Link href="/compras" className={`${styles.navItem} ${styles.navItemActive}`} onClick={() => setMenuAbierto(false)}>
            <IconInventory className={styles.navIcon} />
            <span>Compras</span>
          </Link>
          <Link href="/reportes" className={styles.navItem} onClick={() => setMenuAbierto(false)}>
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
            <button className={styles.menuBtn} onClick={() => setMenuAbierto(true)}>
              <IconMenu />
            </button>
            <div className={styles.breadcrumb}>
              <Link href="/" style={{ color: 'var(--text-muted)' }}>Panel</Link>
              <span>/</span>
              <Link href="/compras" style={{ color: 'var(--text-muted)' }}>Compras</Link>
              <span>/</span>
              <span className={styles.breadcrumbActive}>Registrar Compra</span>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className={styles.mainContent}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              <span>{error}</span>
              <button className={styles.btnSecondary} onClick={() => setError(null)}>
                Entendido
              </button>
            </div>
          )}

          {cargando ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              Cargando formulario de compra…
            </div>
          ) : (
            <div className={styles.formGrid}>
              {/* Columna Izquierda: Formulario */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Tarjeta 1: Datos Generales */}
                <section className={styles.bentoCard}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      <IconInventory style={{ color: 'var(--primary)' }} />
                      <span>1. Destino y Proveedor</span>
                    </h2>
                  </div>
                  
                  <div className={styles.cardBody}>
                    <div className={styles.formRow}>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Sucursal de Destino *</label>
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
                        <span className={styles.helperText}>El inventario ingresará a esta sucursal.</span>
                      </div>

                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Proveedor Externo</label>
                        <select
                          className={styles.select}
                          value={proveedorId}
                          onChange={(e) => setProveedorId(e.target.value)}
                        >
                          <option value="">(Sin especificar / Directo)</option>
                          {proveedores.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre}
                            </option>
                          ))}
                        </select>
                        <span className={styles.helperText}>Opcional para trazabilidad y facturas.</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Tarjeta 2: Agregar Artículos */}
                <section className={styles.bentoCard}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      <IconAdd style={{ color: 'var(--primary)' }} />
                      <span>2. Agregar Productos al Lote</span>
                    </h2>
                  </div>

                  <div className={styles.cardBody}>
                    {/* Control Segmentado Moderno */}
                    <div className={styles.segmentedControl}>
                      <button
                        type="button"
                        className={`${styles.segmentBtn} ${tipoAgregando === 'bateria' ? styles.segmentBtnActive : ''}`}
                        onClick={() => setTipoAgregando('bateria')}
                      >
                        <IconCatalog style={{ width: '16px', height: '16px' }} />
                        <span>Baterías (Catálogo)</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.segmentBtn} ${tipoAgregando === 'casco' ? styles.segmentBtnActive : ''}`}
                        onClick={() => setTipoAgregando('casco')}
                      >
                        <IconCasco style={{ width: '16px', height: '16px' }} />
                        <span>Cascos Solos (Reciclados)</span>
                      </button>
                    </div>

                    <form onSubmit={agregarAlCarrito}>
                      {tipoAgregando === 'bateria' ? (
                        <div className={styles.productSearchContainer}>
                          <label className={styles.fieldLabel}>Buscar y Seleccionar Batería</label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }}>
                              <IconSearch style={{ width: '15px', height: '15px' }} />
                            </span>
                            <input
                              type="text"
                              className={styles.input}
                              style={{ paddingLeft: '34px' }}
                              placeholder="Filtrar por modelo, marca o código de barras…"
                              value={filtroBaterias}
                              onChange={(e) => setFiltroBaterias(e.target.value)}
                            />
                          </div>

                          <div className={styles.productResultsList}>
                            {productosFiltrados.length === 0 ? (
                              <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                                No se encontraron baterías que coincidan con la búsqueda.
                              </div>
                            ) : (
                              productosFiltrados.slice(0, 10).map((p) => {
                                const isSelected = productoSelec?.id === p.id;
                                return (
                                  <div
                                    key={p.id}
                                    className={`${styles.productItemOption} ${isSelected ? styles.productItemOptionSelected : ''}`}
                                    onClick={() => seleccionarProducto(p)}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                                        {p.modelo} {p.marcas?.nombre ? <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>• {p.marcas.nombre}</span> : ''}
                                      </div>
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Código: {p.codigo_barras || '—'}
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        Costo actual: {formatearDinero(p.precio_compra ?? 0)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {productoSelec && (
                            <div style={{ padding: '8px 12px', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-sm)', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Seleccionado: <strong>{productoSelec.modelo}</strong></span>
                              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{productoSelec.marcas?.nombre ?? ''}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={styles.field}>
                          <label className={styles.fieldLabel}>Cascos / Baterías Viejas</label>
                          <input
                            className={styles.input}
                            value="Cascos Reciclados / Adquisición por Lote"
                            disabled
                            style={{ background: 'var(--surface-container-low)' }}
                          />
                          <span className={styles.helperText}>
                            Se sumará directamente al contador de cascos disponibles en la sucursal seleccionada.
                          </span>
                        </div>
                      )}

                      <div className={styles.formRow} style={{ marginTop: '16px' }}>
                        <div className={styles.field}>
                          <label className={styles.fieldLabel}>Cantidad a Comprar</label>
                          <input
                            type="number"
                            className={styles.input}
                            value={cantSelec}
                            onChange={(e) => setCantSelec(e.target.value)}
                            min="1"
                            required
                          />
                        </div>

                        <div className={styles.field}>
                          <label className={styles.fieldLabel}>Costo Unitario ($ MXN)</label>
                          <input
                            type="number"
                            className={styles.input}
                            value={costoSelec}
                            onChange={(e) => setCostoSelec(e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="Ej. 1250.00"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className={styles.btnSecondary}
                        style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}
                      >
                        <IconAdd style={{ width: '15px', height: '15px' }} />
                        <span>Añadir a la Lista</span>
                      </button>
                    </form>
                  </div>
                </section>
              </div>

              {/* Columna Derecha: Resumen de Compra */}
              <section className={styles.bentoCard}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Resumen de la Compra</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {totalArticulos} {totalArticulos === 1 ? 'artículo' : 'artículos'}
                  </span>
                </div>

                <div className={styles.cardBody} style={{ minHeight: '260px' }}>
                  {carrito.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '40px 0' }}>
                      Añade productos de la lista para calcular el total de la compra.
                    </div>
                  ) : (
                    <div className={styles.cartList}>
                      {carrito.map((item) => (
                        <div key={item.id_carrito} className={styles.cartItem}>
                          <div className={styles.cartItemInfo}>
                            <div className={styles.cartItemTitle}>{item.descripcion}</div>
                            <div className={styles.cartItemSubtitle}>
                              {item.cantidad} x {formatearDinero(item.precio_unitario)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="mono" style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                              {formatearDinero(item.cantidad * item.precio_unitario)}
                            </span>
                            <button
                              type="button"
                              className={styles.btnDangerSm}
                              onClick={() => eliminarDelCarrito(item.id_carrito)}
                              title="Eliminar de la lista"
                            >
                              <IconDelete style={{ width: '14px', height: '14px' }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.cartTotalBox}>
                  <div className={styles.cartTotalRow}>
                    <span className={styles.cartTotalLabel}>Total a Pagar:</span>
                    <span className={`mono ${styles.cartTotalAmount}`}>
                      {formatearDinero(totalCompra)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={styles.btnPrimaryLg}
                    style={{ width: '100%' }}
                    disabled={carrito.length === 0 || guardando}
                    onClick={() => void procesarCompra()}
                  >
                    {guardando ? 'Registrando Compra…' : 'Confirmar y Guardar Compra'}
                  </button>

                  <Link
                    href="/compras"
                    className={styles.btnSecondary}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Cancelar y Volver
                  </Link>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
