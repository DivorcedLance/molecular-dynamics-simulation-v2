interface AtomData {
  id: string;
  position: [number, number, number];
}

interface NeighborMessageData {
  atoms: AtomData[];
  cutoff: number;
}

interface NeighborResponseData {
  [id: string]: string[];
}

self.onmessage = (event: MessageEvent<NeighborMessageData>) => {
  const { atoms, cutoff } = event.data;

  const neighborsMap: NeighborResponseData = {};

  for (const atom of atoms) {
      const neighbors = atoms.filter((other) => {
          if (other.id === atom.id) return false;

          const distance = Math.sqrt(
              (atom.position[0] - other.position[0]) ** 2 +
              (atom.position[1] - other.position[1]) ** 2 +
              (atom.position[2] - other.position[2]) ** 2
          );

          return distance <= cutoff;
      }).map(neighbor => neighbor.id);

      neighborsMap[atom.id] = neighbors;
  }

  postMessage(neighborsMap);
};

export {};
