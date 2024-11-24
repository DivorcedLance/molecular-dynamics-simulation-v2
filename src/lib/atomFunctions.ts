// src/lib/atomFunctions.ts
import * as THREE from "three";
import { Atom } from "../models/Atom";
import { seedRandom } from "./randomUtils";

// Crear átomos con enlaces químicos predefinidos
export function createAtoms(
    atomCount: number,
    positionDispersion: number,
    velocityDispersion: number,
    seed: number,
    maxBondsPerAtom: number
  ): Atom[] {
    const random = seedRandom(seed);
  
    // Colores predefinidos para los átomos
    const colors = [
      "#FF5733", "#33FF57", "#3357FF", "#F7DC6F", "#C70039",
      "#900C3F", "#581845", "#FFC300", "#DAF7A6", "#FF33A1",
      "#33FFF9", "#9933FF", "#F933FF", "#33FF77", "#77FF33",
      "#FFD700", "#FFA07A", "#20B2AA", "#87CEFA", "#778899",
      "#00FA9A", "#48D1CC", "#FF4500", "#DC143C", "#8B0000",
    ];
    const shuffledColors = [...colors].sort(() => random() - 0.5);
  
    const newAtoms: Atom[] = [];
  
    // Crear átomos con las propiedades iniciales
    for (let i = 0; i < atomCount; i++) {
      const position = new THREE.Vector3(
        (random() - 0.5) * positionDispersion,
        (random() - 0.5) * positionDispersion,
        (random() - 0.5) * positionDispersion
      );
      const velocity = new THREE.Vector3(
        (random() - 0.5) * velocityDispersion,
        (random() - 0.5) * velocityDispersion,
        (random() - 0.5) * velocityDispersion
      );
      const mass = random() * 5 + 1; // Masa aleatoria entre 1 y 6
      const charge = (random() - 0.5) * 2; // Carga entre -1 y 1
      const originalColor = shuffledColors[i % shuffledColors.length];
  
      // Crear un nuevo átomo usando el constructor actualizado
      const atom = new Atom(position, velocity, mass, charge, originalColor);
  
      newAtoms.push(atom);
    }
  // Asignar enlaces químicos (bonds) de manera segura
  for (const atom of newAtoms) {
    let attempts = 0; // Contador para evitar bucles infinitos

    while (atom.bonds.length < maxBondsPerAtom) {
        const potentialNeighbor = newAtoms[Math.floor(random() * newAtoms.length)];

        // Verificar si el vecino es válido
        if (
            potentialNeighbor !== atom && // No puede enlazarse consigo mismo
            !atom.bonds.includes(potentialNeighbor) && // No puede enlazarse repetidamente
            potentialNeighbor.bonds.length < maxBondsPerAtom // El vecino aún puede aceptar más enlaces
        ) {
            atom.addBond(potentialNeighbor); // Crear enlace bidireccional
        }

        attempts++;
        if (attempts > atomCount * 10) {
            break;
        }
    }
  }
  
    return newAtoms;
  }

// Calcular lista de vecinos por cutoff
export function calculateNeighborLists(atoms: Atom[], cutoff: number): Map<string, Atom[]> {
  const neighborsMap = new Map<string, Atom[]>();

  for (const atom of atoms) {
    const neighbors = atoms.filter(
      (other) =>
        other !== atom &&
        atom.position.distanceTo(other.position) <= cutoff
    );
    neighborsMap.set(atom.id, neighbors);
  }

  return neighborsMap;
}

// Función para asignar colores en función del vecindario
export function updateAtomColorsByNeighborhood(
  atoms: Atom[],
  neighborLists: Map<string, Atom[]>
): void {
  // Mapa para rastrear vecindarios procesados
  const processed = new Set<string>();

  atoms.forEach(atom => {
      const neighbors = neighborLists.get(atom.id) || [];
      if (neighbors.length === 0) {
          // Sin vecinos: Volver al color original
          atom.color = atom.originalColor;
      } else {
          // Si no se ha procesado este átomo aún
          if (!processed.has(atom.id)) {
              // Tomar el color de uno de los vecinos (el primero de la lista)
              const sharedColor = neighbors[0].color;

              // Aplicar el color del vecino al átomo y a todos los vecinos
              [atom, ...neighbors].forEach(neighbor => {
                  neighbor.color = sharedColor;
                  processed.add(neighbor.id); // Marcar como procesado
              });
          }
      }
  });
}

