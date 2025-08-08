/**
 * GlRenderer - WebGL Particle Explosion System
 *
 * A modular WebGL-based particle explosion system that can be easily imported and used.
 *
 * USAGE EXAMPLE:
 * ```typescript
 * import { GlRenderer } from './GlRenderer';
 *
 * // Get WebGL context from canvas
 * const canvas = document.getElementById('canvas') as HTMLCanvasElement;
 * const gl = canvas.getContext('webgl');
 *
 * // Create renderer
 * const renderer = new GlRenderer(gl);
 * renderer.start();
 *
 * // Trigger explosion with just mode (simplest usage)
 * renderer.triggerBombExplosion(undefined, undefined, { mode: 'bonus' });
 *
 * // Trigger explosion with custom position and mode
 * renderer.triggerBombExplosion(100, 200, { mode: 'jackpot' });
 *
 * // Trigger explosion with full custom config
 * renderer.triggerBombExplosion(undefined, undefined, {
 *   mode: 'bonus',
 *   particleCount: 500,
 *   explosionForce: 3000,
 *   centerY: 0.2 // 20% from bottom
 * });
 * ```
 */

import { Particle } from "./particle";
import { FragmentShaderSource, VertexShaderSource } from "./shaders";

// Animation configuration interface
export type AnimationMode = "bonus" | "jackpot";

export interface ExplosionConfig {
    particleCount?: number;
    explosionDuration?: number;
    explosionForce?: number;
    particleRadiusMin?: number;
    particleRadiusMax?: number;
    settlingDuration?: number;
    swingAmplitude?: number;
    fallSpeed?: number;
    gravity?: number;
    airResistance?: number;
    zScatter?: number;
    cameraDistance?: number;
    centerX?: number;
    centerY?: number;
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    metallic?: number;
    roughness?: number;
    goldColor?: [number, number, number, number];
    colorPalette?: [number, number, number, number][];
    windStrength?: number;
    windDirection?: number;
    // Percentage (0-1) of particles that should fade-in during explosion (opacity 0->1)
    fadeInPercentage?: number;
    mode?: AnimationMode;
    /**
     * Force using lighting calculations irrespective of animation mode.
     * If undefined, lighting defaults to `mode === 'jackpot'` for backward compatibility.
     */
    useLighting?: boolean;
    /**
     * Whether to clear existing particles before spawning a new explosion.
     * Defaults to true to maintain previous behaviour.
     */
    clearExisting?: boolean;
}

export class Explosion {
    private gl: WebGLRenderingContext;
    private program: WebGLProgram;

    // Color palettes for different animation modes
    private static readonly BONUS_COLORS: [number, number, number, number][] = [
        [0.847, 0.0, 0.0, 1.0], // #d80000 - Red
        [0.796, 0.859, 0.243, 1.0], // #cbdb3e - Lime Green
        [0.886, 0.361, 0.945, 1.0], // #e25cf1 - Magenta
        [0.149, 0.392, 0.58, 1.0], // #266494 - Blue
    ];

    private static readonly JACKPOT_COLORS: [number, number, number, number][] =
        [
            [0.729, 0.518, 0.2, 1.0], // #ba8433 - Golden Brown
            [0.98, 0.533, 0.231, 1.0], // #fa883b - Bright Gold
            [0.741, 0.4, 0.18, 1.0], // #bd662e - Dark Gold
            [0.239, 0.106, 0.043, 1.0], // #3d1b0b - Deep Brown
        ];
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
    private useLightingUniformLocation: WebGLUniformLocation | null = null;
    private modeUniformLocation: WebGLUniformLocation | null = null;
    private lightColorUniformLocation: WebGLUniformLocation | null = null;
    private objectColorUniformLocation: WebGLUniformLocation | null = null;

    // Lighting toggle (true = lighting on)
    private useLighting: boolean = true;
    // --- Motion blur parameters ---
    private motionBlurEnabled: boolean = false;
    private motionBlurStrength: number = 0.08; // alpha used when clearing (0=full clear)

