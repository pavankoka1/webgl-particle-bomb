export class Particle {
  centerX: number;
  centerY: number;
  centerZ: number;
  radius: number;
  rotationX: number = 0;
  rotationY: number = 0;
  rotationZ: number = 0;
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
  life: number;
  maxLife: number;
  particleType: 'fall' | 'fade' | 'leaf';

  // Animation phases
  phase: 'approach' | 'explosion' | 'settling' = 'approach';
  phaseTime: number = 0;

  // Explosion phase properties
  explosionDuration: number;
  explosionVelocityX: number = 0;
  explosionVelocityY: number = 0;
  explosionVelocityZ: number = 0;
  // Approach phase properties
  approachTargetZ: number = 0;
  approachSpeed: number = 0;
  explosionScatter: { x: number; y: number; z: number } | null = null;

  // Settling phase properties
  settlingDuration: number;
  settlingTime: number = 0;

  // Physics properties
  velocityX: number = 0;
  velocityY: number = 0;
  velocityZ: number = 0;
  gravity: number;
  airResistance: number;

  // Swing properties
  swingAmplitude: number;
  swingFrequency: number;
  swingPhase: number;
  fallSpeed: number;

  // Animation properties
  r: number = 0;
  sy: number = 1;
  complete: boolean = false;

  p0?: { x: number; y: number; z: number };
  p1?: { x: number; y: number; z: number };
  p2?: { x: number; y: number; z: number };

  constructor(
    centerX: number,
    centerY: number,
    radius: number,
    rotationSpeedX: number,
    rotationSpeedY: number,
    rotationSpeedZ: number,
    color: [number, number, number, number],
    scaleX: number = 1,
    scaleY: number = 1,
    metallic: number = 0.8,
    roughness: number = 0.2,
    depthA: number = 1000,
    depthB: number = 800,
    depthScale: number = 0.5,
    life: number = 300,
    explosionDuration: number = 0.0005, // Fast explosion (0.5ms)
    settlingDuration: number = 8,
    swingAmplitude: number = 150,
    particleType: 'fall' | 'fade' | 'leaf' = 'fall',
    fallSpeed: number = 1.5,
    gravity: number = 5,
    airResistance: number = 0.98,
    p0?: { x: number; y: number; z: number },
    p1?: { x: number; y: number; z: number },
    p2?: { x: number; y: number; z: number },
    p3?: { x: number; y: number; z: number },
    swingFrequency: number = 1.0,
    swingPhase: number = 0.0,
    velocityX: number = 0,
    velocityY: number = 0,
    velocityZ: number = 0,
    approachTargetZ: number = 0,
    approachSpeed: number = 0,
    explosionScatter: { x: number; y: number; z: number } | null = null
  ) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.centerZ = p0?.z || 0;
    this.radius = radius;
    this.rotationSpeedX = rotationSpeedX;
    this.rotationSpeedY = rotationSpeedY;
    this.rotationSpeedZ = rotationSpeedZ;
    this.color = color;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.metallic = metallic;
    this.roughness = roughness;
    this.depthA = depthA;
    this.depthB = depthB;
    this.depthScale = depthScale;
    this.life = life;
    this.maxLife = life;
    this.particleType = particleType;

    // Animation timing
    this.explosionDuration = explosionDuration;
    this.settlingDuration = settlingDuration;

    // Physics properties
    this.gravity = gravity;
    this.airResistance = airResistance;
    this.fallSpeed = fallSpeed;
    this.swingAmplitude = swingAmplitude;
    this.swingFrequency = swingFrequency;
    this.swingPhase = swingPhase;

    // Calculate explosion velocities from Bezier points
    if (p0 && p1 && p2 && p3) {
      // Calculate initial explosion velocity (from p0 to p2)
      const explosionDistance = Math.sqrt(
        Math.pow(p2.x - p0.x, 2) +
        Math.pow(p2.y - p0.y, 2) +
        Math.pow(p2.z - p0.z, 2)
      );

      this.explosionVelocityX = (p2.x - p0.x) / explosionDuration;
      this.explosionVelocityY = (p2.y - p0.y) / explosionDuration;
      this.explosionVelocityZ = (p2.z - p0.z) / explosionDuration;

      // Set initial velocities
      this.velocityX = this.explosionVelocityX;
      this.velocityY = this.explosionVelocityY;
      this.velocityZ = this.explosionVelocityZ;
    }
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.velocityZ = velocityZ;
    this.p0 = p0;
    this.p1 = p1;
    this.p2 = p2;
    this.approachTargetZ = approachTargetZ;
    this.approachSpeed = approachSpeed;
    this.explosionScatter = explosionScatter;
  }

  update(canvasWidth: number, canvasHeight: number) {
    const timeStep = 1 / 60; // 60fps timeStep

    if (this.phase === 'approach') {
      // APPROACH PHASE: Particles accelerate towards explosion center from deep Z
      this.phaseTime += timeStep;

      // Update position using approach velocity
      this.centerX += this.velocityX * timeStep;
      this.centerY += this.velocityY * timeStep;
      this.centerZ += this.velocityZ * timeStep;

      // Add slight rotation during approach
      this.rotationX += this.rotationSpeedX * 2;
      this.rotationY += this.rotationSpeedY * 2;
      this.rotationZ += this.rotationSpeedZ * 2;

      // Scale particles based on Z position for depth effect
      const depthProgress = (this.centerZ + 2000) / 3000; // Normalize Z progress
      this.scaleX = 0.1 + depthProgress * 0.9; // Start small, grow as approaching
      this.scaleY = 0.1 + depthProgress * 0.9;

      // Check if we've reached the explosion center (Z=0)
      if (this.centerZ >= -100) { // Within 100px of explosion center
        // Arrived at explosion center, switch to explosion phase
        this.phase = 'explosion';
        this.phaseTime = 0;
        // Assign outward velocity (explosionScatter)
        if (this.explosionScatter) {
          this.velocityX = this.explosionScatter.x;
          this.velocityY = this.explosionScatter.y;
          this.velocityZ = this.explosionScatter.z;
        }
        console.log('💥 Particle reached explosion center, starting explosion');
      }
      return;
    }

    if (this.phase === 'explosion') {
      // EXPLOSION PHASE: Particles burst outward from center
      this.phaseTime += timeStep;
      this.centerX += this.velocityX * timeStep;
      this.centerY += this.velocityY * timeStep;
      this.centerZ += this.velocityZ * timeStep;

      // Moderate rotation during explosion (reduced to prevent glitchy appearance)
      this.rotationX += this.rotationSpeedX * 80;
      this.rotationY += this.rotationSpeedY * 80;
      this.rotationZ += this.rotationSpeedZ * 80;

      // Subtle wobble effect during explosion
      const explosionProgress = this.phaseTime / this.explosionDuration;
      this.sy = Math.sin(explosionProgress * Math.PI * 20) * 0.2 + 0.8;

      // Check if explosion phase is complete
      if (this.phaseTime >= this.explosionDuration) {
        this.phase = 'settling';
        this.settlingTime = 0;
        // Dampen velocity for more realistic settling
        const damp = this.particleType === 'leaf' ? 0.2 : 0.6;
        this.velocityX *= damp;
        this.velocityY *= damp;
        this.velocityZ *= damp;
        console.log('💥 Particle explosion complete, entering settling phase');
      }
    } else {
      // SETTLING PHASE: Particles fall due to gravity with enhanced swing motion
      this.settlingTime += timeStep;
      this.swingPhase += this.swingFrequency * timeStep;

      // Apply gravity (reduced for slower fall)
      this.velocityY += this.gravity * this.fallSpeed;

      // Enhanced swing motion for realistic leaf-like debris movement
      const swingX = Math.sin(this.swingPhase) * this.swingAmplitude * 0.02;
      const swingY = Math.cos(this.swingPhase * 0.7) * this.swingAmplitude * 0.01;
      const swingZ = Math.sin(this.swingPhase * 0.5) * this.swingAmplitude * 0.003;

      // Additional cross-axis swing for more realistic motion
      const crossSwingX = Math.sin(this.swingPhase * 1.3) * this.swingAmplitude * 0.015;
      const crossSwingY = Math.cos(this.swingPhase * 0.9) * this.swingAmplitude * 0.008;

      // Apply swing forces
      this.velocityX += swingX + crossSwingX;
      this.velocityY += swingY + crossSwingY;
      this.velocityZ += swingZ;

      // Apply air resistance (more realistic for thin particles)
      this.velocityX *= this.airResistance;
      this.velocityY *= this.airResistance;
      this.velocityZ *= this.airResistance;

      // Update position
      this.centerX += this.velocityX * timeStep;
      this.centerY += this.velocityY * timeStep;
      this.centerZ += this.velocityZ * timeStep;

      // Clamp Z position to keep particles visible (but allow some depth)
      this.centerZ = Math.max(-3000, Math.min(1000, this.centerZ));

      // NO CANVAS BOUNDARY CONSTRAINTS - particles can freely move outside
      // This allows particles to naturally fall off screen or fly away

      // Rotation during fall (more varied for leaf particles)
      const rotationMultiplier = this.particleType === 'leaf' ? 0.8 : 0.4;
      this.rotationX += this.rotationSpeedX * rotationMultiplier;
      this.rotationY += this.rotationSpeedY * rotationMultiplier;
      this.rotationZ += this.rotationSpeedZ * rotationMultiplier;

      // Enhanced wobble effect during settling
      this.sy = Math.sin(this.swingPhase * 2) * 0.2 + 0.8;

      // Update rotation based on movement direction for realistic orientation
      this.r = Math.atan2(this.velocityY, this.velocityX) + Math.PI * 0.5;

      // Check if settling is complete (particles fall off screen or expire)
      const margin = 100; // Large margin to ensure particles are well off screen
      if (this.centerY > canvasHeight + margin ||
        this.centerX < -margin ||
        this.centerX > canvasWidth + margin ||
        this.centerZ > 1200 ||
        this.settlingTime >= this.settlingDuration) {
        this.complete = true;
        console.log('✅ Particle settled/left screen:', this.centerX, this.centerY, this.centerZ, 'Type:', this.particleType);
      }
    }

    // Decrease life
    this.life--;

    // Force completion if life runs out
    if (this.life <= 0 || (this.phase === 'settling' && this.settlingTime > this.settlingDuration + 8)) {
      this.complete = true;
      console.log('⏰ Particle expired:', this.centerX, this.centerY, this.centerZ);
    }
  }

  isAlive(): boolean {
    // Particle is alive if it has life left and is not complete
    if (this.life <= 0) {
      return false; // No life left
    }

    if (this.complete) {
      return false; // Animation complete
    }

    return true;
  }

  getAlpha(): number {
    // For fade particles, fade out during settling phase
    if (this.particleType === 'fade' && this.phase === 'settling') {
      const fadeProgress = this.settlingTime / this.settlingDuration;
      return Math.max(0, 1 - fadeProgress * 0.8);
    }

    // For fall particles, maintain full opacity
    return 1.0;
  }
}