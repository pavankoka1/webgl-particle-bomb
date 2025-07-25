import React, { useEffect, useRef, useState } from "react";
import { FragmentShaderSource, VertexShaderSource } from "./shaders";

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

interface BezierPoint {
    x: number;
    y: number;
    z: number;
}

interface ConfettiParticle {
    color: [number, number, number, number];
    w: number;
    h: number;
    t: number;
    duration: number;
    life: number;
    complete: boolean;
    p0: BezierPoint;
    p1: BezierPoint;
    p2: BezierPoint;
    p3: BezierPoint;
    x: number;
    y: number;
    z: number;
    r: number;
    sy: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    scaleX: number;
    scaleY: number;
    metallic: number;
    roughness: number;
    depthA: number;
    depthB: number;
    depthScale: number;
    // Two-phase animation fields
    phase?: 'bomb' | 'settle' | 'done';
    time?: number;
    bombStart?: { x: number; y: number; z: number };
    bombEnd?: { x: number; y: number; z: number };
    settleDuration?: number;
    settleY?: number;
    swingAmplitude?: number;
    swingFrequency?: number;
    swingSeed?: number;
    settleStartX?: number;
    settleStartY?: number;
    settleStartZ?: number;
    alpha?: number;
    hasSwing?: boolean;
    settleRotationSpeed?: number;
    // New fields for improved settle
    settleTargetX?: number;
    settleTargetY?: number;
    settleTargetZ?: number;
    settleRotationSpeedX?: number;
    settleRotationSpeedY?: number;
    settleRotationSpeedZ?: number;
    bombRotationSpeedX?: number;
    bombRotationSpeedY?: number;
    bombRotationSpeedZ?: number;
    swingPhase?: number;
    shouldFadeEarly?: boolean;
    fadeStartT?: number;
    swingAmplitude2?: number;
    swingFrequency2?: number;
}

function cubicBezier(p0: BezierPoint, p1: BezierPoint, p2: BezierPoint, p3: BezierPoint, t: number): BezierPoint {
    const nt = 1 - t;
    return {
        x:
            nt * nt * nt * p0.x +
            3 * nt * nt * t * p1.x +
            3 * nt * t * t * p2.x +
            t * t * t * p3.x,
        y:
            nt * nt * nt * p0.y +
            3 * nt * nt * t * p1.y +
            3 * nt * t * t * p2.y +
            t * t * t * p3.y,
        z:
            nt * nt * nt * p0.z +
            3 * nt * nt * t * p1.z +
            3 * nt * t * t * p2.z +
            t * t * t * p3.z,
    };
}

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

