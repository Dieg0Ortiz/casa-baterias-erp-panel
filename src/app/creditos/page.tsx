'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
import { ThemeToggle } from '@/components/ThemeToggle';
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
      {/* Backdrop móvil */}
      {menuAbierto && (
        <div className={styles.sidebarBackdrop} onClick={() => setMenuAbierto(false)} aria-hidden="true" />
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
          <button className={styles.sidebarCloseBtn} onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú">
            <IconClose />
          </button>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSection}>
            <div className={styles.navSectionLabel}>Operaciones</div>
            <Link href="/" className={styles.navLink}>
              <IconDashboard className={styles.navIcon} />
              <span>Resumen</span>
            </Link>
            <Link href="/inventario" className={styles.navLink}>
              <IconInventory className={styles.navIcon} />
              <span>Inventario</span>
            </Link>
            <Link href="/catalogo" className={styles.navLink}>
              <IconCatalog className={styles.navIcon} />
              <span>Catálogo</span>
            </Link>
            <Link href="/cascos" className={styles.navLink}>
              <IconCasco className={styles.navIcon} />
              <span>Cascos & Trueques</span>
            </Link>
            <Link href="/compras" className={styles.navLink}>
              <IconReceipt className={styles.navIcon} />
              <span>Compras</span>
            </Link>
            <Link href="/creditos" className={`${styles.navLink} ${styles.navLinkActive}`}>
              <IconBuilding className={styles.navIcon} />
              <span>Créditos Empresariales</span>
            </Link>
          </div>

          <div className={styles.navSection}>
            <div className={styles.navSectionLabel}>Administración</div>
            <Link href="/reportes" className={styles.navLink}>
              <IconReports className={styles.navIcon} />
              <span>Reportes & Finanzas</span>
            </Link>
            <Link href="/usuarios" className={styles.navLink}>
              <IconUsers className={styles.navIcon} />
              <span>Personal</span>
            </Link>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {(perfil?.nombre_completo ?? 'A')[0].toUpperCase()}
            </div>
            <div>
              <p className={styles.userName}>{perfil?.nombre_completo ?? 'Usuario'}</p>
              <p className={styles.userRole}>{perfil?.rol ?? 'Administrador'}</p>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={() => logout()}>
            <IconLogout />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button className={styles.menuToggleBtn} onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">
              <IconMenu />
            </button>
            <div>
              <h2 className={styles.title}>Créditos y Cuentas por Cobrar</h2>
              <p className={styles.subtitle}>Gestión de empresas con crédito de baterías, plazos y cobros pendientes</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <ThemeToggle />
            <button className={styles.btnSecondary} onClick={() => cargarDatos()} disabled={cargando}>
              <IconRefresh />
              <span>Actualizar</span>
            </button>
            <button className={styles.btnPrimary} onClick={() => abrirModalEmpresa()}>
              <IconBuilding />
              <span>+ Nueva Empresa</span>
            </button>
          </div>
        </div>

        {error && (
          <div className={`${styles.alertBox} ${styles.alertError}`} style={{ marginBottom: 20 }}>
            <span>{error}</span>
          </div>
        )}

        {/* KPIs */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Total Deuda por Cobrar</span>
            <span className={styles.kpiValue} style={{ color: kpis.totalPorCobrar > 0 ? 'var(--primary)' : undefined }}>
              {formatearDinero(kpis.totalPorCobrar)}
            </span>
            <span className={styles.kpiSubtitle}>{kpis.empresasConDeuda} empresas con saldo activo</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Baterías Entregadas a Crédito</span>
            <span className={styles.kpiValue} style={{ color: '#3b82f6' }}>
              {kpis.totalBateriasDebidas} uds
            </span>
            <span className={styles.kpiSubtitle}>Pendientes de liquidación total</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Facturas Vencidas</span>
            <span className={styles.kpiValue} style={{ color: kpis.facturasVencidas > 0 ? '#ef4444' : '#10b981' }}>
              {kpis.facturasVencidas}
            </span>
            <span className={styles.kpiSubtitle}>Plazo de días superado</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Empresas Registradas</span>
            <span className={styles.kpiValue}>{kpis.totalEmpresas}</span>
            <span className={styles.kpiSubtitle}>Clientes corporativos en catálogo</span>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabsContainer}>
          <button
            className={`${styles.tabBtn} ${pestaña === 'empresas' ? styles.tabBtnActive : ''}`}
            onClick={() => setPestaña('empresas')}
          >
            <IconBuilding />
            <span>Empresas con Línea de Crédito</span>
            <span className={styles.tabBadge}>{empresas.length}</span>
          </button>

          <button
            className={`${styles.tabBtn} ${pestaña === 'cuentas' ? styles.tabBtnActive : ''}`}
            onClick={() => setPestaña('cuentas')}
          >
            <IconReceipt />
            <span>Ventas a Crédito (Cuentas por Cobrar)</span>
            <span className={styles.tabBadge}>{ventasCredito.filter((v) => v.estado !== 'pagado').length}</span>
          </button>
        </div>

        {/* Controles y Búsqueda */}
        <div className={styles.controlsBar}>
          <div className={styles.searchBox}>
            <IconSearch />
            <input
              type="text"
              placeholder={pestaña === 'empresas' ? 'Buscar por empresa, RFC o contacto...' : 'Buscar por folio, empresa o chofer...'}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <IconClose />
              </button>
            )}
          </div>

          {pestaña === 'cuentas' && (
            <div className={styles.filterGroup}>
              <select
                className={styles.select}
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as any)}
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="parcial">Con Abonos (Parcial)</option>
                <option value="vencido">⚠️ Vencidas</option>
                <option value="pagado">Pagadas</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Empresas */}
        {pestaña === 'empresas' && (
          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Contacto & Teléfono</th>
                    <th>Plazo</th>
                    <th>Límite de Crédito</th>
                    <th>Saldo Deudor</th>
                    <th>Baterías Debidas</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {empresasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className={styles.emptyState}>
                          <IconBuilding />
                          <p>{cargando ? 'Cargando empresas...' : 'No hay empresas registradas con crédito.'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    empresasFiltradas.map((emp) => {
                      const deuda = emp.saldo_deudor || 0;
                      return (
                        <tr key={emp.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.nombre}</div>
                            {emp.rfc && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>RFC: {emp.rfc}</div>
                            )}
                          </td>
                          <td>
                            <div>{emp.contacto_nombre || '—'}</div>
                            {emp.telefono && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{emp.telefono}</div>
                            )}
                          </td>
                          <td>
                            <span className={styles.badge} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                              {emp.dias_credito} días
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                            {emp.limite_credito > 0 ? formatearDinero(emp.limite_credito) : 'Sin límite'}
                          </td>
                          <td>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono, monospace)',
                                fontWeight: 700,
                                fontSize: '0.9375rem',
                                color: deuda > 0 ? 'var(--primary)' : 'var(--text-secondary)',
                              }}
                            >
                              {formatearDinero(deuda)}
                            </span>
                            {emp.tiene_vencidas && (
                              <span className={`${styles.badge} ${styles.badgeDanger}`} style={{ marginLeft: 8 }}>
                                ⚠️ Vencida
                              </span>
                            )}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {emp.total_baterias_debidas || 0} uds
                          </td>
                          <td>
                            <span className={`${styles.badge} ${emp.activo ? styles.badgeSuccess : styles.badgeMuted}`}>
                              {emp.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                className={styles.btnSecondary}
                                style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                                onClick={() => verEstadoCuenta(emp.id)}
                              >
                                Estado de Cuenta
                              </button>
                              {deuda > 0 && (
                                <button
                                  className={styles.btnPrimary}
                                  style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                                  onClick={() => abrirModalAbono(emp)}
                                >
                                  + Abonar
                                </button>
                              )}
                              <button
                                className={styles.btnSecondary}
                                style={{ padding: '5px 8px', fontSize: '0.75rem' }}
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
          </div>
        )}

        {/* Tab 2: Ventas a Crédito (Cuentas por Cobrar) */}
        {pestaña === 'cuentas' && (
          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Folio & Fecha</th>
                    <th>Empresa</th>
                    <th>Vencimiento</th>
                    <th>Chofer / Vale</th>
                    <th>Artículos Entregados</th>
                    <th>Total Venta</th>
                    <th>Saldo Pendiente</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div className={styles.emptyState}>
                          <IconReceipt />
                          <p>{cargando ? 'Cargando ventas a crédito...' : 'No hay cuentas por cobrar con los filtros seleccionados.'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    ventasFiltradas.map((item) => {
                      const items = item.venta?.venta_items || [];
                      return (
                        <tr key={item.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                              {item.venta?.folio || 'V-CREDITO'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
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
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
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
                              <span className={`${styles.badge} ${styles.badgeDanger}`}>⚠️ Vencida</span>
                            ) : item.estado === 'pagado' ? (
                              <span className={`${styles.badge} ${styles.badgeSuccess}`}>Pagada</span>
                            ) : (
                              <span className={`${styles.badge} ${styles.badgeInfo}`}>Al día</span>
                            )}
                          </td>
                          <td>
                            <div>{item.recibido_por || '—'}</div>
                            {(item.vehiculo_placas || item.folio_vale) && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                {item.vehiculo_placas ? `Placas: ${item.vehiculo_placas}` : ''}{' '}
                                {item.folio_vale ? `Vale: ${item.folio_vale}` : ''}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {items.map((vi, idx) => (
                                <div key={idx} style={{ fontSize: '0.8125rem' }}>
                                  <span style={{ fontWeight: 600 }}>{vi.cantidad}x</span>{' '}
                                  {vi.producto?.modelo || 'Batería'} ({vi.producto?.marca || ''})
                                  {vi.con_casco ? ' · Dejó casco' : ' · Sin casco'}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>
                            {formatearDinero(item.monto_total)}
                          </td>
                          <td>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono, monospace)',
                                fontWeight: 700,
                                fontSize: '0.9375rem',
                                color: item.saldo_pendiente > 0 ? 'var(--primary)' : '#10b981',
                              }}
                            >
                              {formatearDinero(item.saldo_pendiente)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`${styles.badge} ${
                                item.estado === 'pagado'
                                  ? styles.badgeSuccess
                                  : item.estado === 'parcial'
                                  ? styles.badgeWarning
                                  : item.es_vencida
                                  ? styles.badgeDanger
                                  : styles.badgeInfo
                              }`}
                            >
                              {item.estado === 'pagado'
                                ? 'Liquidado'
                                : item.estado === 'parcial'
                                ? 'Abonado'
                                : item.es_vencida
                                ? 'Vencido'
                                : 'Pendiente'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {item.saldo_pendiente > 0 && item.empresa && (
                              <button
                                className={styles.btnPrimary}
                                style={{ padding: '5px 12px', fontSize: '0.75rem' }}
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
                                Abonar / Liquidar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal Crear / Editar Empresa */}
      {modalEmpresa && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {empresaEditando ? 'Editar Empresa con Crédito' : 'Registrar Empresa con Línea de Crédito'}
              </h3>
              <button className={styles.modalCloseBtn} onClick={() => setModalEmpresa(false)}>
                <IconClose />
              </button>
            </div>
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
                    <label className={styles.label}>Plazo de Crédito (Días para pagar)</label>
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
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
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
          </div>
        </div>
      )}

      {/* Modal Registrar Abono */}
      {modalAbono && empresaAbono && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {ventaAbono ? `Registrar Pago para ${ventaAbono.venta?.folio}` : `Registrar Abono a ${empresaAbono.nombre}`}
              </h3>
              <button className={styles.modalCloseBtn} onClick={() => setModalAbono(false)}>
                <IconClose />
              </button>
            </div>
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
                      onChange={(e) => setMetodoAbono(e.target.value as any)}
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
          </div>
        </div>
      )}

      {/* Modal Estado de Cuenta Detallado */}
      {estadoCuenta && (
        <div className={styles.modalBackdrop}>
          <div className={`${styles.modal} ${styles.modalLarge}`}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Estado de Cuenta: {estadoCuenta.empresa.nombre}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {estadoCuenta.empresa.rfc ? `RFC: ${estadoCuenta.empresa.rfc} · ` : ''} Plazo:{' '}
                  {estadoCuenta.empresa.dias_credito} días
                </p>
              </div>
              <button className={styles.modalCloseBtn} onClick={() => setEstadoCuenta(null)}>
                <IconClose />
              </button>
            </div>

            <div className={styles.modalBody}>
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
                  <div style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 600 }}>
                    {estadoCuenta.empresa.limite_credito > 0
                      ? formatearDinero(estadoCuenta.empresa.limite_credito)
                      : 'Sin límite'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ventas a Crédito Totales</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{estadoCuenta.ventas.length} registros</div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginTop: 8 }}>Ventas y Baterías Adeudadas</h4>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Fecha</th>
                      <th>Vencimiento</th>
                      <th>Artículos</th>
                      <th>Monto</th>
                      <th>Saldo</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estadoCuenta.ventas.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No hay ventas a crédito registradas.
                        </td>
                      </tr>
                    ) : (
                      estadoCuenta.ventas.map((v) => (
                        <tr key={v.id}>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{v.venta?.folio}</td>
                          <td style={{ fontSize: '0.75rem' }}>{new Date(v.created_at).toLocaleDateString('es-MX')}</td>
                          <td>
                            {new Date(v.fecha_vencimiento + 'T12:00:00Z').toLocaleDateString('es-MX')}
                            {new Date(v.fecha_vencimiento + 'T12:00:00Z') < new Date() && v.estado !== 'pagado' && (
                              <span className={`${styles.badge} ${styles.badgeDanger}`} style={{ marginLeft: 4 }}>
                                Vencida
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.75rem' }}>
                            {(v.venta?.venta_items || []).map((vi, idx) => (
                              <div key={idx}>
                                {vi.cantidad}x {vi.producto?.modelo} ({vi.producto?.marca})
                              </div>
                            ))}
                          </td>
                          <td style={{ fontFamily: 'monospace' }}>{formatearDinero(v.monto_total)}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: v.saldo_pendiente > 0 ? 'var(--primary)' : '#10b981' }}>
                            {formatearDinero(v.saldo_pendiente)}
                          </td>
                          <td>
                            <span className={`${styles.badge} ${v.estado === 'pagado' ? styles.badgeSuccess : styles.badgeWarning}`}>
                              {v.estado}
                            </span>
                          </td>
                          <td>
                            {v.saldo_pendiente > 0 && (
                              <button
                                className={styles.btnPrimary}
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
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

              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginTop: 12 }}>Historial de Abonos / Pagos</h4>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Monto</th>
                      <th>Método</th>
                      <th>Referencia</th>
                      <th>Recibido Por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estadoCuenta.abonos.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No hay abonos registrados para esta empresa.
                        </td>
                      </tr>
                    ) : (
                      estadoCuenta.abonos.map((a) => (
                        <tr key={a.id}>
                          <td style={{ fontSize: '0.75rem' }}>
                            {new Date(a.created_at).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
                            +{formatearDinero(a.monto)}
                          </td>
                          <td>
                            <span className={`${styles.badge} ${styles.badgeInfo}`} style={{ textTransform: 'capitalize' }}>
                              {a.metodo_pago}
                            </span>
                          </td>
                          <td>{a.referencia || '—'}</td>
                          <td style={{ fontSize: '0.75rem' }}>{a.usuario?.nombre || 'Usuario'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setEstadoCuenta(null)}>
                Cerrar
              </button>
              {estadoCuenta.saldo_deudor > 0 && (
                <button
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
          </div>
        </div>
      )}
    </div>
  );
}
