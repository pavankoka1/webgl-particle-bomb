import React, { useEffect, useRef, useState } from 'react';
import { GlRenderer, AnimationMode } from './GlRenderer';

interface ParentProps {
    mode?: AnimationMode;
    delay?: number; // Delay in milliseconds before triggering explosion
    className?: string;
    style?: React.CSSProperties;
}

export const Parent: React.FC<ParentProps> = ({
    mode = 'bonus',
    delay = 1000,
    className = '',
    style = {}
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [renderer, setRenderer] = useState<GlRenderer | null>(null);
    const [canvasSize, setCanvasSize] = useState({
        width: window.innerHeight * 0.82 * (1290 / 2796),
        height: window.innerHeight * 0.82
    });
    const explosionTriggered = useRef(false);

    // Calculate canvas size based on screen dimensions (iPhone aspect ratio)
    const calculateCanvasSize = () => {
        const screenHeight = window.innerHeight;
        const targetHeight = screenHeight * 0.82; // 82% of screen height
        const targetWidth = targetHeight * (1290 / 2796); // iPhone aspect ratio

        setCanvasSize({ width: targetWidth, height: targetHeight });

        // Update canvas element size immediately
        if (canvasRef.current) {
            canvasRef.current.width = targetWidth;
            canvasRef.current.height = targetHeight;
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl');
        if (!gl) {
            console.error('WebGL not supported');
            return;
        }

        // Calculate initial canvas size
        calculateCanvasSize();

        // Wait for canvas to be properly sized before creating renderer
        setTimeout(() => {
            // Update canvas size again to ensure it's set
            if (canvas) {
                canvas.width = canvasSize.width || window.innerHeight * 0.82 * (1290 / 2796);
                canvas.height = canvasSize.height || window.innerHeight * 0.82;
                console.log('🎨 Canvas size set to:', canvas.width, 'x', canvas.height);
            }

            // Create renderer
            const glRenderer = new GlRenderer(gl);
            setRenderer(glRenderer);
            glRenderer.start();
            console.log('🚀 GlRenderer started');
        }, 100);

        // Handle window resize
        const handleResize = () => {
            calculateCanvasSize();
            if (renderer) {
                renderer.resize();
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (renderer) {
                renderer.stop();
            }
        };
    }, []);

    // Trigger explosion after delay
    useEffect(() => {
        if (!renderer || explosionTriggered.current) return;

        const timer = setTimeout(() => {
            console.log(`🎆 Triggering ${mode} explosion after ${delay}ms delay`);
            renderer.triggerBombExplosion(undefined, undefined, { mode });
            explosionTriggered.current = true;
        }, delay);

        return () => clearTimeout(timer);
    }, [renderer, mode, delay]);

    // Handle canvas click for manual explosion
    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!renderer) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        console.log(`💥 Manual ${mode} explosion triggered at:`, x, y);
        renderer.triggerBombExplosion(x, y, { mode });
    };

    return (
        <div
            className={className}
            style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                ...style
            }}
        >
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onClick={handleCanvasClick}
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                    borderRadius: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                }}
                title={`Click to trigger ${mode} explosion`}
            />
        </div>
    );
};

export default Parent; 