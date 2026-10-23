/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useSesion, logout } from '@/lib/auth';
import {
  type SucursalItem,
  listarSucursales,
  crearSucursal,
  actualizarSucursal,
} from '@/lib/admin';
import { ApiError } from '@/lib/api';
import {
  IconBolt,
  IconStore,
  IconUsers,
  IconInventory,
  IconAdd,
  IconSearch,
  IconClose,
  IconMenu,
} from '@/components/Icons';
import { Sidebar } from '@/components/Sidebar';
import styles from './sucursales.module.css';

export default function SucursalesPage() {
  const router = useRouter();
  const { autenticado, perfil } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [sucursales, setSucursales] = useState<SucursalItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'matriz' | 'sucursal'>('todas');

  // Modales
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState<SucursalItem | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Campos formulario
  const [formNombre, setFormNombre] = useState('');
  const [formEsMatriz, setFormEsMatriz] = useState(false);
  const [formDireccion, setFormDireccion] = useState('');
  // Clave de los folios (NV-MAT-000124). Vacía al crear: la base propone una.
  const [formClave, setFormClave] = useState('');

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
      const data = await listarSucursales();
      setSucursales(data ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar sucursales');
    } finally {
      setCargando(false);
    }
  }

  function abrirCrear() {
    setFormNombre('');
    setFormEsMatriz(false);
    setFormDireccion('');
    setFormClave('');
    setModalCrear(true);
  }

  function abrirEditar(s: SucursalItem) {
    setFormNombre(s.nombre);
    setFormEsMatriz(s.es_matriz);
    setFormDireccion(s.direccion ?? '');
    setFormClave(s.clave ?? '');
    setModalEditar(s);
  }

  function claveInvalida(clave: string): boolean {
    return clave !== '' && !/^[A-Za-z0-9]{2,6}$/.test(clave);
  }

  async function handleCrear(e: FormEvent) {
    e.preventDefault();
    if (!formNombre.trim()) {
      alert('Ingresa el nombre de la sucursal');
      return;
    }
    if (claveInvalida(formClave.trim())) {
      alert('La clave debe tener de 2 a 6 letras o números');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await crearSucursal({
        nombre: formNombre.trim(),
        es_matriz: formEsMatriz,
        direccion: formDireccion.trim() || undefined,
        clave: formClave.trim().toUpperCase() || undefined,
      });
      setModalCrear(false);
      setExito(`Sucursal "${formNombre.trim()}" agregada exitosamente.`);
      setTimeout(() => setExito(null), 4000);
      await cargar();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error al crear sucursal');
    } finally {
      setGuardando(false);
    }
  }

  async function handleEditar(e: FormEvent) {
    e.preventDefault();
    if (!modalEditar) return;
    if (!formNombre.trim()) {
      alert('Ingresa el nombre de la sucursal');
      return;
    }
    const clave = formClave.trim().toUpperCase();
    if (!clave || claveInvalida(clave)) {
      alert('La clave debe tener de 2 a 6 letras o números');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await actualizarSucursal(modalEditar.id, {
        nombre: formNombre.trim(),
        es_matriz: formEsMatriz,
        direccion: formDireccion.trim(),
        // Solo si cambió: la base rechaza cambiarla si ya hay folios con ella.
        ...(clave !== modalEditar.clave ? { clave } : {}),
      });
      setModalEditar(null);
      setExito(`Sucursal "${formNombre.trim()}" actualizada exitosamente.`);
      setTimeout(() => setExito(null), 4000);
      await cargar();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error al actualizar sucursal');
    } finally {
      setGuardando(false);
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
          <button className={styles.btnPrimary} onClick={salir}>Salir</button>
        </div>
      </div>
    );
  }

  const sucursalesFiltradas = sucursales.filter((s) => {
    const q = busqueda.toLowerCase().trim();
    const matchBusqueda =
      !q ||
      s.nombre.toLowerCase().includes(q) ||
      (s.direccion ?? '').toLowerCase().includes(q);

    if (!matchBusqueda) return false;

    if (filtroTipo === 'matriz') return s.es_matriz;
    if (filtroTipo === 'sucursal') return !s.es_matriz;
    return true;
  });

  const totalSucursales = sucursales.length;
  const matriz = sucursales.find((s) => s.es_matriz);
  const totalEmpleados = sucursales.reduce((acc, s) => acc + (s.empleados_count ?? 0), 0);

  return (
    <div className={styles.layout}>
      <Sidebar active="sucursales" menuAbierto={menuAbierto} onCerrarMenu={() => setMenuAbierto(false)} />

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
              <span className={styles.breadcrumbActive}>Sucursales</span>
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

          {exito && (
            <div className={styles.successBanner} role="status">
              <span>✓ {exito}</span>
              <button className={styles.btnSecondary} onClick={() => setExito(null)}>
                Cerrar
              </button>
            </div>
          )}

          {/* Stat Cards */}
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Total de Sucursales</span>
                <IconStore style={{ color: 'var(--primary)' }} />
              </div>
              <div className={`${styles.statValue} mono`}>{totalSucursales}</div>
              <div className={styles.statSub}>Puntos de venta registrados</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Sucursal Matriz</span>
                <IconBolt style={{ color: '#f59e0b' }} />
              </div>
              <div className={styles.statValue} style={{ fontSize: '18px', color: '#f59e0b' }}>
                {matriz ? matriz.nombre : 'No designada'}
              </div>
              <div className={styles.statSub}>
                {matriz?.direccion || 'Centro principal de operaciones'}
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Personal Asignado</span>
                <IconUsers style={{ color: 'var(--secondary)' }} />
              </div>
              <div className={`${styles.statValue} mono`}>{totalEmpleados}</div>
              <div className={styles.statSub}>Trabajadores en sucursales</div>
            </div>
          </section>

          {/* Bento Card Tabla */}
          <section className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <IconStore style={{ color: 'var(--primary)' }} />
                <span>Gestión de Sucursales ({sucursalesFiltradas.length})</span>
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className={styles.btnSecondary} onClick={() => void cargar()} disabled={cargando}>
                  Actualizar
                </button>
                <button className={styles.btnPrimary} onClick={abrirCrear}>
                  <IconAdd style={{ width: '14px', height: '14px' }} />
                  <span>Nueva Sucursal</span>
                </button>
              </div>
            </div>

            <div className={styles.toolbar}>
              <div className={styles.filterGroup}>
                <button
                  className={`${styles.filterBtn} ${filtroTipo === 'todas' ? styles.filterBtnActive : ''}`}
                  onClick={() => setFiltroTipo('todas')}
                >
                  Todas ({sucursales.length})
                </button>
                <button
                  className={`${styles.filterBtn} ${filtroTipo === 'matriz' ? styles.filterBtnActive : ''}`}
                  onClick={() => setFiltroTipo('matriz')}
                >
                  Matriz ({sucursales.filter((s) => s.es_matriz).length})
                </button>
                <button
                  className={`${styles.filterBtn} ${filtroTipo === 'sucursal' ? styles.filterBtnActive : ''}`}
                  onClick={() => setFiltroTipo('sucursal')}
                >
                  Otras Tiendas ({sucursales.filter((s) => !s.es_matriz).length})
                </button>
              </div>

              <div className={styles.searchBox}>
                <span className={styles.searchIcon}><IconSearch /></span>
                <input
                  className={styles.searchInput}
                  placeholder="Buscar sucursal o dirección…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.tableScroll}>
              {cargando ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Cargando catálogo de sucursales…
                </div>
              ) : sucursalesFiltradas.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  {sucursales.length === 0
                    ? 'No hay sucursales registradas en el sistema.'
                    : 'No se encontraron sucursales con ese criterio de búsqueda.'}
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Sucursal</th>
                      <th>Tipo</th>
                      <th>Dirección</th>
                      <th style={{ textAlign: 'center' }}>Empleados</th>
                      <th>Fecha de Registro</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sucursalesFiltradas.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className={`${styles.storeAvatar} ${s.es_matriz ? styles.storeAvatarMatriz : ''}`}>
                              <IconStore />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
                                {s.nombre}
                              </div>
                              <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {s.clave ? `Folios: NV-${s.clave}-000001` : `ID: ${s.id.substring(0, 8)}…`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {s.es_matriz ? (
                            <span className={styles.badgeMatriz}>★ Matriz Principal</span>
                          ) : (
                            <span className={styles.badgeSucursal}>Sucursal Estándar</span>
                          )}
                        </td>
                        <td>
                          <span style={{ color: s.direccion ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: s.direccion ? 'normal' : 'italic' }}>
                            {s.direccion || 'Sin dirección registrada'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={styles.badgeCount}>
                            <IconUsers style={{ width: '12px', height: '12px' }} />
                            <span>{s.empleados_count ?? 0}</span>
                          </span>
                        </td>
                        <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                          {s.created_at ? new Date(s.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className={styles.btnAction}
                            onClick={() => abrirEditar(s)}
                          >
                            Editar
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

      {/* Modal: Crear Sucursal */}
      {modalCrear && (
        <div className={styles.overlay} onClick={() => !guardando && setModalCrear(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCrear}>
              <div className={styles.modalHeader}>
                <h3>Registrar Nueva Sucursal</h3>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setModalCrear(false)}
                  disabled={guardando}
                >
                  <IconClose />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Nombre de la Sucursal *</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Ej. Sucursal Poniente, Tienda Centro..."
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    required
                    autoFocus
                  />
                  <span className={styles.helperText}>
                    Este es el nombre visible en tickets, ventas e inventario.
                  </span>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Clave para folios</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Opcional, ej. PON"
                    maxLength={6}
                    value={formClave}
                    onChange={(e) => setFormClave(e.target.value.toUpperCase())}
                  />
                  <span className={styles.helperText}>
                    De 2 a 6 letras o números. Los tickets de esta sucursal saldrán como
                    NV-{formClave.trim() || 'CLAVE'}-000001. Si la dejas vacía, se toma del nombre.
                  </span>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Dirección / Ubicación</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Calle, número, colonia, código postal y referencias…"
                    value={formDireccion}
                    onChange={(e) => setFormDireccion(e.target.value)}
                  />
                </div>

                <label className={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={formEsMatriz}
                    onChange={(e) => setFormEsMatriz(e.target.checked)}
                  />
                  <div className={styles.checkboxContent}>
                    <span className={styles.checkboxTitle}>Designar como Sucursal Matriz</span>
                    <span className={styles.checkboxSubtitle}>
                      Solo puede existir una matriz principal. Si se activa, reemplazará a la matriz actual.
                    </span>
                  </div>
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setModalCrear(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={guardando}
                >
                  {guardando ? 'Guardando…' : 'Crear Sucursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Sucursal */}
      {modalEditar && (
        <div className={styles.overlay} onClick={() => !guardando && setModalEditar(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleEditar}>
              <div className={styles.modalHeader}>
                <h3>Editar Sucursal: {modalEditar.nombre}</h3>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setModalEditar(null)}
                  disabled={guardando}
                >
                  <IconClose />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Nombre de la Sucursal *</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Clave para folios *</label>
                  <input
                    type="text"
                    className={styles.input}
                    maxLength={6}
                    value={formClave}
                    onChange={(e) => setFormClave(e.target.value.toUpperCase())}
                    required
                  />
                  <span className={styles.helperText}>
                    Tickets: NV-{formClave.trim() || 'CLAVE'}-000001. Una vez que la sucursal emite
                    folios con su clave, ya no se puede cambiar.
                  </span>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Dirección / Ubicación</label>
                  <textarea
                    className={styles.textarea}
                    value={formDireccion}
                    onChange={(e) => setFormDireccion(e.target.value)}
                  />
                </div>

                <label className={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={formEsMatriz}
                    onChange={(e) => setFormEsMatriz(e.target.checked)}
                  />
                  <div className={styles.checkboxContent}>
                    <span className={styles.checkboxTitle}>Designar como Sucursal Matriz</span>
                    <span className={styles.checkboxSubtitle}>
                      {formEsMatriz
                        ? 'Esta sucursal es actualmente la matriz principal.'
                        : 'Al marcarla como matriz, se desmarcará la matriz previa automáticamente.'}
                    </span>
                  </div>
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setModalEditar(null)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={guardando}
                >
                  {guardando ? 'Guardando…' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
