export class Particle {
  centerX: number;
  centerY: number;
  centerZ: number; // Add Z position for 3D movement
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
  life: number; // Particle lifetime
  maxLife: number; // Maximum lifetime

  // Bezier curve properties (from reference code)
  p0: { x: number; y: number; z: number }; // Start point with Z
  p1: { x: number; y: number; z: number }; // Control point 1 with Z
  p2: { x: number; y: number; z: number }; // Control point 2 with Z
  p3: { x: number; y: number; z: number }; // End point with Z
  time: number = 0; // Current time along curve
  duration: number; // Total duration of animation
  complete: boolean = false;

  // Animation properties (from reference code)
  r: number = 0; // Rotation based on movement direction
  sy: number = 1; // Scale Y for wobble effect

  // Autumn leaf settling properties
  settlingPhase: boolean = false; // Whether we're in settling phase
  settlingTime: number = 0; // Time in settling phase
  settlingDuration: number = 0; // Duration of settling phase
  leafWobble: number = 0; // Leaf wobble effect
  leafWobbleSpeed: number = 0; // Speed of leaf wobble

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
    life: number = 300, // Default lifetime
    p0?: { x: number; y: number; z: number },
    p1?: { x: number; y: number; z: number },
    p2?: { x: number; y: number; z: number },
    p3?: { x: number; y: number; z: number }
  ) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.centerZ = 0; // Initialize Z position
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

    // Bezier curve setup (from reference code) - now with Z coordinates
    this.p0 = p0 || { x: centerX, y: centerY, z: 0 };
    this.p1 = p1 || { x: centerX, y: centerY, z: 0 };
    this.p2 = p2 || { x: centerX, y: centerY, z: 0 };
    this.p3 = p3 || { x: centerX, y: centerY, z: 0 };
    this.duration = 2 + Math.random() * 1; // 2-3 seconds for explosion phase
    
    // Settling phase properties
    this.settlingDuration = 12 + Math.random() * 8; // 12-20 seconds for settling
    this.leafWobbleSpeed = 0.3 + Math.random() * 0.7; // Slower wobble speed
  }

  // Cubic Bezier curve calculation (from reference code) - now with Z coordinates
  private cubeBezier(
    p0: { x: number; y: number; z: number },
    c0: { x: number; y: number; z: number },
    c1: { x: number; y: number; z: number },
    p1: { x: number; y: number; z: number },
    t: number
  ) {
    const nt = 1 - t;
    return {
      x:
        nt * nt * nt * p0.x +
        3 * nt * nt * t * c0.x +
        3 * nt * t * t * c1.x +
        t * t * t * p1.x,
      y:
        nt * nt * nt * p0.y +
        3 * nt * nt * t * c0.y +
        3 * nt * t * t * c1.y +
        t * t * t * p1.y,
      z:
        nt * nt * nt * p0.z +
        3 * nt * nt * t * c0.z +
        3 * nt * t * t * c1.z +
        t * t * t * p1.z,
    };
  }

  // Easing function (from reference code)
  private easeOutCubic(t: number, b: number, c: number, d: number): number {
    t /= d;
    t--;
    return c * (t * t * t + 1) + b;
  }

  // Ease-in function for explosion
  private easeInCubic(t: number, b: number, c: number, d: number): number {
    t /= d;
    return c * t * t * t + b;
  }

  // Smooth ease-in-out for explosion
  private easeInOutCubic(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t * t + b;
    t -= 2;
    return c / 2 * (t * t * t + 2) + b;
  }

  update(canvasWidth: number, canvasHeight: number) {
    // Update time along Bezier curve (from reference code)
    this.time = Math.min(this.duration, this.time + 1 / 60); // 60fps timeStep

    if (!this.settlingPhase) {
      // EXPLOSION PHASE
      // Calculate position along Bezier curve
      const f = this.easeInOutCubic(this.time, 0, 1, this.duration);
      const p = this.cubeBezier(this.p0, this.p1, this.p2, this.p3, f);

      // Calculate movement direction for rotation (from reference code) - now 3D
      const dx = p.x - this.centerX;
      const dy = p.y - this.centerY;
      const dz = p.z - this.centerZ;
      this.r = Math.atan2(dy, dx) + Math.PI * 0.5; // HALF_PI

      // Wobble effect (from reference code)
      this.sy = Math.sin(Math.PI * f * 10);

      // Update position - now including Z
      this.centerX = p.x;
      this.centerY = p.y;
      this.centerZ = p.z;

      // Update rotation angles
      this.rotationX += this.rotationSpeedX;
      this.rotationY += this.rotationSpeedY;
      this.rotationZ += this.rotationSpeedZ;

      // Check if explosion phase is complete
      if (this.time === this.duration) {
        this.settlingPhase = true;
        this.settlingTime = 0;
        console.log('🍂 Particle entered settling phase at:', this.centerX, this.centerY, this.centerZ);
      }
    } else {
      // SETTLING PHASE (Autumn leaf behavior)
      this.settlingTime += 1 / 60; // 60fps timeStep
      
      // Much slower downward movement with gentle swaying
      const settlingProgress = this.settlingTime / this.settlingDuration;
      const fallDistance = 300; // Distance to fall during settling
      
      // Very gentle swaying motion (like autumn leaves)
      const swayX = Math.sin(this.settlingTime * 0.3) * 80; // Side-to-side sway
      const swayY = Math.sin(this.settlingTime * 0.2) * 50; // Forward-back sway
      const swayZ = Math.sin(this.settlingTime * 0.4) * 20; // Z-axis sway
      
      // Update position with very slow falling and swaying
      this.centerX += swayX * 0.005; // Very slow sway
      this.centerY += Math.max(fallDistance * 0.0005 + swayY * 0.005, 0.1); // Ensure minimum fall speed
      this.centerZ += swayZ * 0.002 + (Math.random() - 0.5) * 0.2; // Slight Z drift
      
      // Autumn leaf rotation (very slow, natural)
      this.rotationX += this.rotationSpeedX * 0.05; // Much slower rotation
      this.rotationY += this.rotationSpeedY * 0.05;
      this.rotationZ += this.rotationSpeedZ * 0.05;
      
      // Leaf wobble effect (gentler)
      this.leafWobble += this.leafWobbleSpeed * 0.005;
      this.sy = Math.sin(this.leafWobble) * 0.2 + 0.8; // Very gentle wobble
      
      // Update rotation based on movement direction
      this.r = Math.atan2(swayY, swayX) + Math.PI * 0.5;
      
      // Check if settling is complete
      if (this.settlingTime >= this.settlingDuration) {
        this.complete = true;
        console.log('✅ Particle settled at:', this.centerX, this.centerY, this.centerZ);
      }
    }

    // Decrease life
    this.life--;
    
    // Force completion if life runs out
    if (this.life <= 0) {
      this.complete = true;
      console.log('⏰ Particle expired due to life:', this.centerX, this.centerY, this.centerZ);
    }
  }

  isAlive(): boolean {
    // Particle is alive if it has life left and is not complete
    // Also ensure it's not stuck in settling phase for too long
    const maxSettlingTime = this.settlingDuration + 2; // Allow 2 seconds extra
    
    if (this.life <= 0) {
      return false; // No life left
    }
    
    if (this.complete) {
      return false; // Animation complete
    }
    
    if (this.settlingPhase && this.settlingTime > maxSettlingTime) {
      this.complete = true; // Force completion if stuck too long
      console.log('⏰ Particle forced to complete (stuck too long):', this.centerX, this.centerY, this.centerZ);
      return false;
    }
    
    return true;
  }

  getAlpha(): number {
    // Fade out as particle ages
    return this.life / this.maxLife;
  }
}
