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

  // NEW: Explosion enhancement properties
  explosionStartVelocity: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  explosionEndVelocity: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  explosionCurveOffset: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  explosionRotationMultiplier: number = 1;
  opacityFadeType: 'immediate' | 'delayed' | 'late' = 'immediate';

  // NEW: Spiral trajectory properties
  spiralRadius: number = 0;
  spiralFrequency: number = 0;
  spiralPhase: number = 0;
  trajectoryDirection: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  trajectoryLength: number = 0;

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

  // Wind properties
  windStrength: number;
  windDirection: number;

  // Animation properties
  r: number = 0;
  sy: number = 1;
  // If true, particle starts transparent and fades in during explosion phase
  fadeInExplosion: boolean = false;
  complete: boolean = false;

  // Mode for color selection (0 = jackpot, 1 = bonus)
  mode: number = 0;

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
    explosionScatter: { x: number; y: number; z: number } | null = null,
    windStrength: number = 0.0,
    windDirection: number = 0.0,
    fadeInExplosion: boolean = false,
    mode: number = 0
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
    this.windStrength = windStrength;
    this.windDirection = windDirection;
    this.fadeInExplosion = fadeInExplosion;
    this.mode = mode;

    // NEW: Enhanced explosion setup
    this.setupEnhancedExplosion(p0, p1, p2, p3, explosionScatter);

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

  // NEW: Setup enhanced explosion with gun-like effect
  private setupEnhancedExplosion(
    p0?: { x: number; y: number; z: number },
    p1?: { x: number; y: number; z: number },
    p2?: { x: number; y: number; z: number },
    p3?: { x: number; y: number; z: number },
    explosionScatter?: { x: number; y: number; z: number } | null
  ) {
    if (!explosionScatter) return;

    // Calculate trajectory direction and length
    this.trajectoryDirection = {
      x: explosionScatter.x,
      y: explosionScatter.y,
      z: explosionScatter.z
    };

    // Normalize direction
    const length = Math.sqrt(
      this.trajectoryDirection.x * this.trajectoryDirection.x +
      this.trajectoryDirection.y * this.trajectoryDirection.y +
      this.trajectoryDirection.z * this.trajectoryDirection.z
    );

    this.trajectoryLength = length;
    this.trajectoryDirection.x /= length;
    this.trajectoryDirection.y /= length;
    this.trajectoryDirection.z /= length;

    // --- Spiral parameters you can TWEAK easily ---
    const SPIRAL_RADIUS_MULTIPLIER = 0.35;   // from 0.15 → 0.35  (much wider)
    const MIN_SPIRAL_ROTATIONS = 0.5;    // half-turn is enough
    const MAX_SPIRAL_ROTATIONS = 1.2;

    // Setup spiral properties (spiral around the axis)
    this.spiralRadius = length * SPIRAL_RADIUS_MULTIPLIER;
    this.spiralFrequency =
      MIN_SPIRAL_ROTATIONS + Math.random() * (MAX_SPIRAL_ROTATIONS - MIN_SPIRAL_ROTATIONS);
    this.spiralPhase = Math.random() * Math.PI * 2; // Random starting phase

    // EASE-IN explosion: start fast, slow down at the end
    // Use actual explosion duration for velocity calculation
    this.explosionStartVelocity = {
      x: explosionScatter.x / this.explosionDuration * 2.0, // Start at 2x speed
      y: explosionScatter.y / this.explosionDuration * 2.0,
      z: explosionScatter.z / this.explosionDuration * 2.0
    };

    this.explosionEndVelocity = {
      x: explosionScatter.x / this.explosionDuration * 0.1, // End at 0.1x speed
      y: explosionScatter.y / this.explosionDuration * 0.1,
      z: explosionScatter.z / this.explosionDuration * 0.1
    };

    // Add curved trajectory offset for more natural movement
    const curveStrength = 0.3;
    this.explosionCurveOffset = {
      x: (Math.random() - 0.5) * explosionScatter.x * curveStrength,
      y: (Math.random() - 0.5) * explosionScatter.y * curveStrength,
      z: (Math.random() - 0.5) * explosionScatter.z * curveStrength
    };

    // --- SPIN parameters you can TWEAK easily ---
    const MIN_SPIN_MULTIPLIER = 5;
    const MAX_SPIN_MULTIPLIER = 10;
    const SPIN_BASE_SPEED = 0.1;   // degrees added per frame-step
    // Reduced spin to a more reasonable range
    this.explosionRotationMultiplier =
      (MIN_SPIN_MULTIPLIER + Math.random() * (MAX_SPIN_MULTIPLIER - MIN_SPIN_MULTIPLIER)) * 0.01;

    // Opacity fade-in timing: 70% immediate, 20% delayed, 10% late
    const fadeRoll = Math.random();
    if (fadeRoll < 0.02) {
      this.opacityFadeType = 'immediate'; // 70% - start visible
    } else if (fadeRoll < 0.1) {
      this.opacityFadeType = 'delayed'; // 20% - fade in by 50%
    } else {
      this.opacityFadeType = 'late'; // 10% - fade in by 80%
    }
  }

  // NEW: Calculate spiral offset around trajectory
  private getSpiralOffset(progress: number): { x: number; y: number; z: number } {
    const spiralAngle = this.spiralPhase + progress * this.spiralFrequency * Math.PI * 2;

    // Calculate perpendicular vectors to trajectory direction
    const perp1 = { x: -this.trajectoryDirection.y, y: this.trajectoryDirection.x, z: 0 };
    const perp2 = {
      x: this.trajectoryDirection.y * this.trajectoryDirection.z,
      y: -this.trajectoryDirection.x * this.trajectoryDirection.z,
      z: this.trajectoryDirection.x * this.trajectoryDirection.x + this.trajectoryDirection.y * this.trajectoryDirection.y
    };

    // Normalize perpendicular vectors
    const perp1Len = Math.sqrt(perp1.x * perp1.x + perp1.y * perp1.y + perp1.z * perp1.z);
    const perp2Len = Math.sqrt(perp2.x * perp2.x + perp2.y * perp2.y + perp2.z * perp2.z);

    perp1.x /= perp1Len;
    perp1.y /= perp1Len;
    perp1.z /= perp1Len;

    perp2.x /= perp2Len;
    perp2.y /= perp2Len;
    perp2.z /= perp2Len;

    // flare-out for the first 40 % of travel, then fall back in
    const flare = progress < 0.4 ? progress / 0.4         // 0 → 1
      : 1 - (progress - 0.4) / 0.6; // 1 → 0
    const spiralRadius = this.spiralRadius * flare;
    const offsetX = (perp1.x * Math.cos(spiralAngle) + perp2.x * Math.sin(spiralAngle)) * spiralRadius;
    const offsetY = (perp1.y * Math.cos(spiralAngle) + perp2.y * Math.sin(spiralAngle)) * spiralRadius;
    const offsetZ = (perp1.z * Math.cos(spiralAngle) + perp2.z * Math.sin(spiralAngle)) * spiralRadius;

    return { x: offsetX, y: offsetY, z: offsetZ };
  }

  // NEW: Calculate ease-out (slow start – fast end) velocity during explosion
  private getExplosionVelocity(progress: number): { x: number; y: number; z: number } {
    // Quadratic ease-out  → starts slow, ends fast
    // const easeOutProgress = Math.pow(1 - progress, 2);
    // const easeOutProgress = progress;
    const easeOutProgress = 1 - Math.pow(progress, 2);

    return {
      x:
        this.explosionStartVelocity.x +
        (this.explosionEndVelocity.x - this.explosionStartVelocity.x) * easeOutProgress,
      y:
        this.explosionStartVelocity.y +
        (this.explosionEndVelocity.y - this.explosionStartVelocity.y) * easeOutProgress,
      z:
        this.explosionStartVelocity.z +
        (this.explosionEndVelocity.z - this.explosionStartVelocity.z) * easeOutProgress,
    };
  }

  // NEW: Calculate curved trajectory offset
  private getCurvedTrajectoryOffset(progress: number): { x: number; y: number; z: number } {
    // Sine wave curve for natural movement
    const curveProgress = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5;

    return {
      x: this.explosionCurveOffset.x * curveProgress,
      y: this.explosionCurveOffset.y * curveProgress,
      z: this.explosionCurveOffset.z * curveProgress
    };
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
      // ENHANCED EXPLOSION PHASE: Spiral trajectory with extreme rotation
      this.phaseTime += timeStep;
      const explosionProgress = Math.min(1, this.phaseTime / this.explosionDuration);

      // Calculate ease-in velocity
      const currentVelocity = this.getExplosionVelocity(explosionProgress);

      // Calculate spiral offset around trajectory
      const spiralOffset = this.getSpiralOffset(explosionProgress);

      // Update position with ease-in velocity and spiral trajectory
      this.centerX += (currentVelocity.x + spiralOffset.x) * timeStep;
      this.centerY += (currentVelocity.y + spiralOffset.y) * timeStep;
      this.centerZ += (currentVelocity.z + spiralOffset.z) * timeStep;

      // Prevent particles from crossing the camera plane (Z > 0)
      if (this.centerZ > -50) {
        this.centerZ = -50; // stop 50px in front of camera
      }

      // Controlled rotation (spin) during explosion – adjust via MIN/MAX_SPIN_MULTIPLIER above
      // Finer self-spin control – make it easy to adjust from one constant
      const SPIN_BASE_SPEED = 5;  // lower = less self rotation
      this.rotationX += this.rotationSpeedX * this.explosionRotationMultiplier * SPIN_BASE_SPEED;
      this.rotationY += this.rotationSpeedY * this.explosionRotationMultiplier * SPIN_BASE_SPEED;
      this.rotationZ += this.rotationSpeedZ * this.explosionRotationMultiplier * SPIN_BASE_SPEED;

      // Enhanced wobble effect during explosion
      this.sy = Math.sin(explosionProgress * Math.PI * 50) * 0.4 + 0.6; // More dramatic wobble

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

      // Configurable wind effect
      const windX = Math.cos(this.windDirection) * this.windStrength;
      const windY = Math.sin(this.windDirection) * this.windStrength;

      // Reduced swing motion (can be disabled by setting swingAmplitude to 0)
      const swingX = Math.sin(this.swingPhase) * this.swingAmplitude * 0.02;
      const swingY = Math.cos(this.swingPhase * 0.7) * this.swingAmplitude * 0.01;
      const swingZ = Math.sin(this.swingPhase * 0.5) * this.swingAmplitude * 0.001;

      // Apply wind and swing forces
      this.velocityX += windX + swingX;
      this.velocityY += windY + swingY;
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
    // NEW: Enhanced opacity fade-in with specific timing requirements
    if (this.phase === 'approach') {
      return 0.0; // Always transparent during approach
    }

    if (this.phase === 'explosion') {
      const explosionProgress = Math.min(1, this.phaseTime / this.explosionDuration);

      // Handle different fade-in types based on timing requirements
      if (this.opacityFadeType === 'immediate') {
        // 70% of particles: start visible immediately
        return 1.0;
      } else if (this.opacityFadeType === 'delayed') {
        // 20% of particles: fade in by 50% of explosion
        const fadeProgress = Math.min(1, explosionProgress / 0.5);
        return fadeProgress;
      } else {
        // 10% of particles: fade in by 80% of explosion
        const fadeProgress = Math.min(1, explosionProgress / 0.8);
        return fadeProgress;
      }
    }

    // For fade particles, fade out during settling phase
    if (this.particleType === 'fade' && this.phase === 'settling') {
      const fadeProgress = this.settlingTime / this.settlingDuration;
      return Math.max(0, 1 - fadeProgress * 0.8);
    }

    // For fall particles, maintain full opacity
    return 1.0;
  }
}