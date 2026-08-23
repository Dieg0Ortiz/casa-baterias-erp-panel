with open('src/app/compras/page.tsx', 'r') as f:
    c = f.read()

c = c.replace("}, [autenticado, perfil]);", "    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [autenticado, perfil]);")
with open('src/app/compras/page.tsx', 'w') as f:
    f.write(c)
