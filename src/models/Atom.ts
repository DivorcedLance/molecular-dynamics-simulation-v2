// src/models/Atom.ts
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid'; // Para IDs únicos

export class Atom {
    id: string; // Identificador único
    position: THREE.Vector3; // Posición en el espacio (x, y, z)
    velocity: THREE.Vector3; // Velocidad (v_x, v_y, v_z)
    force: THREE.Vector3; // Fuerza acumulada (F_x, F_y, F_z)
    mass: number; // Masa (m)
    charge: number; // Carga eléctrica (q)
    color: string; // Color del átomo
    originalColor: string; // Color del átomo
    bonds: Atom[] = []; // Enlaces químicos (neighbors por enlace)

    constructor(
        position = new THREE.Vector3(),
        velocity = new THREE.Vector3(),
        mass = 1,
        charge = 0,
        originalColor = '#ffffff',
    ) {
        this.id = uuidv4(); // Generar un ID único
        this.position = position;
        this.velocity = velocity;
        this.force = new THREE.Vector3();
        this.mass = mass;
        this.charge = charge;
        this.color = originalColor;
        this.originalColor = originalColor;
        this.bonds = []; // Inicializar lista de enlaces
    }

    // Método para agregar un enlace químico
    addBond(atom: Atom) {
        if (!this.bonds.includes(atom)) {
            this.bonds.push(atom);
            atom.addBond(this); // Relación bidireccional
        }
    }

    // Fuerzas vibratorias (enlaces químicos)
    applyVibrationalForce(springConstant: number) {
        const processedPairs = new Set<string>(); // Rastrear pares procesados

        this.bonds.forEach(other => {
            // Crear un identificador único para cada par
            const pairKey = [this.id, other.id].sort().join('-');

            // Evitar procesar pares duplicados
            if (processedPairs.has(pairKey)) {
                return;
            }
            processedPairs.add(pairKey);

            // Calcular la fuerza vibratoria
            const restLength = 1; // Longitud de equilibrio
            const displacement = this.position.distanceTo(other.position) - restLength;
            const forceDirection = new THREE.Vector3()
                .subVectors(other.position, this.position)
                .normalize();
            const force = forceDirection.multiplyScalar(springConstant * displacement);

            // Aplicar fuerzas a ambos átomos
            this.force.add(force);
            other.force.add(force.clone().negate()); // Acción-reacción
        });
    }

    // Fuerzas rotacionales (enlaces con ángulos)
    applyRotationalForce(rotationalConstant: number) {
        for (let i = 0; i < this.bonds.length; i++) {
            for (let j = i + 1; j < this.bonds.length; j++) {
                const atom1 = this.bonds[i];
                const atom2 = this.bonds[j];
                const vec1 = new THREE.Vector3().subVectors(atom1.position, this.position);
                const vec2 = new THREE.Vector3().subVectors(atom2.position, this.position);
                const angle = vec1.angleTo(vec2); // Ángulo entre los enlaces
                const torque = rotationalConstant * (Math.PI / 2 - angle); // Ajustar hacia el ángulo de equilibrio
                const perpendicularForce1 = vec1.clone().cross(new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(torque);
                const perpendicularForce2 = vec2.clone().cross(new THREE.Vector3(0, 0, -1)).normalize().multiplyScalar(torque);
                this.force.add(perpendicularForce1);
                this.force.add(perpendicularForce2);
            }
        }
    }

    // Método para actualizar la posición y velocidad en cada paso del tiempo
    updatePosVelByDelta(deltaTime: number) {
        // Calcular aceleración
        const acceleration = this.force.clone().divideScalar(this.mass);

        // Actualizar velocidad y posición
        this.velocity.add(acceleration.multiplyScalar(deltaTime));
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Restablecer fuerza
        this.force.set(0, 0, 0);
    }
}
