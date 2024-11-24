interface AtomData {
  id: string;
  originalColor: string;
}

interface NeighborListData {
  [id: string]: string[];
}

interface ColorWorkerMessageData {
  atoms: AtomData[];
  neighbors: NeighborListData;
}

interface ColorResponseData {
  [id: string]: string;
}

self.onmessage = (event: MessageEvent<ColorWorkerMessageData>) => {
  const { atoms, neighbors } = event.data;

  // Crear un mapa para rastrear átomos procesados
  const processed = new Set<string>();
  const colors: ColorResponseData = {};

  // Iterar sobre los átomos
  for (const atom of atoms) {
      const neighborIds = neighbors[atom.id] || [];

      if (neighborIds.length === 0) {
          // Si no tiene vecinos, asignar su color original
          colors[atom.id] = atom.originalColor;
      } else {
          // Si no se ha procesado este átomo aún
          if (!processed.has(atom.id)) {
              // Tomar el color del primer vecino (si existe)
              const sharedColor = colors[neighborIds[0]] || atom.originalColor;

              // Aplicar el color a este átomo y a todos sus vecinos
              [atom.id, ...neighborIds].forEach(neighborId => {
                  colors[neighborId] = sharedColor;
                  processed.add(neighborId); // Marcar como procesado
              });
          }
      }
  }

  // Enviar el resultado de colores de vuelta al hilo principal
  postMessage(colors);
};

export {};
