import React, {
    useEffect,
    useRef,
    useImperativeHandle,
    forwardRef,
} from "react";
import { Explosion, type ExplosionConfig } from "./explosion";

interface Props extends Partial<ExplosionConfig> {
    /** Automatically starts & triggers one explosion when component mounts (default true) */
    autoStart?: boolean;
}

export interface ConfettiController {
    /** Begin the internal requestAnimationFrame loop */
    start: () => void;
    /** Stop the animation loop */
    stop: () => void;
    /** Spawn a new explosion (at canvas centre) */
    trigger: (opts?: Partial<ExplosionConfig>) => void;
}

/**
 * Fully-responsive (100% viewport) transparent canvas that renders a single
 * confetti explosion. Consumers may interact via an imperative ref, but by
 * default it will automatically start and fire one explosion on mount.
 */
const ConfettiWrapper = forwardRef<ConfettiController, Props>(
    ({ autoStart = true, ...options }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement | null>(null);
        const explosionRef = useRef<Explosion | null>(null);

        // Initialise once
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const resize = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                explosionRef.current?.resize();
            };

            // Ensure full-screen transparent WebGL context
            const gl = canvas.getContext("webgl", {
                alpha: true,
                premultipliedAlpha: false,
            });
            if (!gl) return;

            // Initial sizing
            resize();
            window.addEventListener("resize", resize);

            // Create renderer
            explosionRef.current = new Explosion(gl);

            if (autoStart) {
                explosionRef.current.start();
                // Default burst at 50% X, 20% Y from bottom, with golden colors
                explosionRef.current.triggerBombExplosion(undefined, undefined, {
                    centerX: 0.5,
                    centerY: 0.2,
                    mode: "bonus",
                    // Allow consumer overrides
                    ...options,
                });
            }

            return () => {
                explosionRef.current?.stop();
                window.removeEventListener("resize", resize);
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        // Expose imperative API
        useImperativeHandle(ref, () => ({
            start: () => explosionRef.current?.start(),
            stop: () => explosionRef.current?.stop(),
            trigger: (opts?: Partial<ExplosionConfig>) =>
                explosionRef.current?.triggerBombExplosion(undefined, undefined, {
                    centerX: 0.5,
                    centerY: 0.2,
                    mode: "jackpot",
                    ...opts,
                }),
        }));

        return (
            <canvas
                ref={canvasRef}
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    display: "block",
                    backgroundColor: "transparent",
                    pointerEvents: "none",
                }}
            />
        );
    }
);

export default ConfettiWrapper;
