/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSesion, logout } from '@/lib/auth';
import { Compra, CompraDetalle, listarCompras, obtenerCompra } from '@/lib/purchases';
import { formatearDinero } from '@/lib/catalogo';
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
  IconSearch,
  IconClose,
} from '@/components/Icons';
import { Sidebar } from '@/components/Sidebar';
import styles from './compras.module.css';

export default function ComprasPage() {
  const router = useRouter();
  const { autenticado, perfil } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  
  const [compras, setCompras] = useState<Compra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filtro, setFiltro] = useState('');
  const [compraDetalle, setCompraDetalle] = useState<CompraDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  useEffect(() => {
    if (!autenticado) router.replace('/login');
  }, [autenticado, router]);

  useEffect(() => {
    void cargar();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autenticado, perfil]);

  async function cargar() {
    if (!autenticado || perfil?.rol !== 'administrador') return;
    setCargando(true);
    setError(null);
    try {
      const data = await listarCompras();
      setCompras(data ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar compras');
    } finally {
      setCargando(false);
    }
  }

  async function verDetalle(id: string) {
    setCargandoDetalle(true);
    try {
      const detalle = await obtenerCompra(id);
      setCompraDetalle(detalle);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error al cargar detalle de compra');
    } finally {
      setCargandoDetalle(false);
    }
  }

  function salir() {
    logout();
    router.replace('/login');
    router.refresh();
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

  const comprasFiltradas = compras.filter((c) => {
    if (!filtro.trim()) return true;
    const q = filtro.toLowerCase();
    return (
      (c.folio ?? '').toLowerCase().includes(q) ||
      (c.proveedores?.nombre ?? '').toLowerCase().includes(q) ||
      (c.sucursales?.nombre ?? '').toLowerCase().includes(q) ||
      (c.usuarios?.nombre_completo ?? '').toLowerCase().includes(q)
    );
  });

  const totalInvertido = compras.reduce((sum, c) => sum + (c.estado === 'completada' ? c.total : 0), 0);
  const totalCompras = compras.length;

  return (
    <div className={styles.layout}>
      <Sidebar active="compras" menuAbierto={menuAbierto} onCerrarMenu={() => setMenuAbierto(false)} />

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
              <span className={styles.breadcrumbActive}>Compras</span>
            </div>
          </div>
          
        </header>

        <main className={styles.mainContent}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              <span>{error}</span>
              <button className={styles.btnSecondary} onClick={() => void cargar()}>
                Reintentar
              </button>
            </div>
          )}

          {/* Stat Cards */}
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Total de Facturas / Compras</span>
                <IconInventory style={{ color: 'var(--primary)' }} />
              </div>
              <div className={`${styles.statValue} mono`}>{totalCompras}</div>
              <div className={styles.statSub}>Registros en historial</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Inversión Total Acumulada</span>
                <IconBolt style={{ color: 'var(--secondary)' }} />
              </div>
              <div className={`${styles.statValue} mono`} style={{ color: 'var(--primary)' }}>
                {formatearDinero(totalInvertido)}
              </div>
              <div className={styles.statSub}>Compras completadas</div>
            </div>
          </section>

          {/* Bento Card Tabla */}
          <section className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <IconInventory style={{ color: 'var(--primary)' }} />
                <span>Historial de Compras de Stock ({comprasFiltradas.length})</span>
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className={styles.btnSecondary} onClick={() => void cargar()} disabled={cargando}>
                  Actualizar
                </button>
                <Link href="/compras/nueva" className={styles.btnPrimary}>
                  <IconAdd style={{ width: '14px', height: '14px' }} />
                  <span>Registrar Compra</span>
                </Link>
              </div>
            </div>

            <div className={styles.toolbar}>
              <span style={{ display: 'flex', color: 'var(--text-muted)' }}><IconSearch /></span>
              <input
                className={styles.searchInput}
                placeholder="Buscar por folio, proveedor, sucursal o usuario…"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>

            <div className={styles.tableScroll}>
              {cargando ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Cargando compras…
                </div>
              ) : comprasFiltradas.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  {compras.length === 0 ? 'No hay compras registradas en el sistema.' : 'No se encontraron compras con ese criterio de búsqueda.'}
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Fecha</th>
                      <th>Proveedor</th>
                      <th>Sucursal Destino</th>
                      <th>Registrado por</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comprasFiltradas.map((compra) => (
                      <tr key={compra.id}>
                        <td className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {compra.folio}
                        </td>
                        <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                          {compra.fecha ? new Date(compra.fecha).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          {compra.proveedores?.nombre ?? (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin proveedor</span>
                          )}
                        </td>
                        <td>{compra.sucursales?.nombre ?? '—'}</td>
                        <td>{compra.usuarios?.nombre_completo ?? '—'}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                          {formatearDinero(compra.total)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={compra.estado === 'completada' ? styles.badgeCompletada : styles.badgeCancelada}>
                            {compra.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className={styles.btnSecondary}
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => void verDetalle(compra.id)}
                            disabled={cargandoDetalle}
                          >
                            Ver Detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* Modal Detalle de Compra */}
      {compraDetalle && (
        <div className={styles.overlay} onClick={() => setCompraDetalle(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Detalle de Compra: {compraDetalle.folio}</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {new Date(compraDetalle.fecha).toLocaleString()}
                </span>
              </div>
              <button className={styles.closeBtn} onClick={() => setCompraDetalle(null)}>
                <IconClose />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div>
                  <div className={styles.fieldLabel}>Sucursal Destino</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{compraDetalle.sucursales?.nombre}</div>
                </div>
                <div>
                  <div className={styles.fieldLabel}>Proveedor</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>
                    {compraDetalle.proveedores?.nombre ?? 'Sin proveedor'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <div className={styles.fieldLabel} style={{ marginBottom: '8px' }}>Artículos Comprados</div>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Producto / Modelo</th>
                        <th style={{ textAlign: 'center' }}>Cantidad</th>
                        <th style={{ textAlign: 'right' }}>Costo Unitario</th>
                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compraDetalle.compra_items?.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <span className={styles.badgeCompletada} style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                              {item.tipo_item}
                            </span>
                          </td>
                          <td>
                            <strong>{item.productos?.modelo ?? 'Cascos / Lote'}</strong>
                            {item.productos?.descripcion && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {item.productos.descripcion}
                              </div>
                            )}
                          </td>
                          <td className="mono" style={{ textAlign: 'center', fontWeight: 700 }}>
                            {item.cantidad}
                          </td>
                          <td className="mono" style={{ textAlign: 'right' }}>
                            {formatearDinero(item.precio_unitario)}
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                            {formatearDinero(item.cantidad * item.precio_unitario)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Facturado:</span>
                <span className="mono" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>
                  {formatearDinero(compraDetalle.total)}
                </span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setCompraDetalle(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
