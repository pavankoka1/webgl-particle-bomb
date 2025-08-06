import React, { useEffect, useRef } from "react";

export interface GlRendererFCProps {
    particleCount: number;
    startX: number;
    startY: number;
    xScatter: number;
    zScatter: number;
    yMin: number;
    yMax: number;
    mode?: "bonus" | "jackpot";
    blastVelocity?: number;
    settleVelocity?: number;
}

interface Particle {
    x: number;
    y: number;
    z: number;
    startX: number;
    startY: number;
    startZ: number;
    scatterX: number;
    scatterY: number;
    scatterZ: number;
    settleX: number;
    settleY: number;
    settleZ: number;
    phase: 'bomb' | 'settle' | 'done';
    t: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    rotSpeedX: number;
    rotSpeedY: number;
    rotSpeedZ: number;
    swingAmplitude: number;
    swingFrequency: number;
    swingPhase: number;
    color: [number, number, number, number];
    fadeEarly: boolean;
    fadeStartT: number;
    alpha: number;
}

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
}

const COLOR_PALETTE: [number, number, number, number][] = [
    [254 / 255, 56 / 255, 56 / 255, 1],    // #FE3838 red
    [4 / 255, 125 / 255, 255 / 255, 1],    // #047DFF blue
    [255 / 255, 206 / 255, 109 / 255, 1],  // #FFCE6D yellow
    [60 / 255, 191 / 255, 44 / 255, 1],    // #3CBF2C green
    [175 / 255, 116 / 255, 255 / 255, 1],  // #AF74FF purple
];

