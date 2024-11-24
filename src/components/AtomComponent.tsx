import { useFrame } from "@react-three/fiber";
import { Atom } from "../models/Atom";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const AtomComponent = ({ atom }: { atom: Atom }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const linesRef = useRef<THREE.Group>(null); // Grupo para las líneas de los enlaces

    const [position, setPosition] = useState(atom.position.clone());
    const [radius, setRadius] = useState(0.1 + atom.mass * 0.02); // Tamaño basado en la masa

    useFrame(() => {
        // Actualiza la posición visual del átomo
        if (meshRef.current) {
            setPosition(atom.position.clone());
        }

        // Actualizar las posiciones de las líneas
        if (linesRef.current) {
            linesRef.current.clear();
            atom.bonds.forEach((bond) => {
                const start = atom.position;
                const end = bond.position;
                const material = new THREE.LineBasicMaterial({ color: "#FFFFFF" }); // Color de las líneas
                const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
                const line = new THREE.Line(geometry, material);
                linesRef.current?.add(line);
            });
        }
    });

    useEffect(() => {
        if (meshRef.current) {
            // Cambia el color directamente en el material del mesh
            (meshRef.current.material as THREE.MeshStandardMaterial).color.set(atom.color);
        }
    }, [atom.color]);

    useEffect(() => {
        if (meshRef.current) {
            meshRef.current.position.copy(position);
        }
        if (ringRef.current) {
            ringRef.current.position.copy(position); // Sincroniza posición del anillo con la esfera
        }
    }, [position]);

    useEffect(() => {
        // Actualiza el radio si la masa cambia
        setRadius(0.1 + atom.mass * 0.02);
    }, [atom.mass]);

    return (
        <>
            {/* Esfera principal del átomo */}
            <mesh ref={meshRef}>
                <sphereGeometry args={[radius, 32, 32]} />
                <meshStandardMaterial color={atom.color} />
            </mesh>

            {/* Indicador de carga (anillo) */}
            <mesh ref={ringRef}>
                <ringGeometry args={[radius + 0.05, radius + 0.07, 32]} />
                <meshStandardMaterial
                    color={atom.charge > 0 ? "red" : "blue"} // Rojo para carga positiva, azul para negativa
                    emissive={atom.charge > 0 ? new THREE.Color("red") : new THREE.Color("blue")}
                    emissiveIntensity={0.5}
                />
            </mesh>

            <group ref={linesRef} />
        </>
    );
};

export default AtomComponent;
