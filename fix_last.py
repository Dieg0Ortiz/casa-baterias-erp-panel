with open('src/app/cascos/page.tsx', 'r') as f:
    c = f.read()
c = c.replace('Da clic en "Registrar Intercambio" para comenzar.', 'Da clic en &quot;Registrar Intercambio&quot; para comenzar.')
with open('src/app/cascos/page.tsx', 'w') as f:
    f.write(c)

with open('src/app/compras/nueva/page.tsx', 'r') as f:
    c = f.read()
c = c.replace('catch (err: any) {', 'catch (err) {')
with open('src/app/compras/nueva/page.tsx', 'w') as f:
    f.write(c)

