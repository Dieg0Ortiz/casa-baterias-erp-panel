/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSesion, logout } from '@/lib/auth';
import { contarAutorizacionesPendientes } from '@/lib/admin';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  IconBolt,
  IconDashboard,
  IconCatalog,
  IconInventory,
  IconCasco,
  IconReceipt,
  IconBuilding,
  IconReports,
  IconUsers,
  IconStore,
  IconLogout,
  IconClose,
  IconClock,
} from '@/components/Icons';
import styles from './Sidebar.module.css';

export type SidebarActiveItem =
  | 'dashboard'
  | 'autorizaciones'
  | 'inventario'
  | 'catalogo'
  | 'cascos'
  | 'compras'
  | 'creditos'
  | 'reportes'
  | 'usuarios'
  | 'sucursales';

interface SidebarProps {
  active: SidebarActiveItem;
  menuAbierto?: boolean;
  onCerrarMenu?: () => void;
}

export function Sidebar({ active, menuAbierto = false, onCerrarMenu }: SidebarProps) {
  const router = useRouter();
  const { perfil } = useSesion();
  const pendientes = useAutorizacionesPendientes(perfil?.rol === 'administrador');

  function salir() {
    logout();
    router.replace('/login');
    router.refresh();
  }

  const secciones = [
    {
      titulo: 'Operaciones',
      items: [
        { href: '/', label: 'Resumen', key: 'dashboard', icon: IconDashboard },
        { href: '/autorizaciones', label: 'Autorizaciones', key: 'autorizaciones', icon: IconClock },
        { href: '/inventario', label: 'Inventario', key: 'inventario', icon: IconInventory },
        { href: '/catalogo', label: 'Catálogo', key: 'catalogo', icon: IconCatalog },
        { href: '/cascos', label: 'Cascos & Trueques', key: 'cascos', icon: IconCasco },
        { href: '/compras', label: 'Compras', key: 'compras', icon: IconReceipt },
        { href: '/creditos', label: 'Créditos Empresariales', key: 'creditos', icon: IconBuilding },
      ],
    },
    {
      titulo: 'Administración',
      items: [
        { href: '/reportes', label: 'Reportes & Finanzas', key: 'reportes', icon: IconReports },
        { href: '/usuarios', label: 'Personal', key: 'usuarios', icon: IconUsers },
        { href: '/sucursales', label: 'Sucursales', key: 'sucursales', icon: IconStore },
      ],
    },
  ];

  return (
    <>
      {menuAbierto && (
        <div
          className={styles.sidebarBackdrop}
          onClick={onCerrarMenu}
          aria-hidden="true"
        />
      )}

      <aside className={`${styles.sidebar} ${menuAbierto ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandInfo}>
            <span className={styles.brandIcon}>
              <IconBolt />
            </span>
            <div>
              <h1 className={styles.brandTitle}>Casa Baterías</h1>
              <p className={styles.brandSubtitle}>Control Central</p>
            </div>
          </div>
          {onCerrarMenu && (
            <button
              type="button"
              className={styles.sidebarCloseBtn}
              onClick={onCerrarMenu}
              aria-label="Cerrar menú"
            >
              <IconClose />
            </button>
          )}
        </div>

        <nav className={styles.nav}>
          {secciones.map((sec) => (
            <div key={sec.titulo} className={styles.navSection}>
              <div className={styles.navSectionLabel}>{sec.titulo}</div>
              {sec.items.map((item) => {
                const IconComp = item.icon;
                const isActive = active === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                    onClick={() => onCerrarMenu?.()}
                  >
                    <IconComp className={styles.navIcon} />
                    <span>{item.label}</span>
                    {item.key === 'autorizaciones' && pendientes > 0 && (
                      <span className={styles.navBadge} aria-label={`${pendientes} por autorizar`}>
                        {pendientes}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.themeToggleWrapper}>
            <ThemeToggle estilo="sidebar" />
          </div>

          <div className={styles.userRow}>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                {(perfil?.nombre_completo ?? 'A')[0].toUpperCase()}
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{perfil?.nombre_completo ?? 'Administrador'}</span>
                <span className={styles.userRole}>Administrador</span>
              </div>
            </div>
            <button
              type="button"
              className={styles.btnLogout}
              onClick={salir}
              title="Cerrar sesión"
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/** Avisa en el panel que alguna caja espera autorización. */
export const EVENTO_AUTORIZACIONES = 'autorizaciones:cambio';

function useAutorizacionesPendientes(activo: boolean): number {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    const consultar = () => {
      contarAutorizacionesPendientes()
        .then((r) => {
          if (vigente) setTotal(r.total);
        })
        .catch(() => {
          // Sin conexión: el aviso se actualiza en la siguiente vuelta.
        });
    };
    consultar();
    const intervalo = window.setInterval(consultar, 20_000);
    window.addEventListener(EVENTO_AUTORIZACIONES, consultar);
    return () => {
      vigente = false;
      window.clearInterval(intervalo);
      window.removeEventListener(EVENTO_AUTORIZACIONES, consultar);
    };
  }, [activo]);

  return activo ? total : 0;
}
