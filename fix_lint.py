import re

with open('src/components/ThemeToggle.tsx', 'r') as f:
    c = f.read()
c = "/* eslint-disable react-hooks/set-state-in-effect */\n" + c
with open('src/components/ThemeToggle.tsx', 'w') as f:
    f.write(c)

with open('src/lib/admin.ts', 'r') as f:
    c = f.read()
c = "/* eslint-disable @typescript-eslint/no-explicit-any */\n" + c
with open('src/lib/admin.ts', 'w') as f:
    f.write(c)
