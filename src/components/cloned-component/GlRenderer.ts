import { Particle } from "./Particle";
import { FragmentShaderSource, VertexShaderSource } from "./shaders";

// Animation configuration interface
export interface ExplosionConfig {
  particleCount: number;
  explosionDuration: number;
  explosionForce: number;
  particleRadiusMin: number;
  particleRadiusMax: number;
  settlingDuration: number;
  swingAmplitude: number;
  fallSpeed: number;
  gravity: number;
  airResistance: number;
  zScatter: number;
  cameraDistance: number;
  centerX: number;
  centerY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  metallic: number;
  roughness: number;
  goldColor: [number, number, number, number];
}

export class GlRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private centerUniformLocation: WebGLUniformLocation | null = null;
  private radiusUniformLocation: WebGLUniformLocation | null = null;
  private rotationXUniformLocation: WebGLUniformLocation | null = null;
  private rotationYUniformLocation: WebGLUniformLocation | null = null;
  private rotationZUniformLocation: WebGLUniformLocation | null = null;
  private colorUniformLocation: WebGLUniformLocation | null = null;
  private scaleUniformLocation: WebGLUniformLocation | null = null;
  private lightPositionUniformLocation: WebGLUniformLocation | null = null;
  private viewPositionUniformLocation: WebGLUniformLocation | null = null;
  private metallicUniformLocation: WebGLUniformLocation | null = null;
  private roughnessUniformLocation: WebGLUniformLocation | null = null;
  private depthAUniformLocation: WebGLUniformLocation | null = null;
  private depthBUniformLocation: WebGLUniformLocation | null = null;
  private depthScaleUniformLocation: WebGLUniformLocation | null = null;
  private zPositionUniformLocation: WebGLUniformLocation | null = null;

  // Animation properties
  private animationId: number | null = null;

  // Particles
  private particles: Particle[] = [];

  // Lighting properties - much further away for better depth perception
  private lightPosition: [number, number, number] = [0, 0, 8000]; // Light much further away
  private viewPosition: [number, number, number] = [0, 0, 10000]; // View position much further away

  // Default configuration
  private defaultConfig: ExplosionConfig = {
    particleCount: 300,
    explosionDuration: 0.01, // even quicker explosion
    explosionForce: 75,
    particleRadiusMin: 0.2,
    particleRadiusMax: 0.5,
    settlingDuration: 5,
    swingAmplitude: 150,
    fallSpeed: 1.5,
    gravity: 5,
    airResistance: 0.98,
    zScatter: 1000,
    cameraDistance: 10000,
    centerX: 0.5, // normalized (0-1)
    centerY: 0.8, // normalized (0-1)
    minX: 0.1, // normalized (0-1)
    maxX: 0.9, // normalized (0-1)
    minY: 0.1, // normalized (0-1)
    maxY: 0.95, // normalized (0-1)
    metallic: 0.98,
    roughness: 0.08,
    goldColor: [1.0, 0.8, 0.2, 1.0], // #FFCC33
  };

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;

    const vertexShader = this.createShader(
      this.gl.VERTEX_SHADER,
      VertexShaderSource
    );
    const fragmentShader = this.createShader(
      this.gl.FRAGMENT_SHADER,
      FragmentShaderSource
    );

    this.program = this.createProgram(vertexShader, fragmentShader);
    this.init();
  }

  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) {
      throw new Error("Failed to create shader");
    }
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`An error occurred compiling the shaders: ${info}`);
    }

    return shader;
  }

  private createProgram(
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ): WebGLProgram {
    const program = this.gl.createProgram();
    if (!program) {
      throw new Error("Failed to create program");
    }
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`An error occurred linking the program: ${info}`);
    }

    return program;
  }

  // Create bomb explosion effect with particles starting from deep Z-axis
  createBombExplosion(
    burstX: number = this.gl.canvas.width / 2,
    burstY: number = this.gl.canvas.height / 2,
    config: ExplosionConfig = this.defaultConfig
  ) {
    console.log('🎯 Creating bomb explosion at:', burstX, burstY, 'with config:', config);
    
    // Clear existing particles
    this.particles = [];
    console.log('🧹 Cleared existing particles');

    // Update camera and lighting positions based on config
    this.viewPosition = [0, 0, config.cameraDistance];
    this.lightPosition = [0, 0, config.cameraDistance * 0.8];

    // Gold palette: black, dark brown, bronze, gold, #FFCC33
    const goldPalette: [number, number, number, number][] = [
      [0.05, 0.04, 0.03, 1.0], // near black
      [0.18, 0.13, 0.05, 1.0], // dark brown
      [0.55, 0.38, 0.13, 1.0], // bronze
      [0.85, 0.65, 0.13, 1.0], // gold
      [1.0, 0.8, 0.2, 1.0],    // #FFCC33
    ];

    const canvasWidth = this.gl.canvas.width;
    const canvasHeight = this.gl.canvas.height;
    const minX = config.minX * canvasWidth;
    const maxX = config.maxX * canvasWidth;
    const minY = config.minY * canvasHeight;
    const maxY = config.maxY * canvasHeight;
    const explosionCenterX = (config.centerX ?? 0.5) * canvasWidth;
    const explosionCenterY = (config.centerY ?? 0.8) * canvasHeight;

    for (let i = 0; i < config.particleCount; i++) {
      // Start from Z=-1000 (in front of camera)
      const startZ = -1000;
      
      // Uniform spherical distribution, but bias phi to keep more particles in visible area
      const theta = Math.random() * 2 * Math.PI;
      // Bias phi to be closer to pi/2 (xy plane) for more even x/y scatter
      const phi = Math.acos(1 - 2 * Math.random());
      const explosionRadius = config.explosionForce + Math.random() * config.explosionForce * 0.3;
      
      // Calculate explosion velocity in all directions
      const velocityX = Math.sin(phi) * Math.cos(theta) * explosionRadius;
      const velocityY = Math.sin(phi) * Math.sin(theta) * explosionRadius;
      const velocityZ = Math.cos(phi) * explosionRadius * 0.5; // Reduce Z to keep more in view
      
      // Calculate explosion end point in 3D space (ensure it's in front of camera)
      let endX = explosionCenterX + velocityX;
      let endY = explosionCenterY + velocityY;
      const endZ = startZ + velocityZ;
      
      // Clamp endX, endY to user-specified bounds for 80% of particles
      if (i < Math.floor(config.particleCount * 0.8)) {
        endX = Math.max(minX, Math.min(maxX, endX));
        endY = Math.max(minY, Math.min(maxY, endY));
      }
      
      // Control points for smooth explosion curve
      const midX = explosionCenterX + (endX - explosionCenterX) * 0.3;
      const midY = explosionCenterY + (endY - explosionCenterY) * 0.3;
      const midZ = startZ + (endZ - startZ) * 0.3;
      
      // Final settling position with swing (ensure it's below screen)
      const settleX = endX + (Math.random() - 0.5) * config.swingAmplitude;
      const settleY = canvasHeight + 100; // Below screen
      const settleZ = endZ + (Math.random() - 0.5) * config.zScatter * 0.1; // Minimal Z variation for settling

      // Particle properties
      const radius = config.particleRadiusMin + Math.random() * (config.particleRadiusMax - config.particleRadiusMin);
      const scaleX = 0.04 + Math.random() * 0.12;
      const scaleY = 0.05 + Math.random() * 0.15;

      // Individualized swing
      const swingAmplitude = config.swingAmplitude * (0.7 + Math.random() * 0.6); // 70%-130%
      const swingFrequency = 0.5 + Math.random() * 2.0;
      const swingPhase = Math.random() * Math.PI * 2;

      // More randomized rotation speeds for falling
      const rotationSpeedX = (Math.random() - 0.5) * 0.2;
      const rotationSpeedY = (Math.random() - 0.5) * 0.2;
      const rotationSpeedZ = (Math.random() - 0.5) * 0.2;

      // Assign a random gold shade to each particle
      const color: [number, number, number, number] = goldPalette[Math.floor(Math.random() * goldPalette.length)];

      // Metallic properties for golden particles
      const metallic = config.metallic;
      const roughness = config.roughness;

      // Depth parameters for golden particle shape
      const depthA = 80.0 + Math.random() * 160.0;
      const depthB = 70.0 + Math.random() * 140.0;
      const depthScale = 0.04 + Math.random() * 0.12;

      // Particle type: 90% fall, 10% fade
      const particleType = Math.random() < 0.1 ? 'fade' : 'fall';
      
      // Lifetime based on particle type
      const life = particleType === 'fade' 
        ? 600 + Math.random() * 400  // Shorter for fade particles
        : 1200 + Math.random() * 600; // Longer for fall particles

      // Bezier control points for explosion + settling animation
      const p0 = { x: explosionCenterX, y: explosionCenterY, z: startZ };
      const p1 = { x: midX, y: midY, z: midZ };
      const p2 = { x: endX, y: endY, z: endZ };
      const p3 = { x: settleX, y: settleY, z: settleZ };

      this.particles.push(
        new Particle(
          explosionCenterX,
          explosionCenterY,
          radius,
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
          life,
          config.explosionDuration, // even quicker explosion
          config.settlingDuration,
          swingAmplitude,
          particleType,
          config.fallSpeed,
          config.gravity,
          config.airResistance,
          p0,
          p1,
          p2,
          p3,
          swingFrequency,
          swingPhase
        )
      );
    }
    
    console.log(`✨ Created ${this.particles.length} particles for explosion`);
  }

  private generateRandomParticles(count: number) {
    console.log('🎲 generateRandomParticles called with count:', count);
    // Create bomb explosion from center with default config
    this.createBombExplosion(
      this.gl.canvas.width / 2,
      this.gl.canvas.height / 2,
      this.defaultConfig
    );
  }

  // Public method to trigger bomb explosion
  public triggerBombExplosion(
    burstX?: number, 
    burstY?: number,
    config?: ExplosionConfig
  ) {
    const x = burstX ?? this.gl.canvas.width / 2;
    const y = burstY ?? this.gl.canvas.height / 2;
    const explosionConfig = config ?? this.defaultConfig;
    this.createBombExplosion(x, y, explosionConfig);
  }

  // Get current default config
  public getDefaultConfig(): ExplosionConfig {
    return { ...this.defaultConfig };
  }

  // Update default config
  public updateConfig(newConfig: Partial<ExplosionConfig>) {
    this.defaultConfig = { ...this.defaultConfig, ...newConfig };
  }

  private init() {
    var positionAttributeLocation = this.gl.getAttribLocation(
      this.program,
      "a_position"
    );
    var resolutionUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_resolution"
    );
    this.centerUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_center"
    );
    this.radiusUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_radius"
    );
    this.rotationXUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_rotationX"
    );
    this.rotationYUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_rotationY"
    );
    this.rotationZUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_rotationZ"
    );
    this.colorUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_color"
    );
    this.scaleUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_scale"
    );
    this.lightPositionUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_lightPosition"
    );
    this.viewPositionUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_viewPosition"
    );
    this.metallicUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_metallic"
    );
    this.roughnessUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_roughness"
    );
    this.depthAUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_depthA"
    );
    this.depthBUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_depthB"
    );
    this.depthScaleUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_depthScale"
    );
    this.zPositionUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_zPosition"
    );

    // Create a buffer for circle vertices
    var positionBuffer = this.gl.createBuffer();

    // Bind it to ARRAY_BUFFER
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

    // Generate circle vertices
    const segments = 64; // Number of segments to approximate the circle
    const radius = 75; // Circle radius in pixels

    // Don't generate particles here - they will be created by triggerBombExplosion

    var positions: number[] = [];

    // Generate vertices for a circle using triangles
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * 2 * Math.PI;
      const angle2 = ((i + 1) / segments) * 2 * Math.PI;

      // Center vertex
      positions.push(0, 0);
      // First edge vertex
      positions.push(angle1, radius);
      // Second edge vertex
      positions.push(angle2, radius);
    }

    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(positions),
      this.gl.STATIC_DRAW
    );

    // Tell WebGL how to convert from clip space to pixels
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    // Clear the canvas
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Enable blending for alpha transparency
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Tell it to use our program (pair of shaders)
    this.gl.useProgram(this.program);

    // Turn on the attribute
    this.gl.enableVertexAttribArray(positionAttributeLocation);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2; // 2 components per iteration
    var type = this.gl.FLOAT; // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0; // start at the beginning of the buffer
    this.gl.vertexAttribPointer(
      positionAttributeLocation,
      size,
      type,
      normalize,
      stride,
      offset
    );

    // Set uniforms
    this.gl.uniform2f(
      resolutionUniformLocation,
      this.gl.canvas.width,
      this.gl.canvas.height
    );
    if (this.radiusUniformLocation) {
      this.gl.uniform1f(this.radiusUniformLocation, radius);
    }
    if (this.rotationXUniformLocation) {
      this.gl.uniform1f(this.rotationXUniformLocation, 0);
    }
    if (this.rotationYUniformLocation) {
      this.gl.uniform1f(this.rotationYUniformLocation, 0);
    }
    if (this.rotationZUniformLocation) {
      this.gl.uniform1f(this.rotationZUniformLocation, 0);
    }
    if (this.scaleUniformLocation) {
      this.gl.uniform2f(this.scaleUniformLocation, 1, 1); // Default scale
    }

    // Set lighting uniforms - much further away for better depth perception
    const canvasCenterX = this.gl.canvas.width / 2;
    const canvasCenterY = this.gl.canvas.height / 2;
    this.lightPosition = [canvasCenterX + 800, canvasCenterY - 400, this.defaultConfig.cameraDistance * 0.8];
    this.viewPosition = [canvasCenterX, canvasCenterY, this.defaultConfig.cameraDistance];

    if (this.lightPositionUniformLocation) {
      this.gl.uniform3f(this.lightPositionUniformLocation, ...this.lightPosition);
    }
    if (this.viewPositionUniformLocation) {
      this.gl.uniform3f(this.viewPositionUniformLocation, ...this.viewPosition);
    }
    if (this.metallicUniformLocation) {
      this.gl.uniform1f(this.metallicUniformLocation, 0.5); // Default metallic
    }
    if (this.roughnessUniformLocation) {
      this.gl.uniform1f(this.roughnessUniformLocation, 0.5); // Default roughness
    }
    if (this.depthAUniformLocation) {
      this.gl.uniform1f(this.depthAUniformLocation, 1000.0); // Default depthA
    }
    if (this.depthBUniformLocation) {
      this.gl.uniform1f(this.depthBUniformLocation, 800.0); // Default depthB
    }
    if (this.depthScaleUniformLocation) {
      this.gl.uniform1f(this.depthScaleUniformLocation, 0.5); // Default depthScale
    }
    if (this.zPositionUniformLocation) {
      this.gl.uniform1f(this.zPositionUniformLocation, 0.0); // Initialize Z position
    }
  }

  private updatePosition() {
    const canvasWidth = this.gl.canvas.width;
    const canvasHeight = this.gl.canvas.height;

    // Update particles and remove dead ones
    const initialCount = this.particles.length;
    this.particles = this.particles.filter((particle) => {
      particle.update(canvasWidth, canvasHeight);
      return particle.isAlive();
    });
    
    const finalCount = this.particles.length;
    if (initialCount !== finalCount) {
      console.log(`📊 Particles: ${initialCount} -> ${finalCount} (removed ${initialCount - finalCount})`);
    }
    
    // Log if all particles are gone
    if (finalCount === 0 && initialCount > 0) {
      console.log('🎬 All particles have settled or expired');
    }
  }

  private animate = () => {
    // Clear the canvas
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Update all particles
    this.updatePosition();

    // Ensure light position stays constant
    if (this.lightPositionUniformLocation) {
      this.gl.uniform3f(this.lightPositionUniformLocation, ...this.lightPosition);
    }
    if (this.viewPositionUniformLocation) {
      this.gl.uniform3f(this.viewPositionUniformLocation, ...this.viewPosition);
    }

    // Draw each particle
    this.particles.forEach((particle) => {
      this.drawParticle(particle);
    });

    // Continue animation
    this.animationId = requestAnimationFrame(this.animate);
  };

  private drawParticle(particle: Particle) {
    // Set uniforms for this particle (with safety checks)
    if (this.centerUniformLocation) {
      this.gl.uniform2f(
        this.centerUniformLocation,
        particle.centerX,
        particle.centerY
      );
    }
    
    if (this.radiusUniformLocation) {
      this.gl.uniform1f(this.radiusUniformLocation, particle.radius);
    }

    // Use Bezier curve rotation and wobble effects (from reference code)
    if (this.rotationXUniformLocation) {
      this.gl.uniform1f(this.rotationXUniformLocation, particle.rotationX);
    }
    if (this.rotationYUniformLocation) {
      this.gl.uniform1f(this.rotationYUniformLocation, particle.rotationY);
    }
    if (this.rotationZUniformLocation) {
      this.gl.uniform1f(this.rotationZUniformLocation, particle.r); // Use Bezier direction rotation
    }

    // Apply alpha fading based on particle life
    const alpha = particle.getAlpha();
    if (this.colorUniformLocation) {
      this.gl.uniform4f(
        this.colorUniformLocation,
        particle.color[0],
        particle.color[1],
        particle.color[2],
        alpha
      );
    }

    // Apply wobble effect to scale (from reference code)
    if (this.scaleUniformLocation) {
      this.gl.uniform2f(
        this.scaleUniformLocation,
        particle.scaleX,
        particle.scaleY * particle.sy // Apply wobble to Y scale
      );
    }
    
    if (this.metallicUniformLocation) {
      this.gl.uniform1f(this.metallicUniformLocation, particle.metallic);
    }
    if (this.roughnessUniformLocation) {
      this.gl.uniform1f(this.roughnessUniformLocation, particle.roughness);
    }
    if (this.depthAUniformLocation) {
      this.gl.uniform1f(this.depthAUniformLocation, particle.depthA);
    }
    if (this.depthBUniformLocation) {
      this.gl.uniform1f(this.depthBUniformLocation, particle.depthB);
    }
    if (this.depthScaleUniformLocation) {
      this.gl.uniform1f(this.depthScaleUniformLocation, particle.depthScale);
    }
    if (this.zPositionUniformLocation) {
      this.gl.uniform1f(this.zPositionUniformLocation, particle.centerZ); // Pass Z position
    }

    // Draw the particle
    this.draw();
  }

  private draw() {
    var primitiveType = this.gl.TRIANGLES;
    var offset = 0;
    var count = 64 * 3; // 64 segments * 3 vertices per triangle
    this.gl.drawArrays(primitiveType, offset, count);
  }

  start() {
    // Start the animation loop
    if (!this.animationId) {
      this.animate();
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resize() {
    // Update viewport
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    
    // Update resolution uniform
    const resolutionUniformLocation = this.gl.getUniformLocation(
      this.program,
      "u_resolution"
    );
    this.gl.uniform2f(
      resolutionUniformLocation,
      this.gl.canvas.width,
      this.gl.canvas.height
    );
  }
}
