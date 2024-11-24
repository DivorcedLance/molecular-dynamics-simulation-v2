interface AtomData {
  id: string;
  position: [number, number, number];
  bonds: string[]; // IDs de los átomos enlazados
}

interface ShortRangeForcesMessageData {
  atoms: AtomData[];
  springConstant: number;
  rotationalConstant: number;
}

interface ForceResponseData {
  [id: string]: [number, number, number];
}

self.onmessage = (event: MessageEvent<ShortRangeForcesMessageData>) => {
  const { atoms, springConstant, rotationalConstant } = event.data;

  const MIN_DISTANCE = 0.1;
  const forces: ForceResponseData = {};

  const atomMap = new Map<string, AtomData>(
      atoms.map(atom => [atom.id, atom])
  );

  // Fuerzas vibratorias
  const processedPairs = new Set<string>();

  for (const atom of atoms) {
      const atomForce = forces[atom.id] || [0, 0, 0];

      for (const bondId of atom.bonds) {
          const bondedAtom = atomMap.get(bondId)!;

          const pairKey = [atom.id, bondId].sort().join('-');
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          // Calcular fuerza vibratoria
          const restLength = 1; // Longitud de equilibrio
          const displacementVec = [
              bondedAtom.position[0] - atom.position[0],
              bondedAtom.position[1] - atom.position[1],
              bondedAtom.position[2] - atom.position[2],
          ];

          const r = Math.max(
              Math.sqrt(
                  displacementVec[0] ** 2 +
                  displacementVec[1] ** 2 +
                  displacementVec[2] ** 2
              ),
              MIN_DISTANCE
          );

          const displacement = r - restLength;
          const forceDirection = displacementVec.map(coord => coord / r);
          const vibrationalForce = forceDirection.map(
              dir => dir * springConstant * displacement
          );

          forces[atom.id] = atomForce.map(
              (f, i) => f + vibrationalForce[i]
          ) as [number, number, number];

          forces[bondId] = (forces[bondId] || [0, 0, 0]).map(
              (f, i) => f - vibrationalForce[i]
          ) as [number, number, number];
      }
  }

  // Fuerzas rotacionales
  for (const atom of atoms) {
      const atomForce = forces[atom.id] || [0, 0, 0];

      for (let i = 0; i < atom.bonds.length; i++) {
          for (let j = i + 1; j < atom.bonds.length; j++) {
              const atom1 = atomMap.get(atom.bonds[i])!;
              const atom2 = atomMap.get(atom.bonds[j])!;

              const vec1 = [
                  atom1.position[0] - atom.position[0],
                  atom1.position[1] - atom.position[1],
                  atom1.position[2] - atom.position[2],
              ];

              const vec2 = [
                  atom2.position[0] - atom.position[0],
                  atom2.position[1] - atom.position[1],
                  atom2.position[2] - atom.position[2],
              ];

              const r1 = Math.sqrt(vec1[0] ** 2 + vec1[1] ** 2 + vec1[2] ** 2);
              const r2 = Math.sqrt(vec2[0] ** 2 + vec2[1] ** 2 + vec2[2] ** 2);

              const normVec1 = vec1.map(coord => coord / r1);
              const normVec2 = vec2.map(coord => coord / r2);

              const dotProduct = normVec1.reduce((sum, v, i) => sum + v * normVec2[i], 0);
              const angle = Math.acos(dotProduct);

              const torque = rotationalConstant * (Math.PI / 2 - angle);

              const perpendicularForce1 = normVec1.map(
                  (coord) => coord * torque
              );
              const perpendicularForce2 = normVec2.map(
                  (coord) => coord * torque
              );

              forces[atom.id] = atomForce.map(
                  (f, k) => f + perpendicularForce1[k] + perpendicularForce2[k]
              ) as [number, number, number];
          }
      }
  }

  postMessage(forces);
};

export {};
