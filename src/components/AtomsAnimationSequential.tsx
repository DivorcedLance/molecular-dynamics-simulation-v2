import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AtomAnimationConfig } from '../types';
import { Atom } from '../models/Atom';
import { createAtoms, updateAtomsSequential2 } from '../lib/atomFunctions';
import AtomComponent from './AtomComponent';

import ShortRangeForcesWorker from '../workers/shortRangeForcesWorker?worker';
import NeighborsWorker from '../workers/neighborsWorker?worker';
import LongRangeForcesWorker from '../workers/longRangeForcesWorker?worker';
import ColorsWorker from '../workers/colorWorker?worker';

const AtomsAnimationSequential = ({ isRunning, atomCount, seed, config }: { isRunning: boolean, atomCount: number, seed: number, config: AtomAnimationConfig }) => {
    const [atoms, setAtoms] = useState<Atom[]>([]);

    const shortRangeForcesWorkerRef = useRef<Worker | null>(null);
    const neighborsWorkerRef = useRef<Worker | null>(null);
    const colorsWorkerRef = useRef<Worker | null>(null);
    const longRangeForcesWorkerRef = useRef<Worker | null>(null);

    useEffect(() => {
        setAtoms(createAtoms(atomCount, config.positionDispersion, config.velocityDispersion, seed, config.maxBondsPerAtom));
    }, [atomCount, config.positionDispersion, config.velocityDispersion, seed, config.maxBondsPerAtom]);

    useEffect(() => {
        shortRangeForcesWorkerRef.current = new ShortRangeForcesWorker();
        neighborsWorkerRef.current = new NeighborsWorker();
        colorsWorkerRef.current = new ColorsWorker();
        longRangeForcesWorkerRef.current = new LongRangeForcesWorker();

        return () => {
            shortRangeForcesWorkerRef.current?.terminate();
            neighborsWorkerRef.current?.terminate();
            colorsWorkerRef.current?.terminate();
            longRangeForcesWorkerRef.current?.terminate();
        };
    }, []);

    useFrame(({ clock }) => {
        if (isRunning) {
            const deltaTime = clock.getDelta();
            updateAtomsSequential2(
                atoms,
                deltaTime,
                config.cutoff,
                config.springConstant,
                config.rotationalConstant,
                config.G,
                config.k,
                shortRangeForcesWorkerRef,
                neighborsWorkerRef,
                colorsWorkerRef,
                longRangeForcesWorkerRef,
            )
        }
    });

    return (
        <>
            {atoms.map(atom => (
                <AtomComponent key={atom.id} atom={atom} />
            ))}
        </>
    );
};

export default AtomsAnimationSequential;