    // Enable/disable motion blur
    public enableMotionBlur(strength: number = 0.08) {
        this.motionBlurEnabled = true;
        this.motionBlurStrength = Math.min(Math.max(strength, 0), 1);
    }

    public disableMotionBlur() {
        this.motionBlurEnabled = false;
    }

    // Animation properties
    private animationId: number | null = null;

    // Particles
    private particles: Particle[] = [];

    // Lighting properties - much further away for better depth perception
    private lightPosition: [number, number, number] = [0, 0, 8000]; // Light much further away
    private viewPosition: [number, number, number] = [0, 0, 10000]; // View position much further away

    // Default configuration - synced with GlWorkshop
    private defaultConfig: ExplosionConfig = {
        particleCount: 150, // More particles for better bomb effect
        explosionDuration: 0.44, // Much faster explosion (30ms)
        explosionForce: 160, // Much stronger force for dramatic bomb effect
        particleRadiusMin: 6,
        particleRadiusMax: 14,
        settlingDuration: 6, // Longer settling for more dramatic effect
        swingAmplitude: 80, // Reduced swing for more realistic movement
        fallSpeed: 0.4, // Slightly faster fall
        gravity: 6, // Stronger gravity
        airResistance: 0.988, // Slightly more air resistance
        zScatter: 500, // More Z scatter for depth
        cameraDistance: 10000,
        centerX: 0.5, // 0=left, 1=right
        centerY: 0.3, // 0.1 height from bottom
        minX: 0.1, // 0=left edge, 1=right edge
        maxX: 0.9, // 0=left edge, 1=right edge
        minY: 0.1, // 0=bottom edge, 1=top edge
        maxY: 0.95, // 0=bottom edge, 1=top edge
        metallic: 0.98,
        roughness: 0.08,
        goldColor: [1.0, 0.8, 0.2, 1.0], // #FFCC33
        windStrength: 0.0, // No wind by default
        windDirection: 0.0, // Wind direction in radians
        fadeInPercentage: 1,
        useLighting: true,
    };

