with open('src/app/creditos/page.tsx', 'r') as f:
    c = f.read()

c = c.replace("onChange={(e) => setMetodoAbono(e.target.value as any)}", "onChange={(e) => setMetodoAbono(e.target.value as 'transferencia' | 'cheque' | 'efectivo' | 'tarjeta')}")
with open('src/app/creditos/page.tsx', 'w') as f:
    f.write(c)
