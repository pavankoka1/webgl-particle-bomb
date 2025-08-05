// Constants describing each step in the chain-reaction
// Keep values tweakable from one place without touching component logic.

export interface ExplosionStep {
    delay: number;
    centerX: number;
    centerY: number;
    explosionDuration?: number;
    explosionForce?: number;
    particleCount?: number;
    clearExisting?: boolean;
}

export const CHAIN_EXPLOSION_STEPS: ExplosionStep[] = [
    // LAYER 1 (0ms): Primary center blast. High force to send particles across the screen.
    { delay: 0, centerX: 0.50, centerY: 0.50, explosionDuration: 0.02, explosionForce: 1500, particleCount: 150, clearExisting: true },

    // LAYER 2 (400ms-700ms): Inner ring. Timed for when Layer 1 particles have travelled ~30-40% of the way.
    { delay: 400, centerX: 0.65, centerY: 0.50, explosionDuration: 0.03, explosionForce: 800, particleCount: 25, clearExisting: false },
    { delay: 450, centerX: 0.35, centerY: 0.50, explosionDuration: 0.03, explosionForce: 700, particleCount: 25, clearExisting: false },
    { delay: 500, centerX: 0.50, centerY: 0.35, explosionDuration: 0.03, explosionForce: 700, particleCount: 25, clearExisting: false },
    { delay: 550, centerX: 0.50, centerY: 0.65, explosionDuration: 0.03, explosionForce: 750, particleCount: 25, clearExisting: false },
    { delay: 600, centerX: 0.62, centerY: 0.38, explosionDuration: 0.03, explosionForce: 850, particleCount: 22, clearExisting: false },
    { delay: 650, centerX: 0.38, centerY: 0.62, explosionDuration: 0.03, explosionForce: 750, particleCount: 22, clearExisting: false },
    { delay: 700, centerX: 0.38, centerY: 0.38, explosionDuration: 0.03, explosionForce: 700, particleCount: 22, clearExisting: false },
    { delay: 750, centerX: 0.62, centerY: 0.62, explosionDuration: 0.03, explosionForce: 750, particleCount: 22, clearExisting: false },

    // LAYER 3 (1000ms-1500ms): Middle ring. Timed for when Layer 2 particles have travelled outwards.
    { delay: 1000, centerX: 0.75, centerY: 0.50, explosionDuration: 0.03, explosionForce: 800, particleCount: 20, clearExisting: false },
    { delay: 1050, centerX: 0.25, centerY: 0.50, explosionDuration: 0.03, explosionForce: 800, particleCount: 20, clearExisting: false },
    { delay: 1100, centerX: 0.50, centerY: 0.25, explosionDuration: 0.03, explosionForce: 800, particleCount: 20, clearExisting: false },
    { delay: 1150, centerX: 0.50, centerY: 0.75, explosionDuration: 0.03, explosionForce: 800, particleCount: 20, clearExisting: false },
    { delay: 1200, centerX: 0.71, centerY: 0.29, explosionDuration: 0.03, explosionForce: 700, particleCount: 18, clearExisting: false },
    { delay: 1250, centerX: 0.29, centerY: 0.71, explosionDuration: 0.03, explosionForce: 700, particleCount: 18, clearExisting: false },
    { delay: 1300, centerX: 0.29, centerY: 0.29, explosionDuration: 0.03, explosionForce: 700, particleCount: 18, clearExisting: false },
    { delay: 1350, centerX: 0.71, centerY: 0.71, explosionDuration: 0.03, explosionForce: 700, particleCount: 18, clearExisting: false },
    { delay: 1400, centerX: 0.80, centerY: 0.65, explosionDuration: 0.03, explosionForce: 650, particleCount: 16, clearExisting: false },
    { delay: 1450, centerX: 0.20, centerY: 0.35, explosionDuration: 0.03, explosionForce: 650, particleCount: 16, clearExisting: false },

    // LAYER 4 (1800ms-2400ms): Outer ring & edges. Timed for when Layer 3 particles reach the screen boundaries.
    //     { delay: 1800, centerX: 0.90, centerY: 0.50, explosionDuration: 0.03, explosionForce: 600, particleCount: 15, clearExisting: false },
    //     { delay: 1850, centerX: 0.10, centerY: 0.50, explosionDuration: 0.03, explosionForce: 600, particleCount: 15, clearExisting: false },
    //     { delay: 1900, centerX: 0.50, centerY: 0.10, explosionDuration: 0.03, explosionForce: 600, particleCount: 15, clearExisting: false },
    //     { delay: 1950, centerX: 0.50, centerY: 0.90, explosionDuration: 0.03, explosionForce: 600, particleCount: 15, clearExisting: false },
    //     { delay: 2000, centerX: 0.85, centerY: 0.15, explosionDuration: 0.03, explosionForce: 500, particleCount: 15, clearExisting: false },
    //     { delay: 2050, centerX: 0.15, centerY: 0.85, explosionDuration: 0.03, explosionForce: 500, particleCount: 15, clearExisting: false },
    //     { delay: 2100, centerX: 0.15, centerY: 0.15, explosionDuration: 0.03, explosionForce: 500, particleCount: 15, clearExisting: false },
    //     { delay: 2150, centerX: 0.85, centerY: 0.85, explosionDuration: 0.03, explosionForce: 500, particleCount: 15, clearExisting: false },
    //     { delay: 2200, centerX: 0.95, centerY: 0.75, explosionDuration: 0.03, explosionForce: 450, particleCount: 15, clearExisting: false },
    //     { delay: 2250, centerX: 0.05, centerY: 0.25, explosionDuration: 0.03, explosionForce: 450, particleCount: 15, clearExisting: false },
    //     { delay: 2300, centerX: 0.25, centerY: 0.05, explosionDuration: 0.03, explosionForce: 450, particleCount: 15, clearExisting: false },
    //     { delay: 2350, centerX: 0.75, centerY: 0.95, explosionDuration: 0.03, explosionForce: 450, particleCount: 15, clearExisting: false },
]; 