export const GlRendererFC: React.FC<GlRendererFCProps> = ({
    particleCount = 100,
    startX,
    startY,
    xScatter,
    zScatter,
    yMin,
    yMax,
    mode = "bonus",
    blastVelocity = 0.18,
    settleVelocity = 2.5,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationIdRef = useRef<number | null>(null);
    const particlesRef = useRef<Particle[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
        if (!gl) return;

        // Vertex shader: Lays chip, 3D rotation, depth scaling
        const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vertexShader, `
            attribute vec2 a_position;
            uniform vec2 u_center;
            uniform float u_scale;
            uniform float u_rotationX;
            uniform float u_rotationY;
            uniform float u_rotationZ;
            uniform float u_z;
            uniform vec2 u_resolution;
            varying float v_depth;
            varying vec2 v_uv;
            void main() {
                // 3D chip shape
                float x = a_position.x * u_scale;
                float y = a_position.y * u_scale;
                float z = (x*x/400.0 - y*y/200.0) * 2.0;
                // 3D rotation
                float cx = cos(u_rotationX), sx = sin(u_rotationX);
                float cy = cos(u_rotationY), sy = sin(u_rotationY);
                float cz = cos(u_rotationZ), sz = sin(u_rotationZ);
                // Rotate X
                float y1 = y * cx - z * sx;
                float z1 = y * sx + z * cx;
                // Rotate Y
                float x2 = x * cy + z1 * sy;
                float z2 = -x * sy + z1 * cy;
                // Rotate Z
                float x3 = x2 * cz - y1 * sz;
                float y3 = x2 * sz + y1 * cz;
                // Add particle Z
                float z3 = z2 + u_z;
                v_depth = z3;
                v_uv = a_position * 0.5 + 0.5;
                // Perspective
                float cameraZ = 1200.0;
                float perspective = cameraZ / (cameraZ - z3);
                vec2 pos = (vec2(x3, y3) * perspective) + u_center;
                // Convert to clip space
                vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
                clip.y = -clip.y;
                gl_Position = vec4(clip, 0, 1);
            }
        `);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(vertexShader));
            return;
        }
        // Fragment shader: color, depth-based brightness, vignette
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fragmentShader, `
            precision mediump float;
            varying float v_depth;
            varying vec2 v_uv;
            uniform vec4 u_color;
            uniform float u_alpha;
            uniform vec2 u_resolution;
            void main() {
                // Vignette
                vec2 uv = v_uv;
                float vignette = smoothstep(0.9, 0.5, distance(uv, vec2(0.5)));
                // Depth-based brightness
                float brightness = 0.7 + 0.3 * smoothstep(-400.0, 200.0, v_depth);
                // Soft shadow at edge
                float edge = smoothstep(0.98, 0.88, length(uv - 0.5));
                vec3 color = u_color.rgb * brightness * vignette * edge;
                gl_FragColor = vec4(color, u_alpha * edge);
            }
        `);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(fragmentShader));
            return;
        }
        const program = gl.createProgram()!;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(program));
            return;
        }
        gl.useProgram(program);
        
        // Enable alpha blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        gl.clearColor(0, 0, 0, 0);

        // Chip geometry: triangle fan (Lays-like curve in 2D)
        const segments = 32;
        const radius = 14;
        const positions: number[] = [0, 0]; // center
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const r = radius * (1 + 0.15 * Math.sin(3 * theta));
            positions.push(Math.cos(theta) * r, Math.sin(theta) * r * 0.5);
        }
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        // Uniforms
        const centerUniformLocation = gl.getUniformLocation(program, "u_center");
        const scaleUniformLocation = gl.getUniformLocation(program, "u_scale");
        const rotationXUniformLocation = gl.getUniformLocation(program, "u_rotationX");
        const rotationYUniformLocation = gl.getUniformLocation(program, "u_rotationY");
        const rotationZUniformLocation = gl.getUniformLocation(program, "u_rotationZ");
        const zUniformLocation = gl.getUniformLocation(program, "u_z");
        const colorUniformLocation = gl.getUniformLocation(program, "u_color");
        const alphaUniformLocation = gl.getUniformLocation(program, "u_alpha");
        const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

        // Particle creation
        particlesRef.current = [];
        for (let i = 0; i < particleCount; i++) {
            const burstX = gl.canvas.width / 2;
            const burstY = gl.canvas.height * 0.1;
            const burstZ = -600 + Math.random() * 1200; // more depth
            const scatterX = burstX + (Math.random() - 0.5) * xScatter;
            const scatterY = gl.canvas.height * (yMin + Math.random() * (yMax - yMin));
            const scatterZ = -400 + Math.random() * 800;
            const settleX = burstX + (Math.random() - 0.5) * (xScatter * 1.5);
            const settleY = gl.canvas.height * 0.95 + Math.random() * 40;
            const settleZ = scatterZ + (Math.random() - 0.5) * 200;
            const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
            const fadeEarly = Math.random() < 0.3;
            const fadeStartT = 0.5 + Math.random() * 0.3;
            particlesRef.current.push({
                x: burstX,
                y: burstY,
                z: burstZ,
                startX: burstX,
                startY: burstY,
                startZ: burstZ,
                scatterX,
                scatterY,
                scatterZ,
                settleX,
                settleY,
                settleZ,
                phase: 'bomb',
                t: 0,
                rotationX: Math.random() * Math.PI * 2,
                rotationY: Math.random() * Math.PI * 2,
                rotationZ: Math.random() * Math.PI * 2,
                rotSpeedX: 0.08 + Math.random() * 0.08,
                rotSpeedY: 0.08 + Math.random() * 0.08,
                rotSpeedZ: 0.08 + Math.random() * 0.08,
                swingAmplitude: 30 + Math.random() * 40,
                swingFrequency: 0.7 + Math.random() * 0.5,
                swingPhase: Math.random() * Math.PI * 2,
                color,
                fadeEarly,
                fadeStartT,
                alpha: 1,
            });
        }

        // Animation loop
        const animate = () => {
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
            let allDone = true;
            for (const particle of particlesRef.current) {
                if (particle.phase === 'bomb') {
                    particle.t += 1 / 60 / blastVelocity;
                    if (particle.t >= 1) {
                        particle.t = 0;
                        particle.phase = 'settle';
                        particle.x = particle.scatterX;
                        particle.y = particle.scatterY;
                        particle.z = particle.scatterZ;
                    } else {
                        const t = easeOutCubic(particle.t);
                        particle.x = lerp(particle.startX, particle.scatterX, t);
                        particle.y = lerp(particle.startY, particle.scatterY, t);
                        particle.z = lerp(particle.startZ, particle.scatterZ, t);
                        particle.rotationX += particle.rotSpeedX;
                        particle.rotationY += particle.rotSpeedY;
                        particle.rotationZ += particle.rotSpeedZ;
                    }
                } else if (particle.phase === 'settle') {
                    particle.t += 1 / 60 / settleVelocity;
                    if (particle.t >= 1) {
                        particle.t = 1;
                        particle.phase = 'done';
                    }
                    const t = particle.t;
                    // Swinging motion
                    const swing = Math.sin(particle.swingPhase + t * Math.PI * 2 * particle.swingFrequency) * particle.swingAmplitude * (1 - t);
                    particle.x = lerp(particle.scatterX, particle.settleX, t) + swing;
                    particle.y = lerp(particle.scatterY, particle.settleY, t);
                    particle.z = lerp(particle.scatterZ, particle.settleZ, t);
                    // Slow, natural rotation
                    particle.rotationX += 0.01 + Math.random() * 0.01;
                    particle.rotationY += 0.01 + Math.random() * 0.01;
                    particle.rotationZ += 0.01 + Math.random() * 0.01;
                    // Fade out for some particles
                    if (particle.fadeEarly && t > particle.fadeStartT) {
                        particle.alpha = Math.max(0, 1 - (t - particle.fadeStartT) / (1 - particle.fadeStartT));
                    } else {
                        particle.alpha = 1;
                    }
                    // Remove if out of bounds
                    if (
                        particle.x < -100 ||
                        particle.x > gl.canvas.width + 100 ||
                        particle.y > gl.canvas.height + 100
                    ) {
                        particle.phase = 'done';
                    }
                }
                if (particle.phase === 'done') continue;
                gl.uniform2f(centerUniformLocation, particle.x, particle.y);
                gl.uniform1f(scaleUniformLocation, 1.5 + particle.z * 0.002); // scale with z for depth
                gl.uniform1f(rotationXUniformLocation, particle.rotationX);
                gl.uniform1f(rotationYUniformLocation, particle.rotationY);
                gl.uniform1f(rotationZUniformLocation, particle.rotationZ);
                gl.uniform1f(zUniformLocation, particle.z);
                gl.uniform4f(colorUniformLocation, ...particle.color);
                gl.uniform1f(alphaUniformLocation, particle.alpha);
                gl.drawArrays(gl.TRIANGLE_FAN, 0, segments + 2);
                allDone = false;
            }
            if (!allDone) {
                animationIdRef.current = requestAnimationFrame(animate);
            }
        };
        animate();
        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
                animationIdRef.current = null;
            }
        };
    }, [particleCount, xScatter, zScatter, yMin, yMax, blastVelocity, settleVelocity]);

    return <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", display: "block", zIndex: 1 }} />;
};
