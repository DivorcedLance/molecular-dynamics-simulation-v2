export type AtomAnimationConfig = {
  cutoff: number;
  springConstant: number;
  rotationalConstant: number;
  G: number;
  k: number;
  atomCount: number;
  seed: number;
  positionDispersion: number;
  velocityDispersion: number;
  maxBondsPerAtom: number;
};