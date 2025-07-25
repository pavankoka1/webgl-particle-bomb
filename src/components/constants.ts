export interface UniformLocations {
    resolution: WebGLUniformLocation | null;
    center: WebGLUniformLocation | null;
    radius: WebGLUniformLocation | null;
    rotationX: WebGLUniformLocation | null;
    rotationY: WebGLUniformLocation | null;
    rotationZ: WebGLUniformLocation | null;
    color: WebGLUniformLocation | null;
    scale: WebGLUniformLocation | null;
    lightPosition: WebGLUniformLocation | null;
    viewPosition: WebGLUniformLocation | null;
    metallic: WebGLUniformLocation | null;
    roughness: WebGLUniformLocation | null;
    depthA: WebGLUniformLocation | null;
    depthB: WebGLUniformLocation | null;
    depthScale: WebGLUniformLocation | null;
}

export type ParticlePhase = 'exploding' | 'falling' | 'settled';

export interface Particle {
    centerX: number;
    centerY: number;
    z: number; // Add Z for 3D effect
    velocityX: number;
    velocityY: number;
    velocityZ: number;
    radius: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    rotationSpeedX: number;
    rotationSpeedY: number;
    rotationSpeedZ: number;
    color: [number, number, number, number];
    scaleX: number;
    scaleY: number;
    metallic: number;
    roughness: number;
    depthA: number;
    depthB: number;
    depthScale: number;
    // Animation fields
    phase: ParticlePhase;
    targetX: number;
    targetY: number;
    targetZ: number;
    swingAmplitude: number;
    swingFrequency: number;
    time: number;
    // For swing center
    swingCenterX: number;
    bounceVelocity: number;
    bounces: number;
}

export interface ExplosionControls {
    particleCount: number;
    startX: number; // 0-1, as a fraction of canvasWidth
    startY: number; // 0-1, as a fraction of canvasHeight
    xScatter: number; // 0-1, as a fraction of canvasWidth
    zScatter: number; // e.g. 0-1, as a fraction of 300
    yMin: number; // 0-1, as a fraction of canvasHeight
    yMax: number; // 0-1, as a fraction of canvasHeight
}

export function createExplosionParticles(
    controls: ExplosionControls,
    canvasWidth: number,
    canvasHeight: number
): Particle[] {
    const particles: Particle[] = [];
    const {
        particleCount,
        startX,
        startY,
        xScatter,
        zScatter,
        yMin,
        yMax,
    } = controls;
    for (let i = 0; i < particleCount; i++) {
        // Start at user-defined position
        const centerX = canvasWidth * startX;
        const centerY = canvasHeight * startY;
        const z = (Math.random() - 0.5) * 300 * zScatter;
        // Confetti: random angle and speed for blast
        const angle = Math.random() * 2 * Math.PI;
        const speed = 12 + Math.random() * 10; // energetic blast
        const velocityX = Math.cos(angle) * speed * xScatter;
        const velocityY = Math.sin(angle) * speed * (yMax - yMin);
        const velocityZ = (Math.random() - 0.5) * 12 * zScatter;
        // Visuals
        const radius = 8 + Math.random() * 12;
        const scaleX = 0.7 + Math.random() * 0.6;
        const scaleY = 0.7 + Math.random() * 0.6;
        // Fast spin during explosion
        const rotationSpeedX = 0.12 + Math.random() * 0.12;
        const rotationSpeedY = 0.12 + Math.random() * 0.12;
        const rotationSpeedZ = 0.08 + Math.random() * 0.10;
        const color: [number, number, number, number] = [Math.random(), Math.random(), Math.random(), 1.0];
        const metallic = 1.0;
        const roughness = 0.05;
        const depthA = 500.0 + Math.random() * 1000.0;
        const depthB = 400.0 + Math.random() * 800.0;
        const depthScale = 0.3 + Math.random() * 0.7;
        // Swing for leaf-fall (will be reduced as it settles)
        const swingAmplitude = 10 + Math.random() * 10;
        const swingFrequency = 0.5 + Math.random() * 0.4;
        particles.push({
            centerX,
            centerY,
            z,
            velocityX,
            velocityY,
            velocityZ,
            radius,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            rotationSpeedX,
            rotationSpeedY,
            rotationSpeedZ,
            color,
            scaleX,
            scaleY,
            metallic,
            roughness,
            depthA,
            depthB,
            depthScale,
            phase: 'exploding',
            targetX: centerX,
            targetY: centerY,
            targetZ: z,
            swingAmplitude,
            swingFrequency,
            time: 0,
            swingCenterX: centerX,
            bounceVelocity: 0,
            bounces: 0,
        });
    }
    return particles;
}

