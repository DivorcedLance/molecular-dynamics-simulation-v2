interface AtomData {
  id: string;
  position: [number, number, number];
  mass: number;
  charge: number;
}

interface NeighborListData {
  id: string;
  neighbors: string[];
}

interface LongRangeForcesMessageData {
  atoms: AtomData[];
  neighbors: NeighborListData[];
  G: number; // Gravitational constant
  k: number; // Coulomb constant
}

interface ForceResponseData {
  [id: string]: [number, number, number];
}

self.onmessage = (event: MessageEvent<LongRangeForcesMessageData>) => {
  const { atoms, neighbors, G, k } = event.data;

  const MIN_DISTANCE = 0.1;
  const forces: ForceResponseData = {};

  // Convertimos los datos en mapas para acceso rápido
  const atomMap = new Map<string, AtomData>(
      atoms.map(atom => [atom.id, atom])
  );

  const neighborMap = new Map<string, string[]>(
      neighbors.map(entry => [entry.id, entry.neighbors])
  );

  // Iterar sobre cada átomo y sus vecinos
  const processedPairs = new Set<string>();

  for (const atom of atoms) {
      const atomForce = forces[atom.id] || [0, 0, 0];
      const neighbors = neighborMap.get(atom.id) || [];

      for (const neighborId of neighbors) {
          const neighbor = atomMap.get(neighborId)!;

          // Generar un identificador único para el par
          const pairKey = [atom.id, neighbor.id].sort().join('-');

          // Evitar procesar pares duplicados
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          // Calcular desplazamiento y distancia
          const displacement = [
              neighbor.position[0] - atom.position[0],
              neighbor.position[1] - atom.position[1],
              neighbor.position[2] - atom.position[2],
          ];

          const r = Math.max(
              Math.sqrt(
                  displacement[0] ** 2 +
                  displacement[1] ** 2 +
                  displacement[2] ** 2
              ),
              MIN_DISTANCE
          );

          // Fuerza gravitacional
          const gravitationalForceMagnitude =
              (G * atom.mass * neighbor.mass) / (r * r);

          // Fuerza electrostática (Ley de Coulomb)
          const electrostaticForceMagnitude =
              (k * atom.charge * neighbor.charge) / (r * r);

          // Dirección de la fuerza
          const forceDirection = displacement.map(coord => coord / r);

          // Calcular las fuerzas
          const gravitationalForce = forceDirection.map(
              dir => dir * gravitationalForceMagnitude
          );

          const electrostaticForce = forceDirection.map(
              dir => dir * electrostaticForceMagnitude
          );

          // Sumar las fuerzas
          const totalForce = gravitationalForce.map(
              (gf, i) => gf + electrostaticForce[i]
          );

          // Actualizar las fuerzas de los átomos
          forces[atom.id] = atomForce.map(
              (f, i) => f + totalForce[i]
          ) as [number, number, number];

          forces[neighbor.id] = (forces[neighbor.id] || [0, 0, 0]).map(
              (f, i) => f - totalForce[i]
          ) as [number, number, number];
      }
  }

  // Enviar las fuerzas calculadas de vuelta al hilo principal
  postMessage(forces);
};

export {};
