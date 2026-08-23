import os

with open('src/app/cascos/page.tsx', 'r') as f:
    c = f.read()

# Replace early return
old_return = """
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
"""

c = c.replace(old_return, "")

# Insert early return before 'return (' for main component
main_return = """  return (
    <div className={styles.layout}>"""

new_return = """
  if (!autenticado) return null;

  if (perfil?.rol !== 'administrador') {
    return (
      <div className={styles.layout}>
        <div style={{ margin: 'auto', textAlign: 'center', padding: '40px' }}>
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

  return (
    <div className={styles.layout}>"""

c = c.replace(main_return, new_return)

# Fix quotes
c = c.replace('Da clic en "Registrar Intercambio" para comenzar.', 'Da clic en &quot;Registrar Intercambio&quot; para comenzar.')

with open('src/app/cascos/page.tsx', 'w') as f:
    f.write(c)
