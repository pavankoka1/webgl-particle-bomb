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
    // First blast – centre screen, clears any remnants
    { delay: 0, centerX: 0.5, centerY: 0.5, explosionDuration: 0.04, explosionForce: 3000, particleCount: 120, clearExisting: true },
    // Subsequent smaller bursts radiating around
    { delay: 300, centerX: 0.25, centerY: 0.75, explosionDuration: 0.04, explosionForce: 3500, particleCount: 80, clearExisting: false },
    { delay: 550, centerX: 0.75, centerY: 0.25, explosionDuration: 0.04, explosionForce: 3800, particleCount: 90, clearExisting: false },
    { delay: 800, centerX: 0.2, centerY: 0.35, explosionDuration: 0.03, explosionForce: 4000, particleCount: 75, clearExisting: false },
    { delay: 1050, centerX: 0.8, centerY: 0.8, explosionDuration: 0.05, explosionForce: 4200, particleCount: 85, clearExisting: false },
    { delay: 1200, centerX: 0.4, centerY: 0.8, explosionDuration: 0.03, explosionForce: 4500, particleCount: 100, clearExisting: false },
]; 