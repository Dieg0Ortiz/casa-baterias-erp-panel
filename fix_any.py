with open('src/app/compras/nueva/page.tsx', 'r') as f:
    c = f.read()
c = c.replace("catch (err: any) {", "catch (err) {")
with open('src/app/compras/nueva/page.tsx', 'w') as f:
    f.write(c)

with open('src/app/creditos/page.tsx', 'r') as f:
    c = f.read()
c = c.replace("setMetodoAbono(e.target.value as any)", "setMetodoAbono(e.target.value as 'transferencia' | 'cheque' | 'efectivo' | 'tarjeta')")
with open('src/app/creditos/page.tsx', 'w') as f:
    f.write(c)
