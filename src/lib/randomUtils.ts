// Function to create a seeded random generator
export function seedRandom(seed: number): () => number {
  return function () {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
  };
}

// Function to generate a random seed
export function generateRandomSeed(): number {
  return Math.floor(Math.random() * 1000000);
}