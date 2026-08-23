with open('src/app/compras/nueva/page.tsx', 'r') as f:
    c = f.read()
c = c.replace("catch (err: any) {", "catch (err) {")
with open('src/app/compras/nueva/page.tsx', 'w') as f:
    f.write(c)
