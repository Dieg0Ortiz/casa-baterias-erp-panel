'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { logout, useSesion } from '@/lib/auth';
import {
  type Empleado,
  actualizarUsuario,
  crearUsuario,
  listarEmpleados,
} from '@/lib/admin';
import {
  type Sucursal,
  listarSucursales,
} from '@/lib/catalogo';
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
  IconUserPlus,
  IconRefresh,
} from '@/components/Icons';
import { Sidebar } from '@/components/Sidebar';
import styles from './usuarios.module.css';

function mensajeError(e: unknown): string {
  return e instanceof ApiError
    ? e.message
    : 'Ocurrió un error. Intenta de nuevo.';
}

export default function UsuariosPage() {
  const router = useRouter();
  const { autenticado, perfil } = useSesion();

  const [usuarios, setUsuarios] = useState<Empleado[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<'todos' | 'trabajador' | 'administrador'>('todos');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [usuarioAEditar, setUsuarioAEditar] = useState<Empleado | null>(null);

  useEffect(() => {
    if (!autenticado) router.replace('/login');
  }, [autenticado, router]);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [datosUsuarios, datosSucursales] = await Promise.all([
        listarEmpleados(),
        listarSucursales().catch(() => []),
      ]);
      setUsuarios(datosUsuarios);
      setSucursales(datosSucursales);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (autenticado && perfil?.rol === 'administrador') {
      cargar();
    }
  }, [autenticado, perfil]);

  if (!autenticado) return null;

  if (perfil?.rol !== 'administrador') {
    return (
      <div className={styles.lockedPage}>
        <div className={styles.lockedCard}>
          <h1>Acceso restringido</h1>
          <p>
            Este panel es solo para administradores. Tu usuario tiene el rol{' '}
            <strong>trabajador</strong> y debe usar la app de ventas.
          </p>
          <button className={styles.btnPrimarySm} onClick={() => { logout(); router.replace('/login'); }}>
            Salir
          </button>
        </div>
      </div>
    );
  }

  function salir() {
    logout();
    router.replace('/login');
    router.refresh();
  }

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      if (filtroRol !== 'todos' && u.rol !== filtroRol) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const matchNombre = u.nombre_completo.toLowerCase().includes(q);
        const matchEmail = (u.email ?? '').toLowerCase().includes(q);
        const matchSucursal = (u.sucursal ?? '').toLowerCase().includes(q);
        if (!matchNombre && !matchEmail && !matchSucursal) return false;
      }
      return true;
    });
  }, [usuarios, filtroRol, busqueda]);

  const totalTrabajadores = usuarios.filter((u) => u.rol === 'trabajador').length;
  const totalAdmins = usuarios.filter((u) => u.rol === 'administrador').length;
  const totalActivos = usuarios.filter((u) => u.activo).length;

  return (
    <div className={styles.layout}>
      {/* Backdrop móvil */}
      <Sidebar active="usuarios" menuAbierto={menuAbierto} onCerrarMenu={() => setMenuAbierto(false)} />

      {/* Main Wrapper */}
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
              <span className={styles.breadcrumbActive}>Trabajadores y Usuarios</span>
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

          {/* Tarjetas KPI */}
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Total Empleados</span>
                <IconUsers style={{ color: 'var(--primary)' }} />
              </div>
              <div className={styles.statValue} style={{ color: 'var(--primary)' }}>
                {usuarios.length}
              </div>
              <div className={styles.statHint}>{totalActivos} con acceso activo</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Trabajadores</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>POS</span>
              </div>
              <div className={styles.statValue} style={{ color: '#0284c7' }}>
                {totalTrabajadores}
              </div>
              <div className={styles.statHint}>Operadores de mostrador y ventas</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Administradores</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#9333ea' }}>ADMIN</span>
              </div>
              <div className={styles.statValue} style={{ color: '#9333ea' }}>
                {totalAdmins}
              </div>
              <div className={styles.statHint}>Acceso total al panel central</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Sucursales</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>RED</span>
              </div>
              <div className={styles.statValue} style={{ color: '#16a34a' }}>
                {sucursales.length}
              </div>
              <div className={styles.statHint}>Puntos de venta configurados</div>
            </div>
          </section>

          {/* Bento Card: Tabla de Usuarios */}
          <section className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <IconUsers style={{ color: 'var(--primary)' }} />
                <span>Personal y Cuentas de Usuario ({usuariosFiltrados.length})</span>
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className={styles.btnSecondary}
                  onClick={cargar}
                  disabled={cargando}
                >
                  <IconRefresh />
                  <span>Actualizar</span>
                </button>
                <button
                  className={styles.btnPrimarySm}
                  onClick={() => setModalCrearAbierto(true)}
                >
                  <IconUserPlus />
                  <span>+ Nuevo Trabajador</span>
                </button>
              </div>
            </div>

            {/* Toolbar con filtros y buscador */}
            <div className={styles.toolbar}>
              <div className={styles.filterGroup}>
                <button
                  type="button"
                  className={`${styles.filterBtn} ${filtroRol === 'todos' ? styles.filterBtnActive : ''}`}
                  onClick={() => setFiltroRol('todos')}
                >
                  Todos ({usuarios.length})
                </button>
                <button
                  type="button"
                  className={`${styles.filterBtn} ${filtroRol === 'trabajador' ? styles.filterBtnActive : ''}`}
                  onClick={() => setFiltroRol('trabajador')}
                  style={{ color: filtroRol === 'trabajador' ? '#0284c7' : undefined }}
                >
                  Trabajadores ({totalTrabajadores})
                </button>
                <button
                  type="button"
                  className={`${styles.filterBtn} ${filtroRol === 'administrador' ? styles.filterBtnActive : ''}`}
                  onClick={() => setFiltroRol('administrador')}
                  style={{ color: filtroRol === 'administrador' ? '#9333ea' : undefined }}
                >
                  Administradores ({totalAdmins})
                </button>
              </div>

              <div className={styles.searchBox}>
                <IconSearch className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, correo, sucursal…"
                />
              </div>
            </div>

            {/* Tabla */}
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '32%' }}>Empleado</th>
                    <th style={{ width: '18%' }}>Rol de Acceso</th>
                    <th style={{ width: '22%' }}>Sucursal Asignada</th>
                    <th style={{ width: '14%', textAlign: 'center' }}>Estado</th>
                    <th style={{ width: '14%', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        Cargando trabajadores y usuarios…
                      </td>
                    </tr>
                  ) : usuariosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No se encontraron usuarios con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    usuariosFiltrados.map((u) => {
                      const iniciales = u.nombre_completo
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0].toUpperCase())
                        .join('');

                      return (
                        <tr key={u.id}>
                          <td>
                            <div className={styles.avatarWrapper}>
                              <div className={styles.avatar}>{iniciales || 'U'}</div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {u.nombre_completo}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  {u.email ?? 'Sin correo registrado'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {u.rol === 'administrador' ? (
                              <span className={styles.badgeRolAdmin}>Administrador</span>
                            ) : (
                              <span className={styles.badgeRolTrabajador}>Trabajador</span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                              {u.sucursal ?? (u.rol === 'administrador' ? 'Todas (Central)' : 'Sin asignar')}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {u.activo ? (
                              <span className={styles.badgeActivo}>Activo</span>
                            ) : (
                              <span className={styles.badgeInactivo}>Inactivo</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className={styles.btnSecondary}
                              onClick={() => setUsuarioAEditar(u)}
                            >
                              Editar / Clave
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Modal: Crear Nuevo Usuario */}
      {modalCrearAbierto && (
        <ModalCrearUsuario
          sucursales={sucursales}
          onCerrar={() => setModalCrearAbierto(false)}
          onGuardado={async () => {
            setModalCrearAbierto(false);
            await cargar();
          }}
        />
      )}

      {/* Modal: Editar Usuario / Cambiar Contraseña */}
      {usuarioAEditar && (
        <ModalEditarUsuario
          usuario={usuarioAEditar}
          sucursales={sucursales}
          onCerrar={() => setUsuarioAEditar(null)}
          onGuardado={async () => {
            setUsuarioAEditar(null);
            await cargar();
          }}
        />
      )}
    </div>
  );
}

function ModalCrearUsuario({
  sucursales,
  onCerrar,
  onGuardado,
}: {
  sucursales: Sucursal[];
  onCerrar: () => void;
  onGuardado: () => Promise<void>;
}) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'trabajador' | 'administrador'>('trabajador');
  const [sucursalId, setSucursalId] = useState(sucursales[0]?.id ?? '');
  const [listaSucursales, setListaSucursales] = useState<Sucursal[]>(sucursales);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sucursales.length > 0) {
      setListaSucursales(sucursales);
      if (!sucursalId && sucursales.length > 0) {
        setSucursalId(sucursales[0].id);
      }
    } else {
      listarSucursales()
        .then((sucs) => {
          setListaSucursales(sucs);
          if (sucs.length > 0 && !sucursalId) {
            setSucursalId(sucs[0].id);
          }
        })
        .catch(() => {});
    }
  }, [sucursales, sucursalId]);

  function generarPasswordAleatoria() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    setMostrarPassword(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim()) {
      setError('Ingresa el nombre y apellido del trabajador.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await crearUsuario({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim().toLowerCase(),
        password,
        rol,
        sucursal_id: sucursalId || undefined,
      });
      await onGuardado();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Crear Nuevo Perfil de Usuario</h3>
          <button className={styles.closeBtn} onClick={onCerrar}>
            <IconClose />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Nombre *</span>
              <input
                className={styles.input}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Carlos"
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Apellido *</span>
              <input
                className={styles.input}
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Ej. Pérez"
                required
              />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Correo Electrónico (Login) *</span>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@casabaterias.com"
              required
            />
            <span className={styles.helperText}>
              Este correo será utilizado por el trabajador para iniciar sesión en la app o panel.
            </span>
          </label>

          <label className={styles.field}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className={styles.fieldLabel}>Contraseña de Acceso *</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                onClick={generarPasswordAleatoria}
              >
                Generar contraseña segura
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type={mostrarPassword ? 'text' : 'password'}
                className={styles.input}
                style={{ flex: 1 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setMostrarPassword(!mostrarPassword)}
              >
                {mostrarPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </label>

          <div className={styles.formRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Rol en el Sistema *</span>
              <select
                className={styles.select}
                value={rol}
                onChange={(e) => setRol(e.target.value as 'trabajador' | 'administrador')}
              >
                <option value="trabajador">Trabajador (App Móvil / POS)</option>
                <option value="administrador">Administrador (Panel Central)</option>
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Sucursal Asignada</span>
              <select
                className={styles.select}
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
              >
                <option value="">-- Sin sucursal fija --</option>
                {listaSucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} {s.es_matriz ? '(Matriz)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && <p className={styles.errorBanner}>{error}</p>}

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimarySm} disabled={guardando}>
              {guardando ? 'Creando Usuario…' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalEditarUsuario({
  usuario,
  sucursales,
  onCerrar,
  onGuardado,
}: {
  usuario: Empleado;
  sucursales: Sucursal[];
  onCerrar: () => void;
  onGuardado: () => Promise<void>;
}) {
  const [nombreCompleto, setNombreCompleto] = useState(usuario.nombre_completo);
  const [rol, setRol] = useState<'trabajador' | 'administrador'>(usuario.rol);
  const [sucursalId, setSucursalId] = useState(usuario.sucursal_id ?? '');
  const [activo, setActivo] = useState(usuario.activo);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [listaSucursales, setListaSucursales] = useState<Sucursal[]>(sucursales);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sucursales.length > 0) {
      setListaSucursales(sucursales);
    } else {
      listarSucursales()
        .then((sucs) => setListaSucursales(sucs))
        .catch(() => {});
    }
  }, [sucursales]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombreCompleto.trim()) {
      setError('El nombre completo no puede estar vacío.');
      return;
    }
    if (nuevaPassword && nuevaPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await actualizarUsuario(usuario.id, {
        nombre: nombreCompleto.trim(),
        rol,
        sucursal_id: sucursalId || null,
        activo,
        password: nuevaPassword.trim() || undefined,
      });
      await onGuardado();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Editar Perfil de {usuario.nombre_completo}</h3>
          <button className={styles.closeBtn} onClick={onCerrar}>
            <IconClose />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Nombre Completo *</span>
            <input
              className={styles.input}
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Correo Electrónico (No editable)</span>
            <input
              className={styles.input}
              value={usuario.email ?? '—'}
              disabled
              style={{ opacity: 0.65, cursor: 'not-allowed' }}
            />
          </label>

          <div className={styles.formRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Rol de Acceso</span>
              <select
                className={styles.select}
                value={rol}
                onChange={(e) => setRol(e.target.value as 'trabajador' | 'administrador')}
              >
                <option value="trabajador">Trabajador</option>
                <option value="administrador">Administrador</option>
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Sucursal Asignada</span>
              <select
                className={styles.select}
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
              >
                <option value="">-- Sin sucursal fija --</option>
                {listaSucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} {s.es_matriz ? '(Matriz)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Estado de la Cuenta</span>
            <select
              className={styles.select}
              value={activo ? 'activo' : 'inactivo'}
              onChange={(e) => setActivo(e.target.value === 'activo')}
            >
              <option value="activo">Activo (Permite iniciar sesión)</option>
              <option value="inactivo">Inactivo / Bloqueado (Acceso revocado)</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Restablecer Contraseña (Opcional)</span>
            <input
              type="password"
              className={styles.input}
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              placeholder="Dejar en blanco para conservar la actual"
            />
            <span className={styles.helperText}>
              Escribe una nueva contraseña solo si deseas cambiarla.
            </span>
          </label>

          {error && <p className={styles.errorBanner}>{error}</p>}

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onCerrar}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimarySm} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