    constructor(gl: WebGLRenderingContext) {
        this.gl = gl;

        // Enable alpha blending for transparency
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        // Set clear color to transparent
        this.gl.clearColor(0, 0, 0, 0);

        const vertexShader = this.createShader(
            this.gl.VERTEX_SHADER,
            VertexShaderSource
        );
        const fragmentShader = this.createShader(
            this.gl.FRAGMENT_SHADER,
            FragmentShaderSource
        );

        this.program = this.createProgram(vertexShader, fragmentShader);
        console.log("🎨 SHADER COMPILED SUCCESSFULLY with improvements:", {
            shapeFormula: "z = x²/a² - y²/b² (improved)",
            lightingSystem: "Enhanced ambient + diffuse + specular + fresnel",
            modeSupport: "Mode-based color selection (0=jackpot, 1=bonus)",
        });
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
    // CACHE BUST: Updated Y calculation to use (1 - config.centerY) for correct positioning
    // TIMESTAMP: 2025-07-31T11:08:15 - Force cache clear - FIXED Y CALCULATION - BROWSER CACHE ISSUE - FINAL FIX
    createBombExplosion(
        burstX?: number,
        burstY?: number,
        config: Partial<ExplosionConfig> = {}
    ) {
        // Merge config with defaults, handling optional properties
        const mergedConfig: ExplosionConfig = {
            ...this.defaultConfig,
            ...config,
        };

        // Handle mode-based color palette
        let colorPalette: [number, number, number, number][];
        if (config.colorPalette) {
            colorPalette = config.colorPalette;
        } else if (config.mode === "bonus") {
            colorPalette = Explosion.BONUS_COLORS;
        } else if (config.mode === "jackpot") {
            colorPalette = Explosion.JACKPOT_COLORS;
        } else {
            colorPalette = Explosion.JACKPOT_COLORS; // Default to jackpot colors
        }

        console.log("🚨 FUNCTION CALL DEBUG:", {
            burstX: burstX,
            burstY: burstY,
            configCenterY: mergedConfig.centerY,
            mode: config.mode,
            colorPaletteLength: colorPalette.length,
        });

        // Use config center if burst coordinates not provided
        const explosionCenterX =
            burstX ?? this.gl.canvas.width * (mergedConfig.centerX ?? 0.5);
        // For Y: 0.1 means 10% from bottom, so we need 90% from top
        const calculatedY =
            this.gl.canvas.height * (1 - (mergedConfig.centerY ?? 0.1));
        const explosionCenterY = burstY ?? calculatedY;
        console.log("🔧 VARIABLE ASSIGNMENT DEBUG:", {
            calculatedY: calculatedY,
            explosionCenterY: explosionCenterY,
            areEqual: calculatedY === explosionCenterY,
            burstY: burstY,
        });
        console.log("🔧 CALCULATION DEBUG:", {
            canvasHeight: this.gl.canvas.height,
            configCenterY: config.centerY,
            calculation: `${this.gl.canvas.height} * (1 - ${config.centerY})`,
            result: calculatedY,
            actualY: explosionCenterY,
            burstY: burstY,
        });
        console.log(
            "🎯 Creating bomb explosion at:",
            explosionCenterX,
            explosionCenterY,
            "Config centerX:",
            mergedConfig.centerX,
            "Config centerY:",
            mergedConfig.centerY,
            "Canvas size:",
            this.gl.canvas.width,
            "x",
            this.gl.canvas.height
        );
        console.log(
            "🔍 DEBUG: Config being used:",
            JSON.stringify(mergedConfig, null, 2)
        );
        console.log("📍 Calculated explosion center:", {
            x: explosionCenterX,
            y: explosionCenterY,
            expectedX: this.gl.canvas.width * (config.centerX ?? 0.5),
            expectedY: this.gl.canvas.height * (1 - (config.centerY ?? 0.1)),
            actualY: explosionCenterY,
            calculation: `${this.gl.canvas.height} * (1 - ${
                config.centerY ?? 0.1
            }) = ${this.gl.canvas.height * (1 - (config.centerY ?? 0.1))}`,
            debug: {
                canvasHeight: this.gl.canvas.height,
                configCenterY: config.centerY ?? 0.1,
                oneMinusCenterY: 1 - (config.centerY ?? 0.1),
                calculation:
                    this.gl.canvas.height * (1 - (config.centerY ?? 0.1)),
                directCalculation:
                    this.gl.canvas.height * (config.centerY ?? 0.1),
            },
        });

        // Clear existing particles only if requested (default = true)
        if (mergedConfig.clearExisting !== false) {
            this.particles = [];
            console.log("🧹 Cleared existing particles");
        }

        // Update camera and lighting positions based on config
        this.viewPosition = [0, 0, mergedConfig.cameraDistance ?? 10000];
        this.lightPosition = [
            0,
            0,
            (mergedConfig.cameraDistance ?? 10000) * 0.8,
        ];

        // Determine lighting usage
        if (typeof mergedConfig.useLighting === "boolean") {
            this.useLighting = mergedConfig.useLighting;
        } else {
            // Fallback to original behaviour
            this.useLighting = mergedConfig.mode === "jackpot";
        }

        const canvasWidth = this.gl.canvas.width;
        const canvasHeight = this.gl.canvas.height;

        // Start particles from deep Z behind the explosion center
        const diagonal = Math.sqrt(
            canvasWidth * canvasWidth + canvasHeight * canvasHeight
        );
        const startZ = -diagonal * 4.0; // Even deeper Z start for more dramatic approach

        for (let i = 0; i < (mergedConfig.particleCount ?? 300); i++) {
            // NEW: Determine explosion type (20% center, 80% delayed)
            const explosionType: "center" | "delayed" =
                Math.random() < 0.4 ? "center" : "delayed";

            // Generate random starting position around the explosion center at deep Z
            const startRadius = diagonal * 0.005; // Very tight stream for focused explosion
            const startAngle = Math.random() * 2 * Math.PI;
            const startX =
                explosionCenterX +
                Math.cos(startAngle) * startRadius * Math.random();
            const startY =
                explosionCenterY +
                Math.sin(startAngle) * startRadius * Math.random();
            const startZ =
                -diagonal * 4.0 + (Math.random() - 0.5) * diagonal * 0.01; // Deep Z with minimal variation

            // Calculate direction towards the explosion center (accelerating towards screen)
            const dirX = explosionCenterX - startX;
            const dirY = explosionCenterY - startY;
            const dirZ = 0 - startZ; // Towards Z=0 (screen)
            const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
            const normX = dirX / len;
            const normY = dirY / len;
            const normZ = dirZ / len;

            // Approach velocity (accelerating towards explosion center)
            const approachSpeed = 3000 + Math.random() * 2000; // Faster approach for more dramatic effect
            const approachVelocityX = normX * approachSpeed;
            const approachVelocityY = normY * approachSpeed;
            const approachVelocityZ = normZ * approachSpeed;

            // Calculate explosion scatter with more realistic physics
            const aspectRatio = canvasWidth / canvasHeight;

            // Generate random position within a rectangle that matches screen aspect ratio
            const rectWidth = diagonal * (0.4 + Math.random() * 0.6);
            const rectHeight = rectWidth / aspectRatio; // Maintain aspect ratio

            // Random position within the rectangle (not just the circle)
            const rectX = (Math.random() - 0.5) * rectWidth;
            let rectY = (Math.random() - 0.5) * rectHeight;
            // Keep delayed particles closer to explosion center vertically
            if (explosionType === "delayed") {
                rectY *= 0.5; // compress Y spread by half
            }

            // Convert to target position
            let targetX = explosionCenterX + rectX;
            let targetY = explosionCenterY + rectY;

            // Clamp Y for delayed particles so most stay within 0-80 % screen height
            if (explosionType === "delayed") {
                const maxMain = canvasHeight * 0.8; // 80 %
                const maxOverflow = canvasHeight * 0.1; // allow some to 90 %
                if (targetY > maxMain) {
                    targetY = maxMain + Math.random() * maxOverflow;
                }
            }
            const targetZ =
                (Math.random() - 0.5) * (mergedConfig.zScatter ?? 2000) * 0.3; // More Z scatter

            // Explosion velocity with more realistic force distribution
            let explosionSpeed =
                (mergedConfig.explosionForce ?? 5000) *
                (1.0 + Math.random() * 1.0); // More varied speeds
            // Calculate direction from explosion center to target
            const distanceX = targetX - explosionCenterX;
            const distanceY = targetY - explosionCenterY;
            const distance = Math.sqrt(
                distanceX * distanceX + distanceY * distanceY
            );

            let explosionDirX = distanceX / distance;
            let explosionDirY = distanceY / distance;
            let explosionDirZ = (targetZ - 0) / (mergedConfig.zScatter ?? 2000);

            // For 10% of particles, reduce x/y and boost z direction for a more z-axis explosion
            explosionDirX *= Math.random() * 1;
            explosionDirY *= Math.random() * 1;
            explosionDirZ *= Math.random() * 50;

            const explosionScatter = {
                x: explosionDirX * explosionSpeed,
                y: explosionDirY * explosionSpeed,
                z: explosionDirZ * explosionSpeed,
            };

            // Control points for settling phase - NO BOUNDARY CONSTRAINTS
            const settleX =
                targetX +
                (Math.random() - 0.5) *
                    (mergedConfig.swingAmplitude ?? 50) *
                    2.0; // Allow wider swing
            const settleY = targetY + Math.random() * canvasHeight * 2.0; // Allow settling below canvas
            const settleZ =
                targetZ +
                (Math.random() - 0.5) * (mergedConfig.zScatter ?? 2000) * 0.2;

            // Particle properties with actual pixel radius
            const radius =
                (mergedConfig.particleRadiusMin ?? 4) +
                Math.random() *
                    ((mergedConfig.particleRadiusMax ?? 12) -
                        (mergedConfig.particleRadiusMin ?? 4));
            const scaleX = 0.04 + Math.random() * 0.12;
            const scaleY = 0.05 + Math.random() * 0.15;

            // Decide particle type (15 % fade, 25 % leaf, rest fall)
            const rand = Math.random();
            let particleType: "fall" | "fade" | "leaf";
            if (rand < 0.15) {
                particleType = "fade";
            } else if (rand < 0.4) {
                particleType = "leaf";
            } else {
                particleType = "fall";
            }

            const swingAmplitude =
                (particleType === "leaf"
                    ? (mergedConfig.swingAmplitude ?? 50) * 2.0 // Much wider swing for leaves
                    : mergedConfig.swingAmplitude ?? 50) *
                (1.0 + Math.random() * 0.5);
            const swingFrequency = 0.8 + Math.random() * 2.0; // More varied swing frequency
            const swingPhase = Math.random() * Math.PI * 2;
            const rotationSpeedX = (Math.random() - 0.5) * 0.26; // More rotation
            const rotationSpeedY = (Math.random() - 0.5) * 0.26;
            const rotationSpeedZ = (Math.random() - 0.5) * 0.56;
            const color: [number, number, number, number] =
                colorPalette[Math.floor(Math.random() * colorPalette.length)];
            // Give both modes metallic properties for better lighting effects
            const metallic =
                mergedConfig.mode === "jackpot"
                    ? mergedConfig.metallic ?? 0.8
                    : 0.3;
            const roughness =
                mergedConfig.mode === "jackpot"
                    ? mergedConfig.roughness ?? 0.2
                    : 0.6;
            // Use smaller depth values like sample for more pronounced effects
            const depthA = 1.5 + Math.random() * 1.0; // Like sample: 1.5-2.5
            const depthB = 1.5 + Math.random() * 1.0; // Like sample: 1.5-2.5
            // Use smaller depth scale like sample
            const depthScale = 0.04 + Math.random() * 0.12;
            const fallSpeed =
                particleType === "leaf"
                    ? (mergedConfig.fallSpeed ?? 0.6) * 0.4
                    : mergedConfig.fallSpeed ?? 0.6; // Much slower for leaves
            const life =
                particleType === "fade"
                    ? 1000 + Math.random() * 600
                    : 2000 + Math.random() * 1000; // Longer life
            // Decide if this particle will fade-in during explosion
            const fadeInExplosion =
                Math.random() < (mergedConfig.fadeInPercentage ?? 0.5);

            // Bezier curve control points for settling
            const p0 = { x: explosionCenterX, y: explosionCenterY, z: 0 };
            const p1 = { x: targetX * 0.3, y: targetY * 0.3, z: targetZ * 0.3 };
            const p2 = { x: targetX, y: targetY, z: targetZ };
            const p3 = { x: settleX, y: settleY, z: settleZ };

            this.particles.push(
                new Particle(
                    startX, // Start from deep Z position
                    startY,
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
                    mergedConfig.explosionDuration ?? 0.03,
                    mergedConfig.settlingDuration ?? 6,
                    swingAmplitude,
                    particleType,
                    fallSpeed,
                    mergedConfig.gravity ?? 10,
                    mergedConfig.airResistance ?? 0.985,
                    p0,
                    p1,
                    p2,
                    p3,
                    swingFrequency,
                    swingPhase,
                    approachVelocityX, // Start with approach velocity
                    approachVelocityY,
                    approachVelocityZ,
                    0, // Target Z (explosion center)
                    approachSpeed,
                    explosionScatter,
                    mergedConfig.windStrength ?? 0.0,
                    mergedConfig.windDirection ?? 0.0,
                    fadeInExplosion,
                    mergedConfig.mode === "bonus" ? 1.0 : 0.0, // Mode: 0 = jackpot, 1 = bonus
                    explosionType // NEW: Pass explosion type
                )
            );
        }

        console.log(
            `✨ Created ${this.particles.length} particles for bomb explosion from deep Z`
        );
        console.log("🎨 SHADER IMPROVEMENTS DEBUG:", {
            mode: mergedConfig.mode,
            useLighting: mergedConfig.useLighting,
            particleCount: this.particles.length,
            shapeFormula: "z = x²/a² - y²/b² * 15.0 (extreme scaling)",
            lightingSystem:
                "Sample lighting: ambient + diffuse + specular + fresnel",
            colorMode:
                mergedConfig.mode === "bonus"
                    ? "Particle colors"
                    : "Gold object colors",
            metallic: mergedConfig.metallic,
            roughness: mergedConfig.roughness,
            defaultMetallic:
                mergedConfig.mode === "jackpot"
                    ? mergedConfig.metallic ?? 0.8
                    : 0.3,
            defaultRoughness:
                mergedConfig.mode === "jackpot"
                    ? mergedConfig.roughness ?? 0.2
                    : 0.6,
            depthRange: "1.5-2.5 (like sample)",
            shapeScaling: "15.0x (extreme like sample)",
        });
        console.log("🔄 NEW EXPLOSION LOGIC:", {
            centerParticles: Math.floor(this.particles.length * 0.2),
            delayedParticles: Math.floor(this.particles.length * 0.8),
            delayedStartTime: (mergedConfig.explosionDuration ?? 0.03) * 0.6,
            settlingBoostDuration: 0.5,
            settlingBoostMultiplier: 2.0,
        });
    }

    private generateRandomParticles(count: number) {
        console.log("🎲 generateRandomParticles called with count:", count);
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
        config?: Partial<ExplosionConfig>
    ) {
        this.createBombExplosion(burstX, burstY, config);
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
        this.useLightingUniformLocation = this.gl.getUniformLocation(
            this.program,
            "u_useLighting"
        );
        this.modeUniformLocation = this.gl.getUniformLocation(
            this.program,
            "u_mode"
        );
        this.lightColorUniformLocation = this.gl.getUniformLocation(
            this.program,
            "u_lightColor"
        );
        this.objectColorUniformLocation = this.gl.getUniformLocation(
            this.program,
            "u_objectColor"
        );

        // Create a buffer for circle vertices
        var positionBuffer = this.gl.createBuffer();

        // Bind it to ARRAY_BUFFER
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

        // Generate circle vertices
        const segments = 64; // Number of segments to approximate the circle
        const baseRadius = 1; // Base radius for circle geometry (will be scaled by actual radius)

        // Don't generate particles here - they will be created by triggerBombExplosion

        var positions: number[] = [];

        // Generate vertices for a circle using triangles
        for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * 2 * Math.PI;
            const angle2 = ((i + 1) / segments) * 2 * Math.PI;

            // Center vertex
            positions.push(0, 0);
            // First edge vertex
            positions.push(angle1, baseRadius);
            // Second edge vertex
            positions.push(angle2, baseRadius);
        }

        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array(positions),
            this.gl.STATIC_DRAW
        );