export function updateExplosionParticle(
    p: Particle,
    canvasWidth: number,
    canvasHeight: number
): Particle {
    let { centerX, centerY, z, velocityX, velocityY, velocityZ, phase, time, swingAmplitude, swingFrequency, rotationX, rotationY, rotationZ, rotationSpeedX, rotationSpeedY, rotationSpeedZ, swingCenterX, bounceVelocity, bounces } = p;
    time += 1 / 60; // Assume 60 FPS for time step
    if (phase === 'exploding') {
        // Confetti blast outward
        centerX += velocityX;
        centerY += velocityY;
        z += velocityZ;
        // Gravity pulls down
        let newVelocityY = velocityY - 0.45; // strong gravity for quick settle
        // Fast spin during explosion
        rotationX += rotationSpeedX;
        rotationY += rotationSpeedY;
        rotationZ += rotationSpeedZ;
        // If velocityY is downward and particle is at or below ground, switch to falling
        if (newVelocityY < 0 && centerY >= canvasHeight * 0.95) {
            phase = 'falling';
            centerY = canvasHeight * 0.95;
            bounceVelocity = -Math.abs(newVelocityY) * 0.4; // initial bounce up
            bounces = 0;
            // Reduce swing for settle
            swingAmplitude *= 0.7;
            swingFrequency *= 0.7;
            // Slow spin for settle
            rotationSpeedX *= 0.3;
            rotationSpeedY *= 0.3;
            rotationSpeedZ *= 0.3;
        }
        return {
            ...p,
            centerX,
            centerY,
            z,
            velocityX,
            velocityY: newVelocityY,
            velocityZ,
            phase,
            time,
            swingAmplitude,
            swingFrequency,
            rotationX,
            rotationY,
            rotationZ,
            rotationSpeedX,
            rotationSpeedY,
            rotationSpeedZ,
            swingCenterX,
            bounceVelocity,
            bounces,
        };
    } else if (phase === 'falling') {
        // Settle with bounce and damping
        bounceVelocity += 0.45; // gravity
        centerY += bounceVelocity;
        // Damping
        if (centerY > canvasHeight * 0.95) {
            centerY = canvasHeight * 0.95;
            if (Math.abs(bounceVelocity) > 1.2 && bounces < 2) {
                bounceVelocity = -bounceVelocity * 0.35; // bounce up, lose energy
                bounces += 1;
            } else {
                bounceVelocity = 0;
                phase = 'settled';
            }
        }
        // Gentle swing as it settles
        time += 1 / 60;
        centerX = swingCenterX + Math.sin(time * swingFrequency) * swingAmplitude * (1 - bounces * 0.4);
        // Slow spin for settle
        rotationX += rotationSpeedX;
        rotationY += rotationSpeedY;
        rotationZ += rotationSpeedZ;
        return {
            ...p,
            centerX,
            centerY,
            z,
            velocityX,
            velocityY,
            velocityZ,
            phase,
            time,
            swingAmplitude,
            swingFrequency,
            rotationX,
            rotationY,
            rotationZ,
            rotationSpeedX,
            rotationSpeedY,
            rotationSpeedZ,
            swingCenterX,
            bounceVelocity,
            bounces,
        };
    } else if (phase === 'settled') {
        // No more movement
        return { ...p };
    }
    return { ...p };
}
