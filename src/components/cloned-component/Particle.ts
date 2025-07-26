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
  particleType: 'fall' | 'fade';

  // Animation phases
  phase: 'explosion' | 'settling' = 'explosion';
  phaseTime: number = 0;
  
  // Explosion phase properties
  explosionDuration: number;
  explosionVelocityX: number = 0;
  explosionVelocityY: number = 0;
  explosionVelocityZ: number = 0;
  
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
    explosionDuration: number = 0.05, // 50ms explosion
    settlingDuration: number = 8,
    swingAmplitude: number = 150,
    particleType: 'fall' | 'fade' = 'fall',
    fallSpeed: number = 1.5,
    gravity: number = 5,
    airResistance: number = 0.98,
    p0?: { x: number; y: number; z: number },
    p1?: { x: number; y: number; z: number },
    p2?: { x: number; y: number; z: number },
    p3?: { x: number; y: number; z: number },
    swingFrequency: number = 1.0,
    swingPhase: number = 0.0
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
  }

  update(canvasWidth: number, canvasHeight: number) {
    const timeStep = 1 / 60; // 60fps timeStep

    if (this.phase === 'explosion') {
      // EXPLOSION PHASE (50ms quick explosion)
      this.phaseTime += timeStep;
      
      // Apply explosion velocities with easing
      const explosionProgress = this.phaseTime / this.explosionDuration;
      const easeOut = 1 - Math.pow(1 - explosionProgress, 3); // Ease out cubic
      
      // Update position based on explosion velocities
      this.centerX += this.velocityX * timeStep * easeOut;
      this.centerY += this.velocityY * timeStep * easeOut;
      this.centerZ += this.velocityZ * timeStep * easeOut;
      
      // Intense rotation during explosion
      this.rotationX += this.rotationSpeedX * 20;
      this.rotationY += this.rotationSpeedY * 20;
      this.rotationZ += this.rotationSpeedZ * 20;
      
      // Apply air resistance during explosion
      this.velocityX *= this.airResistance;
      this.velocityY *= this.airResistance;
      this.velocityZ *= this.airResistance;
      
      // Wobble effect during explosion
      this.sy = Math.sin(explosionProgress * Math.PI * 20) * 0.3 + 0.7;
      
      // Check if explosion phase is complete
      if (this.phaseTime >= this.explosionDuration) {
        this.phase = 'settling';
        this.settlingTime = 0;
        console.log('💥 Particle explosion complete, entering settling phase');
      }
      
    } else {
      // SETTLING PHASE (Realistic fall with swing)
      this.settlingTime += timeStep;
      this.swingPhase += this.swingFrequency * timeStep;
      
      // Apply gravity
      this.velocityY += this.gravity * this.fallSpeed;
      
      // Apply swing motion (realistic leaf-like movement)
      const swingX = Math.sin(this.swingPhase) * this.swingAmplitude * 0.01;
      const swingY = Math.cos(this.swingPhase * 0.7 + this.swingPhase) * this.swingAmplitude * 0.005;
      const swingZ = Math.sin(this.swingPhase * 0.5 + this.swingPhase) * this.swingAmplitude * 0.001; // Reduced Z swing
      
      // Apply swing forces
      this.velocityX += swingX;
      this.velocityY += swingY;
      this.velocityZ += swingZ;
      
      // Apply air resistance
      this.velocityX *= this.airResistance;
      this.velocityY *= this.airResistance;
      this.velocityZ *= this.airResistance;
      
      // Update position
      this.centerX += this.velocityX * timeStep;
      this.centerY += this.velocityY * timeStep;
      this.centerZ += this.velocityZ * timeStep;
      
      // Clamp Z position to keep particles visible
      this.centerZ = Math.max(-2000, Math.min(500, this.centerZ));
      
      // Realistic rotation during fall
      this.rotationX += this.rotationSpeedX * 0.4;
      this.rotationY += this.rotationSpeedY * 0.4;
      this.rotationZ += this.rotationSpeedZ * 0.4;
      
      // Gentle wobble effect
      this.sy = Math.sin(this.swingPhase * 2) * 0.1 + 0.9;
      
      // Update rotation based on movement direction
      this.r = Math.atan2(this.velocityY, this.velocityX) + Math.PI * 0.5;
      
      // Check if settling is complete
      if (this.centerY > canvasHeight + 100 || 
          this.centerX < -100 || 
          this.centerX > canvasWidth + 100 ||
          this.centerZ > 1000 || // More reasonable Z limit
          this.settlingTime >= this.settlingDuration) {
        this.complete = true;
        console.log('✅ Particle settled/left screen:', this.centerX, this.centerY, this.centerZ, 'Type:', this.particleType);
      }
    }

    // Decrease life
    this.life--;
    
    // Force completion if life runs out or stuck too long
    if (this.life <= 0 || (this.phase === 'settling' && this.settlingTime > this.settlingDuration + 5)) {
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