export const GlRendererFC: React.FC<GlRendererFCProps> = ({
    particleCount,
    startX,
    startY,
    xScatter,
    zScatter,
    yMin,
    yMax,
    mode = "bonus",
    blastVelocity,
    settleVelocity,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationIdRef = useRef<number | null>(null);
    const particlesRef = useRef<ConfettiParticle[]>([]);
    const glRef = useRef<WebGLRenderingContext | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const uniformLocationsRef = useRef<any>({});
    const lightPositionRef = useRef<[number, number, number]>([0, 0, 200]);
    const viewPositionRef = useRef<[number, number, number]>([0, 0, 300]);
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: window.innerWidth, height: window.innerHeight });

    // Strict color palette
    const colors: [number, number, number, number][] = [
        [254/255, 56/255, 56/255, 1],    // #FE3838 red
        [4/255, 125/255, 255/255, 1],    // #047DFF blue
        [255/255, 206/255, 109/255, 1],  // #FFCE6D yellow
        [60/255, 191/255, 44/255, 1],    // #3CBF2C green
        [175/255, 116/255, 255/255, 1],  // #AF74FF purple
    ];
    for (let i = 0; i < particleCount; i++) {
            // Burst center
            const burstX = gl.canvas.width * startX;
            const burstY = gl.canvas.height * startY;
            // Color: fixed at creation, no brightness modulation
            const color: [number, number, number, number] = colors[Math.floor(Math.random() * colors.length)];
            // Bomb phase: from close z to scattered z
            const bombStart = { x: burstX, y: burstY, z: -400 + Math.random() * 600 };
            const bombEnd = {
                x: Math.random() * gl.canvas.width,
                y: Math.random() * gl.canvas.height,
                z: -200 + Math.random() * 800,
            };
            // Settle phase: each particle settles to a unique, random position (well below canvas)
            const settleTargetX = -0.2 * gl.canvas.width + Math.random() * (1.4 * gl.canvas.width);
            const settleTargetY = gl.canvas.height + 40 + Math.random() * 160;
            const settleTargetZ = -1500 + Math.random() * 3500;
            // 30% fade early, always at 50%
            const shouldFadeEarly = Math.random() < 0.3;
            const fadeStartT = shouldFadeEarly ? 0.5 : 0.3 + Math.random() * 0.3;
            // 20% of particles swing
            let scaleX, scaleY, swingAmplitude, swingFrequency, settleDuration, settleRotationSpeedZ, swingPhase, swingAmplitude2, swingFrequency2;
            const hasSwing = Math.random() < 0.2;
            if (hasSwing) {
                scaleX = 1.5 + Math.random() * 1.0;
                scaleY = 0.2 + Math.random() * 0.3;
                swingAmplitude = 40 + Math.random() * 60;
                swingFrequency = 0.06 + Math.random() * 0.08;
                swingAmplitude2 = 10 + Math.random() * 20;
                swingFrequency2 = 0.02 + Math.random() * 0.04;
                swingPhase = Math.random() * Math.PI * 2;
                settleDuration = 8 + Math.random() * 6;
                settleRotationSpeedZ = 0.01 + Math.random() * 0.01;
            } else {
                scaleX = 1.0 + Math.random() * 0.3;
                scaleY = 0.7 + Math.random() * 0.3;
                swingAmplitude = 0;
                swingFrequency = 0;
                swingAmplitude2 = 0;
                swingFrequency2 = 0;
                swingPhase = 0;
                settleDuration = 6 + Math.random() * 4;
                settleRotationSpeedZ = 0.01 + Math.random() * 0.02;
            }
            const settleRotationSpeedX = (Math.random() - 0.5) * 0.008;
            const settleRotationSpeedY = (Math.random() - 0.5) * 0.008;
            const bombRotationSpeedX = (Math.random() - 0.5) * 0.08;
            const bombRotationSpeedY = (Math.random() - 0.5) * 0.08;
            const bombRotationSpeedZ = (Math.random() - 0.5) * 0.08;
            particlesRef.current.push({
                color,
                w: (12 + Math.random() * 8) * 1.5, // 1.5x bigger
                h: (12 + Math.random() * 8) * 1.5, // 1.5x bigger
                t: 0,
                duration: 0.2 + Math.random() * 0.15, // bomb phase duration (faster)
                settleDuration,
                phase: 'bomb',
                bombStart,
                bombEnd,
                settleTargetX,
                settleTargetY,
                settleTargetZ,
                swingAmplitude,
                swingFrequency,
                swingAmplitude2,
                swingFrequency2,
                swingSeed: Math.random() * Math.PI * 2,
                swingPhase,
                hasSwing,
                settleRotationSpeedX,
                settleRotationSpeedY,
                settleRotationSpeedZ,
                bombRotationSpeedX,
                bombRotationSpeedY,
                bombRotationSpeedZ,
                x: bombStart.x,
                y: bombStart.y,
                z: bombStart.z,
                r: Math.random() * Math.PI * 2,
                sy: scaleY,
                rotationX: 0,
                rotationY: 0,
                rotationZ: 0,
                scaleX: scaleX,
                scaleY: scaleY,
                metallic: 0.9,
                roughness: 0.1,
                depthA: 500 + Math.random() * 500,
                depthB: 400 + Math.random() * 400,
                depthScale: 0.01 + Math.random() * 0.03,
                alpha: 1,
                time: 0,
                life: 2,
                complete: false,
                p0: { x: 0, y: 0, z: 0 },
                p1: { x: 0, y: 0, z: 0 },
                p2: { x: 0, y: 0, z: 0 },
                p3: { x: 0, y: 0, z: 0 },
                settleStartX: bombStart.x,
                settleStartY: bombStart.y,
                settleStartZ: bombStart.z,
                shouldFadeEarly,
                fadeStartT,
            });
        }

        // Animation loop
        const animate = () => {
            gl.clear(gl.COLOR_BUFFER_BIT);
            let allComplete = true;
            for (const particle of particlesRef.current) {
                // Two-phase animation
                if (particle.phase === 'bomb') {
                    particle.time = typeof particle.time === 'number' ? particle.time + 1 / 60 : 1 / 60;
                    const bombDuration = typeof particle.duration === 'number' ? particle.duration : 0.5;
                    let t = Math.min(1, particle.time / bombDuration);
                    // Ease-in cubic
                    t = t * t * t;
                    const bombStartX = particle.bombStart && typeof particle.bombStart.x === 'number' ? particle.bombStart.x : 0;
                    const bombStartY = particle.bombStart && typeof particle.bombStart.y === 'number' ? particle.bombStart.y : 0;
                    const bombStartZ = particle.bombStart && typeof particle.bombStart.z === 'number' ? particle.bombStart.z : 0;
                    const bombEndX = particle.bombEnd && typeof particle.bombEnd.x === 'number' ? particle.bombEnd.x : 0;
                    const bombEndY = particle.bombEnd && typeof particle.bombEnd.y === 'number' ? particle.bombEnd.y : 0;
                    const bombEndZ = particle.bombEnd && typeof particle.bombEnd.z === 'number' ? particle.bombEnd.z : 0;
                    particle.x = lerp(bombStartX, bombEndX, t);
                    particle.y = lerp(bombStartY, bombEndY, t);
                    particle.z = lerp(bombStartZ, bombEndZ, t);
                    // Rotate on all axes
                    particle.r += typeof particle.bombRotationSpeedZ === 'number' ? particle.bombRotationSpeedZ : 0.04;
                    particle.rotationX += typeof particle.bombRotationSpeedX === 'number' ? particle.bombRotationSpeedX : 0.04;
                    particle.rotationY += typeof particle.bombRotationSpeedY === 'number' ? particle.bombRotationSpeedY : 0.04;
                    if (particle.time >= bombDuration) {
                        particle.phase = 'settle';
                        particle.time = 0;
                        particle.settleStartX = particle.x;
                        particle.settleStartY = particle.y;
                        particle.settleStartZ = particle.z;
                    }
                    particle.alpha = 1;
                } else if (particle.phase === 'settle') {
                    particle.time = typeof particle.time === 'number' ? particle.time + 1 / 60 : 1 / 60;
                    const settleDuration = typeof particle.settleDuration === 'number' ? particle.settleDuration : 2;
                    let t = Math.min(1, particle.time / settleDuration);
                    t = 1 - Math.pow(1 - t, 2);
                    const settleStartY = typeof particle.settleStartY === 'number' ? particle.settleStartY : 0;
                    const settleStartX = typeof particle.settleStartX === 'number' ? particle.settleStartX : 0;
                    const settleStartZ = typeof particle.settleStartZ === 'number' ? particle.settleStartZ : 0;
                    const settleTargetX = typeof particle.settleTargetX === 'number' ? particle.settleTargetX : settleStartX;
                    const settleTargetY = typeof particle.settleTargetY === 'number' ? particle.settleTargetY : gl.canvas.height + 100;
                    const settleTargetZ = typeof particle.settleTargetZ === 'number' ? particle.settleTargetZ : 0;
                    const swingSeed = typeof particle.swingSeed === 'number' ? particle.swingSeed : 0;
                    const swingFrequency = typeof particle.swingFrequency === 'number' ? particle.swingFrequency : 0.1;
                    const swingAmplitude = typeof particle.swingAmplitude === 'number' ? particle.swingAmplitude : 0;
                    const swingPhase = typeof particle.swingPhase === 'number' ? particle.swingPhase : 0;
                    const hasSwing = !!particle.hasSwing;
                    const swingAmplitude2 = typeof particle.swingAmplitude2 === 'number' ? particle.swingAmplitude2 : 0;
                    const swingFrequency2 = typeof particle.swingFrequency2 === 'number' ? particle.swingFrequency2 : 0;
                    const settleRotationSpeedX = typeof particle.settleRotationSpeedX === 'number' ? particle.settleRotationSpeedX : 0.005;
                    const settleRotationSpeedY = typeof particle.settleRotationSpeedY === 'number' ? particle.settleRotationSpeedY : 0.005;
                    const settleRotationSpeedZ = typeof particle.settleRotationSpeedZ === 'number' ? particle.settleRotationSpeedZ : 0.01;
                    if (hasSwing) {
                        // Wind resistance: left/right and up/down flutter, with secondary swing
                        particle.x = lerp(settleStartX, settleTargetX, t)
                            + Math.sin(swingPhase + t * Math.PI * swingFrequency) * swingAmplitude * (1 - t)
                            + Math.sin(swingPhase + t * Math.PI * swingFrequency2) * swingAmplitude2 * (1 - t);
                        particle.y = lerp(settleStartY, settleTargetY, t)
                            - Math.abs(Math.cos(swingPhase + t * Math.PI * swingFrequency * 1.2)) * 18 * (1 - t)
                            + Math.sin(swingPhase + t * Math.PI * swingFrequency2 * 0.7) * swingAmplitude2 * 0.2 * (1 - t);
                        particle.r += settleRotationSpeedZ; // slow z rotation
                        particle.rotationX += settleRotationSpeedX;
                        particle.rotationY += settleRotationSpeedY;
                        // More pronounced chip shape wobble
                        particle.scaleX = 1.8 + 0.8 * Math.sin(swingPhase + t * Math.PI * swingFrequency * 1.2);
                        particle.sy = 0.3 + 0.25 * Math.cos(swingPhase + t * Math.PI * swingFrequency * 1.2);
                    } else {
                        // Just fall, maybe a tiny random drift
                        particle.x = lerp(settleStartX, settleTargetX, t) + Math.sin(swingSeed) * 8 * (1 - t);
                        particle.y = lerp(settleStartY, settleTargetY, t);
                        particle.r += settleRotationSpeedZ; // faster z rotation
                        particle.rotationX += settleRotationSpeedX;
                        particle.rotationY += settleRotationSpeedY;
                        // Less pronounced chip shape
                        particle.scaleX = 1.1;
                        particle.sy = 0.8;
                    }
                    // 3D settle z
                    particle.z = lerp(settleStartZ, settleTargetZ, t);
                    // Blur/depth: fade alpha based on z (further = more transparent)
                    const zBlur = Math.max(0, 1 - Math.abs(particle.z) / 3500);
                    // Early fade for some particles
                    let fadeAlpha = 1;
                    if (particle.shouldFadeEarly && t > (particle.fadeStartT ?? 0.5)) {
                        fadeAlpha = 1 - (t - (particle.fadeStartT ?? 0.5)) / (1 - (particle.fadeStartT ?? 0.5));
                        fadeAlpha = Math.max(0, fadeAlpha);
                    }
                    particle.alpha = (t < 0.8 ? 1 : lerp(1, 0, (t - 0.8) / 0.2)) * zBlur * fadeAlpha;
                    // If out of bounds or below canvas, fade out and mark done
                    if (
                        particle.x < -particle.w ||
                        particle.x > gl.canvas.width + particle.w ||
                        particle.y > gl.canvas.height + particle.h
                    ) {
                        particle.alpha = 0;
                        particle.phase = 'done';
                    }
                    if (particle.time >= settleDuration) {
                        particle.alpha = 0;
                        particle.phase = 'done';
                    }
                }
                if (particle.phase !== 'done') allComplete = false;
                // Set uniforms and draw
                gl.uniform2f(centerUniformLocation, particle.x, gl.canvas.height - particle.y);
                gl.uniform1f(radiusUniformLocation, particle.w);
                gl.uniform1f(rotationXUniformLocation, particle.rotationX);
                gl.uniform1f(rotationYUniformLocation, particle.rotationY);
                gl.uniform1f(rotationZUniformLocation, particle.r);
                gl.uniform4f(
                  colorUniformLocation,
                  particle.color[0],
                  particle.color[1],
                  particle.color[2],
                  typeof particle.alpha === 'number' ? particle.alpha : 1
                );
                gl.uniform2f(scaleUniformLocation, particle.scaleX, particle.sy);
                gl.uniform1f(metallicUniformLocation, particle.metallic);
                gl.uniform1f(roughnessUniformLocation, particle.roughness);
                gl.uniform1f(depthAUniformLocation, particle.depthA);
                gl.uniform1f(depthBUniformLocation, particle.depthB);
                gl.uniform1f(depthScaleUniformLocation, particle.depthScale);
                // In the draw loop, set u_zPosition uniform for each particle
                gl.uniform1f(zPositionUniformLocation, particle.z ?? 0);
                gl.drawArrays(gl.TRIANGLES, 0, segments * 3);
            }
            if (!allComplete) {
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
    }, [dimensions, particleCount, startX, startY, xScatter, zScatter, yMin, yMax, mode, blastVelocity, settleVelocity]);

    return <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", display: "block", zIndex: 1 }} />;
};
