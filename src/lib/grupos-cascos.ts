/** Tarifa del proveedor por grupo de casco (hoja Villaflores, 26/05/2026). */
export const GRUPOS_CASCOS = [
  {
    id: 'grupo-1',
    nombre: 'Grupo 1 — Chico',
    baterias: ['99', '40ENL', '151R', '44B19'],
    precio: 120,
  },
  {
    id: 'grupo-2',
    nombre: 'Grupo 2 — Intermedio',
    baterias: ['22F', '26R', '42', '42R', '51R', '58', '58R'],
    precio: 165,
  },
  {
    id: 'grupo-3',
    nombre: 'Grupo 3 — Mediano',
    baterias: ['24', '24R', '34', '35', '41', '47', '48', '75', '75/86', '34/78'],
    precio: 240,
  },
  {
    id: 'grupo-4',
    nombre: 'Grupo 4 — Intergrande',
    baterias: ['27', '49', '65', '94R'],
    precio: 275,
  },
  {
    id: 'grupo-5',
    nombre: 'Grupo 5 — Grande',
    baterias: ['31T', '31P', '31RP'],
    precio: 350,
  },
  {
    id: 'grupo-6',
    nombre: 'Grupo 6 — Extra Grande',
    baterias: ['4DLT'],
    precio: 555,
  },
  {
    id: 'grupo-7',
    nombre: 'Grupo 7 — Jumbo',
    baterias: ['8D'],
    precio: 705,
  },
] as const;

export type GrupoCasco = (typeof GRUPOS_CASCOS)[number];

export const SIN_GRUPO = {
  id: 'sin-grupo',
  nombre: 'Sin grupo',
  baterias: [] as string[],
  precio: 0,
};

function compactar(valor: string): string {
  return valor.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Asigna el grupo del proveedor. "24 R" cae en 24R, "31 T-900" en 31T y
 * "151R BD" en 151R: se arman los códigos uniendo los trozos del modelo y
 * gana la coincidencia más larga, para no confundir 24 con 24R.
 */
export function grupoDeModelo(modelo: string | null | undefined): GrupoCasco | typeof SIN_GRUPO {
  const trozos = (modelo ?? '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  if (trozos.length === 0) return SIN_GRUPO;

  const candidatos: string[] = [];
  for (let i = 0; i < trozos.length; i++) {
    let junto = '';
    for (let j = i; j < trozos.length && junto.length < 12; j++) {
      junto += trozos[j];
      candidatos.push(junto);
    }
  }

  const codigos = GRUPOS_CASCOS.flatMap((grupo) =>
    grupo.baterias.map((bateria) => ({
      grupo,
      codigo: compactar(bateria),
    })),
  ).sort((a, b) => b.codigo.length - a.codigo.length);

  for (const item of codigos) {
    if (candidatos.includes(item.codigo)) return item.grupo;
  }

  return SIN_GRUPO;
}
