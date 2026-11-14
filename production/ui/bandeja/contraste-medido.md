# Contraste medido: bandeja

Medición WCAG de los pares de `visual-design.md` (sección 8.2) marcados **medir**, con la regla actual de `clubTheme` sobre los 86 clubes con economía. Se repite con:

```bash
node production/ui/bandeja/contraste-diseno.mjs
```

```
9 warn / panel2: 8.18 ok
10 text / warn10%·panel: 12.00 ok
11 #1d1300 / warn: 10.44 ok
11 #1d1300 / warn cvd: 12.42 ok
12 text / warn13%·panel2: 9.87 ok
16 text / panel3: 11.34 ok
17 text / #12152b: 16.12 ok
17 dim / #12152b: 7.70 ok
21 text / panel3: 11.34 ok
24 text / panel3: 11.34 ok
25 danger / panel2: 6.38 ok
25 danger / panel3: 5.62 ok
26 text / bad16%·panel2: 10.50 ok
28 bad cvd / panel: 6.63 ok
30 text / #0d0f22: 16.98 ok
32 dim / #11132a: 7.82 ok
32 text / #11132a: 16.36 ok
39 warn / warn12%·panel: 7.28 ok
40 danger / bad16%·panel2: 5.20 ok
40 danger / panel2: 6.38 ok
41 good / panel: 9.24 ok
18 acento62%+blanco / panel [4,5]: mín 6.66 · máx 12.88 · fallan 0/86
33-34 accent-hi / fila elegida [3]: mín 5.08 · máx 9.05 · fallan 0/86
35 accent-hi / fila elegida [3]: mín 5.08 · máx 9.05 · fallan 0/86
37 accent-hi / #0a0c1b [3]: mín 6.91 · máx 14.90 · fallan 0/86
FALLAS 0
```

Resultado: los 25 pares pasan (texto ≥ 4,5:1, no texto ≥ 3:1). Ninguno queda marcado **medir**. El botón primario sobre el acento no está en esta tabla: depende del arreglo global de tinta (decisión 1) y se mide en la fase 3.
