/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '@/lib/api';
import { logout, useSesion } from '@/lib/auth';
import {
  type EmpresaCredito,
  type CreditoVenta,
  type EstadoCuentaEmpresa,
  listarEmpresasCredito,
  crearEmpresaCredito,
  actualizarEmpresaCredito,
  obtenerEstadoCuentaEmpresa,
  listarVentasCredito,
  registrarAbonoCredito,
} from '@/lib/admin';
import { formatearDinero } from '@/lib/catalogo';
import {
  IconBolt,
  IconDashboard,
  IconCatalog,
  IconInventory,
  IconReports,
  IconLogout,
  IconSearch,
  IconClose,
  IconMenu,
  IconCasco,
  IconUsers,
  IconRefresh,
  IconBuilding,
  IconReceipt,
} from '@/components/Icons';
import { Sidebar } from '@/components/Sidebar';
import styles from './creditos.module.css';

function mensajeError(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Ocurrió un error. Intenta de nuevo.';
}

export default function CreditosPage() {
  const router = useRouter();
  const { autenticado, perfil } = useSesion();

  const [empresas, setEmpresas] = useState<EmpresaCredito[]>([]);
  const [ventasCredito, setVentasCredito] = useState<CreditoVenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pestaña, setPestaña] = useState<'empresas' | 'cuentas' | 'abonos'>('empresas');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'parcial' | 'vencido' | 'pagado'>('todos');
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Modales
  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState<EmpresaCredito | null>(null);
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [rfcEmpresa, setRfcEmpresa] = useState('');
  const [contactoEmpresa, setContactoEmpresa] = useState('');
  const [telefonoEmpresa, setTelefonoEmpresa] = useState('');
  const [emailEmpresa, setEmailEmpresa] = useState('');
  const [direccionEmpresa, setDireccionEmpresa] = useState('');
  const [limiteCredito, setLimiteCredito] = useState('0');
  const [diasCredito, setDiasCredito] = useState('30');
  const [activoEmpresa, setActivoEmpresa] = useState(true);
  const [guardandoEmpresa, setGuardandoEmpresa] = useState(false);
  const [errorModalEmpresa, setErrorModalEmpresa] = useState<string | null>(null);

  // Modal Estado de Cuenta
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuentaEmpresa | null>(null);
  const [cargandoEstadoCuenta, setCargandoEstadoCuenta] = useState(false);

  // Modal Registrar Abono
  const [modalAbono, setModalAbono] = useState(false);
  const [empresaAbono, setEmpresaAbono] = useState<EmpresaCredito | null>(null);
  const [ventaAbono, setVentaAbono] = useState<CreditoVenta | null>(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoAbono, setMetodoAbono] = useState<'transferencia' | 'efectivo' | 'cheque' | 'tarjeta'>('transferencia');
  const [referenciaAbono, setReferenciaAbono] = useState('');
  const [notasAbono, setNotasAbono] = useState('');
  const [guardandoAbono, setGuardandoAbono] = useState(false);
  const [errorModalAbono, setErrorModalAbono] = useState<string | null>(null);

  useEffect(() => {
    if (!autenticado) router.replace('/login');
  }, [autenticado, router]);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [datosEmpresas, datosVentas] = await Promise.all([
        listarEmpresasCredito().catch(() => []),
        listarVentasCredito().catch(() => []),
      ]);
      setEmpresas(datosEmpresas);
      setVentasCredito(datosVentas);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (autenticado) {
      cargarDatos();
    }
  }, [autenticado]);

  // Cálculos de KPIs
  const kpis = useMemo(() => {
    const totalPorCobrar = empresas.reduce((sum, e) => sum + (e.saldo_deudor || 0), 0);
    const totalBateriasDebidas = empresas.reduce((sum, e) => sum + (e.total_baterias_debidas || 0), 0);
    const empresasConDeuda = empresas.filter((e) => (e.saldo_deudor || 0) > 0).length;
    const facturasVencidas = ventasCredito.filter((v) => v.es_vencida).length;

    return {
      totalPorCobrar,
      totalBateriasDebidas,
      empresasConDeuda,
      facturasVencidas,
      totalEmpresas: empresas.length,
    };
  }, [empresas, ventasCredito]);

  // Filtros de Empresas
  const empresasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return empresas.filter((e) => {
      if (!q) return true;
      return (
        e.nombre.toLowerCase().includes(q) ||
        (e.rfc && e.rfc.toLowerCase().includes(q)) ||
        (e.contacto_nombre && e.contacto_nombre.toLowerCase().includes(q)) ||
        (e.telefono && e.telefono.toLowerCase().includes(q))
      );
    });
  }, [empresas, busqueda]);

  // Filtros de Cuentas por Cobrar (Ventas a Crédito)
  const ventasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return ventasCredito.filter((v) => {
      if (filtroEstado === 'vencido') {
        if (!v.es_vencida) return false;
      } else if (filtroEstado !== 'todos') {
        if (v.estado !== filtroEstado) return false;
      }

      if (!q) return true;
      const nomEmpresa = v.empresa?.nombre.toLowerCase() || '';
      const folio = v.venta?.folio.toLowerCase() || '';
      const chofer = v.recibido_por?.toLowerCase() || '';
      const placas = v.vehiculo_placas?.toLowerCase() || '';
      const vale = v.folio_vale?.toLowerCase() || '';
      return nomEmpresa.includes(q) || folio.includes(q) || chofer.includes(q) || placas.includes(q) || vale.includes(q);
    });
  }, [ventasCredito, filtroEstado, busqueda]);

  // Abrir modal nueva/editar empresa
  function abrirModalEmpresa(emp?: EmpresaCredito) {
    if (emp) {
      setEmpresaEditando(emp);
      setNombreEmpresa(emp.nombre);
      setRfcEmpresa(emp.rfc || '');
      setContactoEmpresa(emp.contacto_nombre || '');
      setTelefonoEmpresa(emp.telefono || '');
      setEmailEmpresa(emp.email || '');
      setDireccionEmpresa(emp.direccion || '');
      setLimiteCredito(String(emp.limite_credito || 0));
      setDiasCredito(String(emp.dias_credito || 30));
      setActivoEmpresa(emp.activo);
    } else {
      setEmpresaEditando(null);
      setNombreEmpresa('');
      setRfcEmpresa('');
      setContactoEmpresa('');
      setTelefonoEmpresa('');
      setEmailEmpresa('');
      setDireccionEmpresa('');
      setLimiteCredito('0');
      setDiasCredito('30');
      setActivoEmpresa(true);
    }
    setErrorModalEmpresa(null);
    setModalEmpresa(true);
  }

  async function guardarEmpresa(e: FormEvent) {
    e.preventDefault();
    if (!nombreEmpresa.trim()) {
      setErrorModalEmpresa('El nombre de la empresa es obligatorio.');
      return;
    }
    setGuardandoEmpresa(true);
    setErrorModalEmpresa(null);
    try {
      const payload = {
        nombre: nombreEmpresa.trim(),
        rfc: rfcEmpresa.trim() || undefined,
        contacto_nombre: contactoEmpresa.trim() || undefined,
        telefono: telefonoEmpresa.trim() || undefined,
        email: emailEmpresa.trim() || undefined,
        direccion: direccionEmpresa.trim() || undefined,
        limite_credito: Number(limiteCredito) || 0,
        dias_credito: Number(diasCredito) || 30,
        activo: activoEmpresa,
      };

      if (empresaEditando) {
        await actualizarEmpresaCredito(empresaEditando.id, payload);
      } else {
        await crearEmpresaCredito(payload);
      }

      setModalEmpresa(false);
      await cargarDatos();
    } catch (err) {
      setErrorModalEmpresa(mensajeError(err));
    } finally {
      setGuardandoEmpresa(false);
    }
  }

  // Ver Estado de Cuenta
  async function verEstadoCuenta(empresaId: string) {
    setCargandoEstadoCuenta(true);
    try {
      const data = await obtenerEstadoCuentaEmpresa(empresaId);
      setEstadoCuenta(data);
    } catch (err) {
      alert(mensajeError(err));
    } finally {
      setCargandoEstadoCuenta(false);
    }
  }

  // Abrir Modal de Abono
  function abrirModalAbono(emp: EmpresaCredito, venta?: CreditoVenta) {
    setEmpresaAbono(emp);
    setVentaAbono(venta || null);
    setMontoAbono(venta ? String(venta.saldo_pendiente) : String(emp.saldo_deudor || ''));
    setMetodoAbono('transferencia');
    setReferenciaAbono('');
    setNotasAbono('');
    setErrorModalAbono(null);
    setModalAbono(true);
  }

  async function guardarAbono(e: FormEvent) {
    e.preventDefault();
    const monto = Number(montoAbono);
    if (!monto || monto <= 0) {
      setErrorModalAbono('Ingresa un monto de abono válido.');
      return;
    }
    if (!empresaAbono) return;

    setGuardandoAbono(true);
    setErrorModalAbono(null);
    try {
      await registrarAbonoCredito({
        empresa_id: empresaAbono.id,
        monto,
        metodo_pago: metodoAbono,
        credito_venta_id: ventaAbono ? ventaAbono.id : undefined,
        referencia: referenciaAbono.trim() || undefined,
        notas: notasAbono.trim() || undefined,
      });

      setModalAbono(false);
      await cargarDatos();
      if (estadoCuenta && estadoCuenta.empresa.id === empresaAbono.id) {
        await verEstadoCuenta(empresaAbono.id);
      }
    } catch (err) {
      setErrorModalAbono(mensajeError(err));
    } finally {
      setGuardandoAbono(false);
    }
  }

  return (
    <div className={styles.layout}>
      <Sidebar active="creditos" menuAbierto={menuAbierto} onCerrarMenu={() => setMenuAbierto(false)} />

      {/* Contenedor Principal */}
      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.menuBtn}
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
            >
              <IconMenu />
            </button>
            <div className={styles.breadcrumb}>
              <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Panel</Link>
              <span>/</span>
              <span className={styles.breadcrumbActive}>Créditos y Cuentas por Cobrar</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button type="button" className={styles.btnSecondary} onClick={() => cargarDatos()} disabled={cargando}>
              <IconRefresh />
              <span>Actualizar</span>
            </button>
            <button type="button" className={styles.btnPrimary} onClick={() => abrirModalEmpresa()}>
              <IconBuilding />
              <span>+ Nueva Empresa</span>
            </button>
          </div>
        </header>

        <main className={styles.mainContent}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              <span>{error}</span>
              <button className={styles.btnSecondary} onClick={() => cargarDatos()}>
                Reintentar
              </button>
            </div>
          )}

          {/* Tarjetas KPI */}
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Total Deuda por Cobrar</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>MXN</span>
              </div>
              <div className={styles.statValue} style={{ color: kpis.totalPorCobrar > 0 ? 'var(--primary)' : undefined }}>
                {formatearDinero(kpis.totalPorCobrar)}
              </div>
              <div className={styles.statHint}>{kpis.empresasConDeuda} empresas con saldo activo</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Baterías a Crédito</span>
                <IconInventory style={{ color: '#3b82f6', opacity: 0.8 }} />
              </div>
              <div className={styles.statValue} style={{ color: '#3b82f6' }}>
                {kpis.totalBateriasDebidas} uds
              </div>
              <div className={styles.statHint}>Pendientes de liquidación total</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Facturas Vencidas</span>
                <IconReceipt style={{ color: kpis.facturasVencidas > 0 ? '#ef4444' : '#16a34a', opacity: 0.8 }} />
              </div>
              <div className={styles.statValue} style={{ color: kpis.facturasVencidas > 0 ? '#ef4444' : '#16a34a' }}>
                {kpis.facturasVencidas}
              </div>
              <div className={styles.statHint}>Plazo de días superado</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Empresas Registradas</span>
                <IconBuilding style={{ color: 'var(--text-secondary)', opacity: 0.8 }} />
              </div>
              <div className={styles.statValue}>
                {kpis.totalEmpresas}
              </div>
              <div className={styles.statHint}>Clientes corporativos en catálogo</div>
            </div>
          </section>

          {/* Pestañas Principales */}
          <div className={styles.mainTabs}>
            <button
              type="button"
              className={`${styles.mainTab} ${pestaña === 'empresas' ? styles.mainTabActive : ''}`}
              onClick={() => setPestaña('empresas')}
            >
              <IconBuilding />
              <span>Empresas con Crédito</span>
              <span className={styles.tabBadge}>{empresas.length}</span>
            </button>
            <button
              type="button"
              className={`${styles.mainTab} ${pestaña === 'cuentas' ? styles.mainTabActive : ''}`}
              onClick={() => setPestaña('cuentas')}
            >
              <IconReceipt />
              <span>Ventas (Cuentas por Cobrar)</span>
              <span className={styles.tabBadge}>{ventasCredito.filter((v) => v.estado !== 'pagado').length}</span>
            </button>
          </div>

          {/* Tab 1: Empresas */}
          {pestaña === 'empresas' && (
            <section className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <IconBuilding style={{ color: 'var(--primary)' }} />
                  <span>Empresas con Línea de Crédito ({empresasFiltradas.length})</span>
                </h2>
              </div>

              {/* Toolbar */}
              <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                  <IconSearch className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por empresa, RFC o contacto..."
                  />
                  {busqueda && (
                    <button
                      onClick={() => setBusqueda('')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <IconClose />
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Empresa</th>
                      <th style={{ width: '20%' }}>Contacto & Teléfono</th>
                      <th style={{ width: '10%' }}>Plazo</th>
                      <th style={{ width: '15%' }}>Límite</th>
                      <th style={{ width: '12%', textAlign: 'right' }}>Deuda</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Estado</th>
                      <th style={{ width: '13%', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargando ? (
                      <tr>
                        <td colSpan={7} className={styles.emptyText}>Cargando empresas...</td>
                      </tr>
                    ) : empresasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={7} className={styles.emptyText}>No hay empresas registradas con crédito.</td>
                      </tr>
                    ) : (
                      empresasFiltradas.map((emp) => {
                        const deuda = emp.saldo_deudor || 0;
                        return (
                          <tr key={emp.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emp.nombre}</div>
                              {emp.rfc && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>RFC: {emp.rfc}</div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{emp.contacto_nombre || '—'}</div>
                              {emp.telefono && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.telefono}</div>
                              )}
                            </td>
                            <td>
                              <span className={styles.badgeInfo}>
                                {emp.dias_credito} días
                              </span>
                            </td>
                            <td className="mono" style={{ fontWeight: 600 }}>
                              {emp.limite_credito > 0 ? formatearDinero(emp.limite_credito) : 'Sin límite'}
                            </td>
                            <td style={{ textAlign: 'right' }} className="mono">
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: deuda > 0 ? 'var(--primary)' : 'var(--text-secondary)',
                                  fontSize: '14px',
                                }}
                              >
                                {formatearDinero(deuda)}
                              </div>
                              {emp.tiene_vencidas && (
                                <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>
                                  ⚠️ Vencida
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={emp.activo ? styles.badgeSuccess : styles.badgeMuted}>
                                {emp.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className={styles.btnPriceAction}
                                  onClick={() => verEstadoCuenta(emp.id)}
                                >
                                  Ver Edo.
                                </button>
                                {deuda > 0 && (
                                  <button
                                    type="button"
                                    className={styles.btnPriceAction}
                                    style={{ color: '#16a34a', borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}
                                    onClick={() => abrirModalAbono(emp)}
                                  >
                                    + Abonar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className={styles.btnSecondary}
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  onClick={() => abrirModalEmpresa(emp)}
                                >
                                  Editar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Tab 2: Ventas a Crédito */}
          {pestaña === 'cuentas' && (
            <section className={styles.bentoCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <IconReceipt style={{ color: 'var(--primary)' }} />
                  <span>Cuentas por Cobrar ({ventasFiltradas.length})</span>
                </h2>
              </div>

              {/* Toolbar */}
              <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                  <IconSearch className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por folio, empresa, chofer o vale..."
                  />
                  {busqueda && (
                    <button
                      onClick={() => setBusqueda('')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <IconClose />
                    </button>
                  )}
                </div>
                <div className={styles.filters}>
                  {(['todos', 'pendiente', 'parcial', 'vencido', 'pagado'] as const).map((estado) => (
                    <button
                      key={estado}
                      type="button"
                      className={`${styles.filterBtn} ${filtroEstado === estado ? styles.filterBtnActive : ''}`}
                      onClick={() => setFiltroEstado(estado)}
                    >
                      {estado === 'todos' && 'Todos'}
                      {estado === 'pendiente' && 'Pendientes'}
                      {estado === 'parcial' && 'Con Abonos'}
                      {estado === 'vencido' && '⚠️ Vencidas'}
                      {estado === 'pagado' && 'Pagadas'}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '12%' }}>Folio & Fecha</th>
                      <th style={{ width: '16%' }}>Empresa</th>
                      <th style={{ width: '10%' }}>Vencimiento</th>
                      <th style={{ width: '14%' }}>Chofer / Vale</th>
                      <th style={{ width: '18%' }}>Artículos</th>
                      <th style={{ width: '10%', textAlign: 'right' }}>Total</th>
                      <th style={{ width: '10%', textAlign: 'right' }}>Saldo</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargando ? (
                      <tr>
                        <td colSpan={8} className={styles.emptyText}>Cargando ventas a crédito...</td>
                      </tr>
                    ) : ventasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={8} className={styles.emptyText}>No hay cuentas por cobrar con los filtros seleccionados.</td>
                      </tr>
                    ) : (
                      ventasFiltradas.map((item) => {
                        const items = item.venta?.venta_items || [];
                        return (
                          <tr key={item.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--primary)' }} className="mono">
                                {item.venta?.folio || 'V-CREDITO'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {new Date(item.created_at).toLocaleDateString('es-MX', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{item.empresa?.nombre || 'Empresa'}</div>
                              {item.sucursal && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {item.sucursal.nombre}
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>
                                {new Date(item.fecha_vencimiento + 'T12:00:00Z').toLocaleDateString('es-MX', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </div>
                              {item.es_vencida ? (
                                <span className={styles.badgeDanger} style={{ marginTop: 4 }}>Vencida</span>
                              ) : item.estado === 'pagado' ? (
                                <span className={styles.badgeSuccess} style={{ marginTop: 4 }}>Pagada</span>
                              ) : (
                                <span className={styles.badgeInfo} style={{ marginTop: 4 }}>Al día</span>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{item.recibido_por || '—'}</div>
                              {(item.vehiculo_placas || item.folio_vale) && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {item.vehiculo_placas ? `Placas: ${item.vehiculo_placas}` : ''}{' '}
                                  {item.folio_vale ? `Vale: ${item.folio_vale}` : ''}
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {items.map((vi, idx) => (
                                  <div key={idx} style={{ fontSize: '11px' }}>
                                    <span style={{ fontWeight: 700 }}>{vi.cantidad}x</span>{' '}
                                    {vi.producto?.modelo || 'Batería'} ({vi.producto?.marca || ''})
                                    {vi.con_casco ? ' · C' : ' · S/C'}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }} className="mono">
                              <div style={{ fontWeight: 600 }}>{formatearDinero(item.monto_total)}</div>
                            </td>
                            <td style={{ textAlign: 'right' }} className="mono">
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: '14px',
                                  color: item.saldo_pendiente > 0 ? 'var(--primary)' : '#16a34a',
                                }}
                              >
                                {formatearDinero(item.saldo_pendiente)}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.saldo_pendiente > 0 && item.empresa ? (
                                <button
                                  type="button"
                                  className={styles.btnPriceAction}
                                  style={{ color: '#16a34a', borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}
                                  onClick={() =>
                                    abrirModalAbono(
                                      {
                                        id: item.empresa!.id,
                                        nombre: item.empresa!.nombre,
                                        rfc: item.empresa!.rfc,
                                        contacto_nombre: null,
                                        telefono: item.empresa!.telefono,
                                        email: null,
                                        direccion: null,
                                        limite_credito: 0,
                                        dias_credito: item.empresa!.dias_credito,
                                        activo: true,
                                        saldo_deudor: item.saldo_pendiente,
                                        created_at: '',
                                        updated_at: '',
                                      },
                                      item,
                                    )
                                  }
                                >
                                  Abonar
                                </button>
                              ) : (
                                <span className={styles.badgeSuccess}>Liquidado</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Modales */}

      {/* Modal Crear / Editar Empresa */}
      {modalEmpresa && (
        <Modal
          titulo={empresaEditando ? 'Editar Empresa con Crédito' : 'Registrar Empresa con Línea de Crédito'}
          icono={<IconBuilding style={{ color: 'var(--primary)' }} />}
          onCerrar={() => setModalEmpresa(false)}
          maxWidth="620px"
        >
          <form onSubmit={guardarEmpresa}>
            <div className={styles.modalBody}>
              {errorModalEmpresa && (
                <div className={`${styles.alertBox} ${styles.alertError}`}>
                  <span>{errorModalEmpresa}</span>
                </div>
              )}

              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.label}>Nombre de la Empresa o Razón Social *</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Ej. Bimbo México S.A. de C.V."
                    value={nombreEmpresa}
                    onChange={(e) => setNombreEmpresa(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>RFC / Identificador</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Ej. BIM900101XX1"
                    value={rfcEmpresa}
                    onChange={(e) => setRfcEmpresa(e.target.value.toUpperCase())}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Nombre de Contacto / Encargado</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Ej. Lic. Carlos Gómez"
                    value={contactoEmpresa}
                    onChange={(e) => setContactoEmpresa(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Teléfono de Contacto</label>
                  <input
                    className={styles.input}
                    type="tel"
                    placeholder="Ej. 9931234567"
                    value={telefonoEmpresa}
                    onChange={(e) => setTelefonoEmpresa(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Correo Electrónico</label>
                  <input
                    className={styles.input}
                    type="email"
                    placeholder="Ej. facturacion@empresa.com"
                    value={emailEmpresa}
                    onChange={(e) => setEmailEmpresa(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Límite de Crédito ($ MXN)</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0 = Sin límite"
                    value={limiteCredito}
                    onChange={(e) => setLimiteCredito(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Plazo de Crédito (Días)</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="1"
                    placeholder="Ej. 15, 30, 45 días"
                    value={diasCredito}
                    onChange={(e) => setDiasCredito(e.target.value)}
                    required
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.label}>Dirección / Sucursal de la Empresa</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Ej. Parque Industrial Lote 4"
                    value={direccionEmpresa}
                    onChange={(e) => setDireccionEmpresa(e.target.value)}
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={activoEmpresa}
                      onChange={(e) => setActivoEmpresa(e.target.checked)}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Línea de Crédito Activa (Disponible para ventas en POS)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setModalEmpresa(false)}>
                Cancelar
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={guardandoEmpresa}>
                {guardandoEmpresa ? 'Guardando...' : empresaEditando ? 'Actualizar Empresa' : 'Registrar Empresa'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Registrar Abono */}
      {modalAbono && empresaAbono && (
        <Modal
          titulo={ventaAbono ? `Registrar Pago para ${ventaAbono.venta?.folio}` : `Registrar Abono a ${empresaAbono.nombre}`}
          icono={<IconReceipt style={{ color: 'var(--primary)' }} />}
          onCerrar={() => setModalAbono(false)}
          maxWidth="580px"
        >
          <form onSubmit={guardarAbono}>
            <div className={styles.modalBody}>
              {errorModalAbono && (
                <div className={`${styles.alertBox} ${styles.alertError}`}>
                  <span>{errorModalAbono}</span>
                </div>
              )}

              <div
                style={{
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Empresa: <strong style={{ color: 'var(--text-primary)' }}>{empresaAbono.nombre}</strong>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Saldo Deudor Total:{' '}
                  <strong style={{ color: 'var(--primary)', fontFamily: 'monospace', fontSize: '1rem' }}>
                    {formatearDinero(empresaAbono.saldo_deudor || 0)}
                  </strong>
                </div>
                {ventaAbono && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Saldo Pendiente de esta Factura:{' '}
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {formatearDinero(ventaAbono.saldo_pendiente)}
                    </strong>
                  </div>
                )}
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Monto a Abonar ($ MXN) *</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Forma de Pago *</label>
                  <select
                    className={styles.select}
                    value={metodoAbono}
                    onChange={(e) => setMetodoAbono(e.target.value as 'transferencia' | 'cheque' | 'efectivo' | 'tarjeta')}
                  >
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="cheque">Cheque</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta Bancaria</option>
                  </select>
                </div>

                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.label}>Folio de Referencia / Transacción / No. Cheque</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Ej. SPEI-8921348 o Cheque #4928"
                    value={referenciaAbono}
                    onChange={(e) => setReferenciaAbono(e.target.value)}
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.label}>Notas o Comentarios Adicionales</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Ej. Pago correspondiente a la flotilla del mes"
                    value={notasAbono}
                    onChange={(e) => setNotasAbono(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setModalAbono(false)}>
                Cancelar
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={guardandoAbono}>
                {guardandoAbono ? 'Aplicando Abono...' : 'Confirmar y Aplicar Pago'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Estado de Cuenta Detallado */}
      {estadoCuenta && (
        <Modal
          titulo={`Estado de Cuenta: ${estadoCuenta.empresa.nombre}`}
          icono={<IconBuilding style={{ color: 'var(--primary)' }} />}
          onCerrar={() => setEstadoCuenta(null)}
          maxWidth="860px"
        >
          <div className={styles.modalBody}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '-8px' }}>
              {estadoCuenta.empresa.rfc ? `RFC: ${estadoCuenta.empresa.rfc} · ` : ''} Plazo:{' '}
              {estadoCuenta.empresa.dias_credito} días
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                padding: 16,
                background: 'var(--surface-header, rgba(255, 255, 255, 0.02))',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--outline-variant)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Saldo Deudor Pendiente</span>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: estadoCuenta.saldo_deudor > 0 ? 'var(--primary)' : '#10b981',
                  }}
                >
                  {formatearDinero(estadoCuenta.saldo_deudor)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Límite Autorizado</span>
                <div style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {estadoCuenta.empresa.limite_credito > 0
                    ? formatearDinero(estadoCuenta.empresa.limite_credito)
                    : 'Sin límite'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ventas a Crédito Totales</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {estadoCuenta.ventas.length} registros
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginTop: 8, color: 'var(--text-primary)' }}>
              Ventas y Baterías Adeudadas
            </h4>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Fecha</th>
                    <th>Vencimiento</th>
                    <th>Artículos</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                    <th style={{ textAlign: 'right' }}>Saldo</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {estadoCuenta.ventas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.emptyText}>
                        No hay ventas a crédito registradas.
                      </td>
                    </tr>
                  ) : (
                    estadoCuenta.ventas.map((v) => (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }} className="mono">{v.venta?.folio}</td>
                        <td style={{ fontSize: '11px' }}>{new Date(v.created_at).toLocaleDateString('es-MX')}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{new Date(v.fecha_vencimiento + 'T12:00:00Z').toLocaleDateString('es-MX')}</div>
                          {new Date(v.fecha_vencimiento + 'T12:00:00Z') < new Date() && v.estado !== 'pagado' && (
                            <span className={styles.badgeDanger} style={{ marginTop: 4 }}>
                              Vencida
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '11px' }}>
                          {(v.venta?.venta_items || []).map((vi, idx) => (
                            <div key={idx}>
                              <span style={{ fontWeight: 700 }}>{vi.cantidad}x</span> {vi.producto?.modelo} ({vi.producto?.marca})
                            </div>
                          ))}
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">{formatearDinero(v.monto_total)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: v.saldo_pendiente > 0 ? 'var(--primary)' : '#10b981' }} className="mono">
                          {formatearDinero(v.saldo_pendiente)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={v.estado === 'pagado' ? styles.badgeSuccess : styles.badgeWarning}>
                            {v.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {v.saldo_pendiente > 0 && (
                            <button
                              type="button"
                              className={styles.btnPriceAction}
                              style={{ color: '#16a34a', borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}
                              onClick={() => abrirModalAbono(estadoCuenta.empresa, v)}
                            >
                              Pagar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginTop: 12, color: 'var(--text-primary)' }}>
              Historial de Abonos / Pagos
            </h4>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                    <th>Método</th>
                    <th>Referencia</th>
                    <th>Recibido Por</th>
                  </tr>
                </thead>
                <tbody>
                  {estadoCuenta.abonos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.emptyText}>
                        No hay abonos registrados para esta empresa.
                      </td>
                    </tr>
                  ) : (
                    estadoCuenta.abonos.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontSize: '11px' }}>
                          {new Date(a.created_at).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }} className="mono">
                          +{formatearDinero(a.monto)}
                        </td>
                        <td>
                          <span className={styles.badgeInfo} style={{ textTransform: 'capitalize' }}>
                            {a.metodo_pago}
                          </span>
                        </td>
                        <td>{a.referencia || '—'}</td>
                        <td style={{ fontSize: '11px' }}>{a.usuario?.nombre || 'Usuario'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={() => setEstadoCuenta(null)}>
              Cerrar
            </button>
            {estadoCuenta.saldo_deudor > 0 && (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  const emp = estadoCuenta.empresa;
                  abrirModalAbono(emp);
                }}
              >
                + Registrar Nuevo Abono
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL BASE COMPONENT (Scroll locked, centered, standard design)
// ----------------------------------------------------------------------
function Modal({
  titulo,
  icono,
  onCerrar,
  children,
  maxWidth = '580px',
}: {
  titulo: ReactNode;
  icono?: ReactNode;
  onCerrar: () => void;
  children: ReactNode;
  maxWidth?: string;
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
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {icono}
            {typeof titulo === 'string' ? <h3>{titulo}</h3> : titulo}
          </div>
          <button type="button" className={styles.closeBtn} onClick={onCerrar} aria-label="Cerrar">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
