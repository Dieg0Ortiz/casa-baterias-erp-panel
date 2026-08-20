'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useSesion } from '@/lib/auth';
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
  IconMenu,
  IconCasco,
  IconUsers,
  IconAdd,
  IconDelete,
  IconSearch,
} from '@/components/Icons';
import styles from '../../catalogo/catalogo.module.css';

interface ItemCarrito {
  id_carrito: string; // ID temporal
  tipo_item: 'bateria' | 'casco';
  producto_id: string; // Para casco, enviaremos un id dummy o el id no importará tanto en la BDD
  descripcion: string;
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
  
  const [tipoAgregando, setTipoAgregando] = useState<'bateria'|'casco'>('bateria');
  const [productoSelec, setProductoSelec] = useState('');
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
      try {
        const [prov, suc, prod] = await Promise.all([
          listarProveedores(),
          listarSucursales(),
          listarProductos(),
        ]);
        setProveedores(prov);
        setSucursales(suc);
        setProductos(prod);
        
        if (suc.length > 0) setSucursalId(suc[0].id);
        if (prod.length > 0) setProductoSelec(prod[0].id);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Error al cargar datos base');
      } finally {
        setCargando(false);
      }
    }
    void load();
  }, [autenticado, perfil]);

  if (!autenticado) return null;

  if (perfil?.rol !== 'administrador') {
    return (
      <div className={styles.lockedPage}>
        <div className={styles.lockedCard}>
          <h1>Acceso restringido</h1>
          <p>Este panel es solo para administradores.</p>
          <Link href="/" className={styles.btnPrimarySm}>Volver</Link>
        </div>
      </div>
    );
  }

  function agregarAlCarrito(e: FormEvent) {
    e.preventDefault();
    
    const cantidad = Number(cantSelec);
    if (isNaN(cantidad) || cantidad <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
    
    const costo = Number(costoSelec);
    if (isNaN(costo) || costo < 0 || costoSelec.trim() === '') {
      alert('El costo debe ser un número válido mayor o igual a 0');
      return;
    }

    let descripcion = '';
    let prodId = '';

    if (tipoAgregando === 'bateria') {
      const p = productos.find(x => x.id === productoSelec);
      if (!p) {
        alert('Selecciona un producto válido');
        return;
      }
      descripcion = p.modelo + (p.marcas?.nombre ? ` (${p.marcas.nombre})` : '');
      prodId = p.id;
    } else {
      descripcion = 'Cascos (Compra por Lote)';
      // Para cascos mandaremos null o vacío en el backend. 
      // El RPC los distingue por el tipo_item = 'casco' y el p_producto_id se ignora.
      // Usaremos un ID falso para el frontend.
      prodId = 'casco-000';
    }

    setCarrito([...carrito, {
      id_carrito: Math.random().toString(36).substring(7),
      tipo_item: tipoAgregando,
      producto_id: prodId,
      descripcion,
      cantidad,
      precio_unitario: costo
    }]);

    setCantSelec('1');
    setCostoSelec('');
  }

  function eliminarDelCarrito(id_carrito: string) {
    setCarrito(carrito.filter(c => c.id_carrito !== id_carrito));
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
      const items: CompraItemInput[] = carrito.map(c => ({
        tipo_item: c.tipo_item,
        producto_id: c.tipo_item === 'bateria' ? c.producto_id : null as any,
        cantidad: c.cantidad,
        precio_unitario: c.precio_unitario
      }));

      await registrarCompra({
        sucursal_id: sucursalId,
        proveedor_id: proveedorId || undefined,
        items
      });

      alert('Compra registrada exitosamente. El inventario ha sido actualizado.');
      router.push('/compras');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al registrar la compra');
      setGuardando(false);
    }
  }

  const totalCompra = carrito.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);

  const productosFiltrados = productos.filter(p => {
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
        />
      )}

      <aside className={`${styles.sidebar} ${menuAbierto ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandInfo}>
            <span className={styles.brandIcon}><IconBolt /></span>
            <div>
              <h1 className={styles.brandTitle}>Casa Baterías</h1>
              <p className={styles.brandSubtitle}>Control Central</p>
            </div>
          </div>
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
            <span>Trabajadores</span>
          </Link>
          <Link href="/compras" className={`${styles.navItem} ${styles.navItemActive}`} onClick={() => setMenuAbierto(false)}>
            <IconInventory className={styles.navIcon} />
            <span>Compras de Stock</span>
          </Link>
        </nav>
      </aside>

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
              <span className={styles.breadcrumbActive}>Nueva</span>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className={styles.mainContent}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              <span>{error}</span>
            </div>
          )}

          {cargando ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Cargando...
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px', alignItems: 'start' }}>
              
              {/* FORMULARIO AGREGAR ITEMS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <section className={styles.bentoCard} style={{ padding: '20px' }}>
                  <h2 className={styles.cardTitle} style={{ marginBottom: '15px' }}>Detalles de la Factura / Compra</h2>
                  
                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Sucursal de Destino *</span>
                      <select className={styles.select} value={sucursalId} onChange={e => setSucursalId(e.target.value)}>
                        {sucursales.map(s => (
                          <option key={s.id} value={s.id}>{s.nombre} {s.es_matriz ? '(Matriz)' : ''}</option>
                        ))}
                      </select>
                      <span className={styles.helperText}>El inventario se sumará a esta sucursal.</span>
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Proveedor Externo</span>
                      <select className={styles.select} value={proveedorId} onChange={e => setProveedorId(e.target.value)}>
                        <option value="">(Sin Especificar)</option>
                        {proveedores.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section className={styles.bentoCard} style={{ padding: '20px' }}>
                  <h2 className={styles.cardTitle} style={{ marginBottom: '15px' }}>Agregar Productos a la Compra</h2>
                  <form onSubmit={agregarAlCarrito}>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input 
                          type="radio" 
                          name="tipo" 
                          checked={tipoAgregando === 'bateria'} 
                          onChange={() => setTipoAgregando('bateria')} 
                        />
                        Baterías (Catálogo)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input 
                          type="radio" 
                          name="tipo" 
                          checked={tipoAgregando === 'casco'} 
                          onChange={() => setTipoAgregando('casco')} 
                        />
                        Cascos Solos
                      </label>
                    </div>

                    {tipoAgregando === 'bateria' ? (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Batería (Buscar y Seleccionar)</span>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }}>
                            <IconSearch style={{ width: '16px', height: '16px' }} />
                          </span>
                          <input
                            type="text"
                            className={styles.input}
                            style={{ paddingLeft: '34px', width: '100%' }}
                            placeholder="Filtrar por modelo, marca o código..."
                            value={filtroBaterias}
                            onChange={(e) => setFiltroBaterias(e.target.value)}
                          />
                        </div>
                        <select className={styles.select} value={productoSelec} onChange={e => setProductoSelec(e.target.value)}>
                          <option value="" disabled>Seleccione una batería...</option>
                          {productosFiltrados.map(p => (
                            <option key={p.id} value={p.id}>{p.modelo} {p.marcas?.nombre ? `(${p.marcas.nombre})` : ''}</option>
                          ))}
                        </select>
                        {productosFiltrados.length === 0 && (
                          <div style={{ fontSize: '12px', color: 'var(--error)', marginTop: '4px' }}>No se encontraron baterías con esa búsqueda.</div>
                        )}
                      </div>
                    ) : (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Cascos Reciclados / Compra por Lote</span>
                        <input className={styles.input} value="Cascos / Baterías Viejas" disabled style={{ background: 'var(--surface-container-low)' }} />
                      </div>
                    )}

                    <div className={styles.formRow} style={{ marginTop: '15px' }}>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Cantidad</span>
                        <input 
                          type="number" 
                          className={styles.input} 
                          value={cantSelec} 
                          onChange={e => setCantSelec(e.target.value)} 
                          min="1"
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Costo Unitario (Precio de Compra)</span>
                        <input 
                          type="number" 
                          className={styles.input} 
                          value={costoSelec} 
                          onChange={e => setCostoSelec(e.target.value)} 
                          min="0"
                          step="0.01"
                          placeholder="Ej. 1200.00"
                        />
                      </label>
                    </div>

                    <button type="submit" className={styles.btnSecondary} style={{ marginTop: '15px' }}>
                      <IconAdd style={{ width: '14px', height: '14px' }} /> Añadir a la lista
                    </button>
                  </form>
                </section>
              </div>

              {/* CARRITO Y TOTALES */}
              <div className={styles.bentoCard} style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                <div className={styles.cardHeader} style={{ background: 'var(--surface-container-low)', padding: '15px 20px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Resumen de Compra</h3>
                </div>
                
                <div style={{ padding: '20px', flex: 1, minHeight: '300px' }}>
                  {carrito.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '20px' }}>
                      Agrega productos a la compra para continuar
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {carrito.map(item => (
                        <div key={item.id_carrito} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--surface-container)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.descripcion}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {item.cantidad} x {formatearDinero(item.precio_unitario)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                              {formatearDinero(item.cantidad * item.precio_unitario)}
                            </div>
                            <button className={styles.brandActionBtnDanger} onClick={() => eliminarDelCarrito(item.id_carrito)}>
                              <IconDelete style={{ width: '14px', height: '14px' }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'var(--surface-container-lowest)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Total</span>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>{formatearDinero(totalCompra)}</span>
                  </div>
                  
                  <button 
                    className={styles.btnPrimaryLg} 
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={carrito.length === 0 || guardando}
                    onClick={() => void procesarCompra()}
                  >
                    {guardando ? 'Registrando...' : 'Confirmar Compra'}
                  </button>
                </div>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