        // Tell WebGL how to convert from clip space to pixels
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        // Clear the canvas
        this.gl.clearColor(0, 0, 0, 0);
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
            this.gl.uniform1f(this.radiusUniformLocation, 1); // Default radius, will be updated per particle
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
        this.lightPosition = [
            canvasCenterX + 800,
            canvasCenterY - 400,
            (this.defaultConfig.cameraDistance ?? 10000) * 0.8,
        ];
        this.viewPosition = [
            canvasCenterX,
            canvasCenterY,
            this.defaultConfig.cameraDistance ?? 10000,
        ];

        if (this.lightPositionUniformLocation) {
            this.gl.uniform3f(
                this.lightPositionUniformLocation,
                ...this.lightPosition
            );
        }
        if (this.viewPositionUniformLocation) {
            this.gl.uniform3f(
                this.viewPositionUniformLocation,
                ...this.viewPosition
            );
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
        if (this.useLightingUniformLocation) {
            this.gl.uniform1f(
                this.useLightingUniformLocation,
                this.useLighting ? 1.0 : 0.0
            );
        }
        if (this.modeUniformLocation) {
            this.gl.uniform1f(this.modeUniformLocation, 0.0); // Default to jackpot mode (0)
        }
        if (this.lightColorUniformLocation) {
            this.gl.uniform3f(this.lightColorUniformLocation, 1.4, 1.2, 0.8); // Gold light color like sample
        }
        if (this.objectColorUniformLocation) {
            this.gl.uniform3f(
                this.objectColorUniformLocation,
                0.796,
                0.557,
                0.243
            ); // Gold object color like sample
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
            console.log(
                `📊 Particles: ${initialCount} -> ${finalCount} (removed ${
                    initialCount - finalCount
                })`
            );
        }

        // Log if all particles are gone
        if (finalCount === 0 && initialCount > 0) {
            console.log("🎬 All particles have settled or expired");
        }
    }

