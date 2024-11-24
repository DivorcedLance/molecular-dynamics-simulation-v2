import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AtomAnimationConfig } from '../types';
import { Atom } from '../models/Atom';
import { createAtoms, updateAtomsSequential } from '../lib/atomFunctions';
import AtomComponent from '../components/AtomComponent';

const AtomsAnimation = ({
    isRunning,
    atomCount,
    seed,
    config
}: {
    isRunning: boolean;
    atomCount: number;
    seed: number;
    config: AtomAnimationConfig;
}) => {
    const [atoms, setAtoms] = useState<Atom[]>([]);
    const iterationRef = useRef(0); // Contador de iteraciones

    // Inicializar los átomos solo cuando cambien los parámetros relevantes
    useEffect(() => {
        const newAtoms = createAtoms(
            atomCount,
            config.positionDispersion,
            config.velocityDispersion,
            seed,
            config.maxBondsPerAtom,
        );
        setAtoms(newAtoms);
    }, [atomCount, config.positionDispersion, config.velocityDispersion, seed, config.maxBondsPerAtom]);

    // Actualizar los átomos en cada frame
    useFrame(({ clock }) => {
        if (isRunning) {
            const deltaTime = clock.getDelta();
            iterationRef.current++;
            updateAtomsSequential(
                atoms,
                deltaTime,
                config.cutoff,
                config.springConstant,
                config.rotationalConstant,
                config.G,
                config.k,
            );
        }
    });

    return (
        <>
            {atoms.map((atom) => (
                <AtomComponent key={atom.id} atom={atom} />
            ))}
        </>
    );
};

export default AtomsAnimation;