// Aplicar fuerzas de largo alcance (gravedad y electricidad)
export function applyLongRangeForces(
    atoms: Atom[],
    neighborLists: Map<string, Atom[]>,
    G: number,
    k: number
) {
    const MIN_DISTANCE = 0.1;

    // Iterar solo sobre cada átomo y sus vecinos de forma ordenada
    const processedPairs = new Set<string>();

    for (const atom of atoms) {
        const neighbors = neighborLists.get(atom.id) || [];
        for (const neighbor of neighbors) {
            // Generar un identificador único para cada par
            const pairKey = [atom.id, neighbor.id].sort().join('-');

            // Evitar calcular para pares ya procesados
            if (processedPairs.has(pairKey)) {
                continue;
            }
            processedPairs.add(pairKey);

            // Calcular el desplazamiento y la distancia
            const displacement = new THREE.Vector3().subVectors(
                neighbor.position,
                atom.position
            );
            const r = Math.max(displacement.length(), MIN_DISTANCE);

            // Fuerza gravitacional
            const gravitationalForceMagnitude =
                (G * atom.mass * neighbor.mass) / (r * r);

            // Fuerza electrostática (Ley de Coulomb)
            const electrostaticForceMagnitude =
                (k * atom.charge * neighbor.charge) / (r * r);

            // Dirección de la fuerza
            const forceDirection = displacement.normalize();

            // Calcular la fuerza total
            const gravitationalForce = forceDirection.clone().multiplyScalar(gravitationalForceMagnitude);

            // La fuerza electrostática debe cambiar de dirección si las cargas son iguales
            const electrostaticForce = forceDirection.clone().multiplyScalar(electrostaticForceMagnitude);

            // Sumar las fuerzas
            const totalForce = gravitationalForce.add(electrostaticForce);

            // Aplicar fuerza a ambos átomos
            atom.force.add(totalForce);
            neighbor.force.add(totalForce.clone().negate()); // Acción-reacción
        }
    }
}
  
export function updateAtomsSequential(
    atoms: Atom[], 
    deltaTime: number, 
    cutoff: number, 
    springConstant: number, 
    rotationalConstant: number, 
    G: number, 
    k: number,
): void {
    // Calcular fuerzas locales (enlaces químicos)
  atoms.forEach(atom => {
    atom.applyVibrationalForce(springConstant);
    atom.applyRotationalForce(rotationalConstant);
  });

  // Calcular listas de vecinos basadas en el cutoff
  const neighborLists = calculateNeighborLists(atoms, cutoff);

  // Aplicar fuerzas de largo alcance (gravitacionales y electrostáticas)
  applyLongRangeForces(atoms, neighborLists, G, k);
  
  // Actualizar colores de los átomos basados en el vecindario
  updateAtomColorsByNeighborhood(atoms, neighborLists);

  // Actualizar posiciones y velocidades de los átomos
  atoms.forEach(atom => atom.updatePosVelByDelta(deltaTime));
}

interface ForceResponseData {
    [id: string]: [number, number, number];
  }
interface NeighborResponseData {
    [id: string]: string[];
}
interface ColorResponseData {
    [id: string]: string;
  }


