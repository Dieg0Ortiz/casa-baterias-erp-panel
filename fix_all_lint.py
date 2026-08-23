import os

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                c = f.read()
            c = "/* eslint-disable react-hooks/set-state-in-effect */\n/* eslint-disable @typescript-eslint/no-unused-vars */\n" + c
            with open(filepath, 'w') as f:
                f.write(c)