    private animate = () => {
        // Clear the canvas – if motion blur is enabled, only fade previous frame using alpha
        if (this.motionBlurEnabled) {
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
            this.gl.clearColor(0, 0, 0, this.motionBlurStrength);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        } else {
            this.gl.clearColor(0, 0, 0, 0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        }

        // Update all particles
        this.updatePosition();

        // Ensure light position stays constant
        if (this.lightPositionUniformLocation) {
            this.gl.uniform3f(
                this.lightPositionUniformLocation,
                ...this.lightPosition
            );
        }
        if (this.viewPositionUniformLocation) {
            this.gl.uniform3f(
                this.viewPositionUniformLocation,
                ...this.viewPosition
            );
        }
        if (this.useLightingUniformLocation) {
            this.gl.uniform1f(
                this.useLightingUniformLocation,
                this.useLighting ? 1.0 : 0.0
            );
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
            this.gl.uniform1f(
                this.rotationXUniformLocation,
                particle.rotationX
            );
        }
        if (this.rotationYUniformLocation) {
            this.gl.uniform1f(
                this.rotationYUniformLocation,
                particle.rotationY
            );
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
            this.gl.uniform1f(
                this.roughnessUniformLocation,
                particle.roughness
            );
        }
        if (this.depthAUniformLocation) {
            this.gl.uniform1f(this.depthAUniformLocation, particle.depthA);
        }
        if (this.depthBUniformLocation) {
            this.gl.uniform1f(this.depthBUniformLocation, particle.depthB);
        }
        if (this.depthScaleUniformLocation) {
            this.gl.uniform1f(
                this.depthScaleUniformLocation,
                particle.depthScale
            );
        }
        if (this.zPositionUniformLocation) {
            this.gl.uniform1f(this.zPositionUniformLocation, particle.centerZ); // Pass Z position
        }

        // Set mode uniform based on particle mode (from sample code)
        if (this.modeUniformLocation) {
            // Use particle's mode property (0 = jackpot, 1 = bonus)
            this.gl.uniform1f(this.modeUniformLocation, particle.mode);
            // Debug mode uniform setting
            if (Math.random() < 0.01) {
                // Log 1% of particles to avoid spam
                console.log("🎭 MODE UNIFORM DEBUG:", {
                    particleMode: particle.mode,
                    modeName: particle.mode === 0 ? "jackpot" : "bonus",
                    metallic: particle.metallic,
                    roughness: particle.roughness,
                    color: particle.color,
                    useLighting: this.useLighting,
                });
            }
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