export function updateAtomsSequential2(
    atoms: Atom[],
    deltaTime: number,
    cutoff: number,
    springConstant: number,
    rotationalConstant: number,
    G: number,
    k: number,
    shortRangeForcesWorkerRef: React.MutableRefObject<Worker | null>,
    neighborsWorkerRef: React.MutableRefObject<Worker | null>,
    colorWorkerRef: React.MutableRefObject<Worker | null>,
    longRangeForcesWorkerRef: React.MutableRefObject<Worker | null>
  ) {
    // Crear promesas para sincronizar las operaciones de los workers
    const getNeighbors = () =>
      new Promise<NeighborResponseData>((resolve, reject) => {
        if (neighborsWorkerRef.current) {
          neighborsWorkerRef.current.onmessage = (event) => resolve(event.data);
          neighborsWorkerRef.current.onerror = (error) => reject(error);
          neighborsWorkerRef.current.postMessage({ 
            atoms: atoms.map((atom) => ({
                id: atom.id,
                position: atom.position.toArray(),
            })),
            cutoff 
        });
        } else {
          reject(new Error("Neighbors worker no inicializado."));
        }
      });
  
    const calculateShortRangeForces = () =>
      new Promise<ForceResponseData>((resolve, reject) => {
        if (shortRangeForcesWorkerRef.current) {
          shortRangeForcesWorkerRef.current.onmessage = (event) =>
            resolve(event.data);
          shortRangeForcesWorkerRef.current.onerror = (error) => reject(error);
          shortRangeForcesWorkerRef.current.postMessage({
            atoms: atoms.map((atom) => ({
                id: atom.id,
                position: atom.position.toArray(),
                bonds: atom.bonds.map((bond) => bond.id),
            })),
            springConstant,
            rotationalConstant,
          });
        } else {
          reject(new Error("Short-range forces worker no inicializado."));
        }
      });
  
    const updateColors = (neighbors: NeighborResponseData) =>
      new Promise<ColorResponseData>((resolve, reject) => {
        if (colorWorkerRef.current) {
          colorWorkerRef.current.onmessage = (event) => resolve(event.data);
          colorWorkerRef.current.onerror = (error) => reject(error);
          colorWorkerRef.current.postMessage({
            atoms: atoms.map((atom) => ({
              id: atom.id,
              originalColor: atom.originalColor,
            })),
            neighbors,
          });
        } else {
          reject(new Error("Color worker no inicializado."));
        }
      });
  
    const calculateLongRangeForces = (neighbors: NeighborResponseData) =>
      new Promise<ForceResponseData>((resolve, reject) => {
        if (longRangeForcesWorkerRef.current) {
          longRangeForcesWorkerRef.current.onmessage = (event) =>
            resolve(event.data);
          longRangeForcesWorkerRef.current.onerror = (error) => reject(error);
          longRangeForcesWorkerRef.current.postMessage({
            atoms: atoms.map((atom) => ({
                id: atom.id,
                position: atom.position.toArray(),
                mass: atom.mass,
                charge: atom.charge,
            })),
            neighbors: Object.entries(neighbors).map(([id, neighborIds]) => ({
              id,
              neighbors: neighborIds,
            })),
            G,
            k,
          });
        } else {
          reject(new Error("Long-range forces worker no inicializado."));
        }
      });
      
      calculateShortRangeForces()
      .then((shortRangeForces) =>
        getNeighbors().then((neighbors) => ({
          shortRangeForces,
          neighbors,
        }))
      )
      .then(({ shortRangeForces, neighbors }) =>
        updateColors(neighbors).then((colors) => ({
          shortRangeForces,
          neighbors,
          colors,
        }))
      )
      .then(({ shortRangeForces, neighbors, colors }) =>
        calculateLongRangeForces(neighbors).then((longRangeForces) => ({
          shortRangeForces,
          colors,
          longRangeForces,
        }))
      )
      .then(({ shortRangeForces, colors, longRangeForces }) => {
        // Actualizar posiciones y colores de los átomos
        atoms.forEach((atom) => {
          const shortForce = shortRangeForces[atom.id] || [0, 0, 0];
          const longForce = longRangeForces[atom.id] || [0, 0, 0];
          const totalForce = [
            shortForce[0] + longForce[0],
            shortForce[1] + longForce[1],
            shortForce[2] + longForce[2],
          ];
  
          // Actualizar posición y velocidad
          const acceleration = [
            totalForce[0] / atom.mass,
            totalForce[1] / atom.mass,
            totalForce[2] / atom.mass,
          ];
  
          atom.velocity.add(new THREE.Vector3(...acceleration).multiplyScalar(deltaTime));
          atom.position.add(atom.velocity.clone().multiplyScalar(deltaTime));
  
          // Actualizar color
          atom.color = colors[atom.id] || atom.originalColor;
        });
      })
      .catch((error) => {
        console.error("Error al procesar los workers:", error);
      });
  }
  
  export function updateAtomsParallel(
    atoms: Atom[],
    deltaTime: number,
    cutoff: number,
    springConstant: number,
    rotationalConstant: number,
    G: number,
    k: number,
    shortRangeForcesWorkerRef: React.MutableRefObject<Worker | null>,
    neighborsWorkerRef: React.MutableRefObject<Worker | null>,
    colorWorkerRef: React.MutableRefObject<Worker | null>,
    longRangeForcesWorkerRef: React.MutableRefObject<Worker | null>
  ) {
    const getNeighbors = () =>
      new Promise<NeighborResponseData>((resolve, reject) => {
        if (neighborsWorkerRef.current) {
          neighborsWorkerRef.current.onmessage = (event) => resolve(event.data);
          neighborsWorkerRef.current.onerror = (error) => reject(error);
          neighborsWorkerRef.current.postMessage({
            atoms: atoms.map((atom) => ({
              id: atom.id,
              position: atom.position.toArray(),
            })),
            cutoff,
          });
        } else {
          reject(new Error("Neighbors worker no inicializado."));
        }
      });
  
    const calculateShortRangeForces = () =>
      new Promise<ForceResponseData>((resolve, reject) => {
        if (shortRangeForcesWorkerRef.current) {
          shortRangeForcesWorkerRef.current.onmessage = (event) =>
            resolve(event.data);
          shortRangeForcesWorkerRef.current.onerror = (error) => reject(error);
          shortRangeForcesWorkerRef.current.postMessage({
            atoms: atoms.map((atom) => ({
              id: atom.id,
              position: atom.position.toArray(),
              bonds: atom.bonds.map((bond) => bond.id),
            })),
            springConstant,
            rotationalConstant,
          });
        } else {
          reject(new Error("Short-range forces worker no inicializado."));
        }
      });
  
    const updateColors = (neighbors: NeighborResponseData) =>
      new Promise<ColorResponseData>((resolve, reject) => {
        if (colorWorkerRef.current) {
          colorWorkerRef.current.onmessage = (event) => resolve(event.data);
          colorWorkerRef.current.onerror = (error) => reject(error);
          colorWorkerRef.current.postMessage({
            atoms: atoms.map((atom) => ({
              id: atom.id,
              originalColor: atom.originalColor,
            })),
            neighbors,
          });
        } else {
          reject(new Error("Color worker no inicializado."));
        }
      });
  
    const calculateLongRangeForces = (neighbors: NeighborResponseData) =>
      new Promise<ForceResponseData>((resolve, reject) => {
        if (longRangeForcesWorkerRef.current) {
          longRangeForcesWorkerRef.current.onmessage = (event) =>
            resolve(event.data);
          longRangeForcesWorkerRef.current.onerror = (error) => reject(error);
          longRangeForcesWorkerRef.current.postMessage({
            atoms: atoms.map((atom) => ({
              id: atom.id,
              position: atom.position.toArray(),
              mass: atom.mass,
              charge: atom.charge,
            })),
            neighbors: Object.entries(neighbors).map(([id, neighborIds]) => ({
              id,
              neighbors: neighborIds,
            })),
            G,
            k,
          });
        } else {
          reject(new Error("Long-range forces worker no inicializado."));
        }
      });
  
    // Ejecutar las operaciones paralelizadas
    const shortRangePromise = calculateShortRangeForces();
    const neighborsPromise = getNeighbors();
  
    neighborsPromise
      .then((neighbors) => {
        // Paralelizar colorWorkerRef y longRangeForcesWorkerRef
        const colorPromise = updateColors(neighbors);
        const longRangeForcesPromise = calculateLongRangeForces(neighbors);
  
        return Promise.all([colorPromise, longRangeForcesPromise]).then(
          ([colors, longRangeForces]) => ({
            neighbors,
            colors,
            longRangeForces,
          })
        );
      })
      .then(({ colors, longRangeForces }) => {
        // Esperar a que shortRangeForcesWorkerRef termine antes de combinar los resultados
        return shortRangePromise.then((shortRangeForces) => ({
          shortRangeForces,
          longRangeForces,
          colors,
        }));
      })
      .then(({ shortRangeForces, longRangeForces, colors }) => {
        // Actualizar posiciones y colores de los átomos
        atoms.forEach((atom) => {
          const shortForce = shortRangeForces[atom.id] || [0, 0, 0];
          const longForce = longRangeForces[atom.id] || [0, 0, 0];
          const totalForce = [
            shortForce[0] + longForce[0],
            shortForce[1] + longForce[1],
            shortForce[2] + longForce[2],
          ];
  
          // Actualizar posición y velocidad
          const acceleration = [
            totalForce[0] / atom.mass,
            totalForce[1] / atom.mass,
            totalForce[2] / atom.mass,
          ];
  
          atom.velocity.add(
            new THREE.Vector3(...acceleration).multiplyScalar(deltaTime)
          );
          atom.position.add(atom.velocity.clone().multiplyScalar(deltaTime));
  
          // Actualizar color
          atom.color = colors[atom.id] || atom.originalColor;
        });
      })
      .catch((error) => {
        console.error("Error al procesar los workers:", error);
      });
  }
  