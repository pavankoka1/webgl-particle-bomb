import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import { GlRenderer, ExplosionConfig, AnimationMode } from "./GlRenderer";
import { CHAIN_EXPLOSION_STEPS, ExplosionStep } from "./explosionSteps";
import { ConfigModal } from "./ConfigModal";

// iPhone 14 Pro Max aspect ratio (width:height = 1290:2796 ≈ 0.461)
const IPHONE_ASPECT_RATIO = 1290 / 2796; // ≈ 0.461

type DisplayMode = "web" | "mobile";
type SequenceType = "single" | "chain";

type AnimationType = AnimationMode;

export const GlWorkshop: FC = () => {
    const ref = useRef<HTMLCanvasElement>(null);
    const [renderer, setRenderer] = useState<GlRenderer | null>(null);
    const explosionTriggered = useRef(false);
    const [showConfig, setShowConfig] = useState(false);
    const [animationType, setAnimationType] =
        useState<AnimationType>("jackpot");
    const [displayMode, setDisplayMode] = useState<DisplayMode>("mobile");
    const [sequenceType, setSequenceType] = useState<SequenceType>("single");
    const [mobileDimensions, setMobileDimensions] = useState({
        width: 0,
        height: 0,
    });

    // Allow runtime editing of chain steps
    const [explosionSteps, setExplosionSteps] = useState<ExplosionStep[]>(
        CHAIN_EXPLOSION_STEPS
    );

    const [config, setConfig] = useState<ExplosionConfig>({
        particleCount: 120, // More particles for better bomb effect
        explosionDuration: 0.5, // Much faster explosion (30ms)
        explosionForce: 300, // Much stronger force for dramatic bomb effect
        particleRadiusMin: 2,
        particleRadiusMax: 16,
        settlingDuration: 8, // Longer settling for more dramatic effect
        swingAmplitude: 80, // Reduced swing for more realistic movement
        fallSpeed: 0.6, // Slightly faster fall
        gravity: 10, // Stronger gravity
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
        useLighting: true, // Enable lighting to see shader improvements
    });

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;

        const gl = canvas.getContext("webgl", {
            alpha: true,
            premultipliedAlpha: false,
        });
        if (!gl) return;

        // Set canvas to iPhone aspect ratio with 80-85% screen height
        const resizeCanvas = () => {
            if (displayMode === "mobile") {
                const screenHeight = window.innerHeight;
                const targetHeight = screenHeight * 0.82; // 82% of screen height
                const targetWidth = targetHeight * IPHONE_ASPECT_RATIO;
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                setMobileDimensions({
                    width: targetWidth,
                    height: targetHeight,
                });
            } else {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                setMobileDimensions({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
            }
            // Update renderer if it exists
            if (renderer) {
                renderer.resize();
            }
        };

        // Initial resize
        resizeCanvas();

        // Add resize listener
        window.addEventListener("resize", resizeCanvas);

        const glRenderer = new GlRenderer(gl);
        // Enable stronger motion blur (lower alpha keeps previous frames longer)
        glRenderer.enableMotionBlur(0.03);
        setRenderer(glRenderer);
        glRenderer.start();

        // Trigger a chain reaction of explosions (only once)
        if (!explosionTriggered.current) {
            console.log("🔄 Setting up chain explosion sequence...");
            // Kick off chosen sequence as soon as renderer ready
            setTimeout(() => triggerInitialSequence(glRenderer), 300);
            explosionTriggered.current = true;
        }

        // Cleanup
        return () => {
            window.removeEventListener("resize", resizeCanvas);
            glRenderer.stop();
        };
    }, []); // Remove renderer from dependencies since we handle it with useRef

    // Resize canvas whenever display mode changes
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        if (displayMode === "mobile") {
            const targetHeight = window.innerHeight * 0.82;
            const targetWidth = targetHeight * IPHONE_ASPECT_RATIO;
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            setMobileDimensions({ width: targetWidth, height: targetHeight });
        } else {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            setMobileDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }
        if (renderer) {
            renderer.resize();
            triggerInitialSequence(renderer);
        }
    }, [displayMode, renderer]);

    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (renderer) {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            console.log(
                "💥 Manual explosion triggered at:",
                x,
                y,
                "Time:",
                new Date().toISOString()
            );
            renderer.triggerBombExplosion(x, y, {
                mode: animationType,
                ...config,
            });
        }
    };

    // Use predefined steps from constants to ensure consistent visuals
    const runChainExplosions = (targetRenderer: GlRenderer) => {
        explosionSteps.forEach((step) => {
            setTimeout(() => {
                console.log(
                    `💥 Chain burst at (${step.centerX}, ${step.centerY}) | particles: ${step.particleCount}`
                );
                targetRenderer.triggerBombExplosion(undefined, undefined, {
                    ...config,
                    mode: animationType,
                    centerX: step.centerX,
                    centerY: step.centerY,
                    particleCount: step.particleCount,
                    explosionDuration: step.explosionDuration,
                    explosionForce: step.explosionForce,
                    clearExisting: step.clearExisting,
                    useLighting: config.useLighting ?? true,
                    metallic: config.metallic,
                    roughness: config.roughness,
                });
            }, step.delay);
        });
    };

    const triggerInitialSequence = (rendererInst: GlRenderer) => {
        if (sequenceType === "chain") {
            runChainExplosions(rendererInst);
        } else {
            rendererInst.triggerBombExplosion(undefined, undefined, {
                mode: animationType,
                ...config,
            });
        }
    };

    const handleReplay = () => {
        if (!renderer) return;
        console.log("🔄 Replaying animation");
        triggerInitialSequence(renderer);
    };

    const handleApplyConfig = () => {
        setShowConfig(false);
        if (renderer) {
            console.log("⚙️ Applying new config:", config);
            console.log(" Config values:", {
                centerX: config.centerX,
                centerY: config.centerY,
            });
            renderer.triggerBombExplosion(undefined, undefined, {
                mode: animationType,
                ...config,
            });
        }
    };

    const handleAnimationTypeChange = (newType: AnimationType) => {
        setAnimationType(newType);
        if (renderer) {
            console.log(`🎨 Switching to ${newType} animation`);
            console.log("📊 Config values:", {
                centerX: config.centerX,
                centerY: config.centerY,
            });
            renderer.triggerBombExplosion(undefined, undefined, {
                mode: newType,
                ...config,
            });
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                overflow: "hidden",
                backgroundColor: "#000",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            {/* Mobile-shaped container */}
            <div
                style={{
                    position: "relative",
                    width:
                        displayMode === "mobile"
                            ? mobileDimensions.width ||
                            window.innerHeight * 0.82 * IPHONE_ASPECT_RATIO
                            : "100%",
                    height:
                        displayMode === "mobile"
                            ? mobileDimensions.height ||
                            window.innerHeight * 0.82
                            : "100%",
                    backgroundImage: "url('/images/bg.png')",
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    borderRadius: displayMode === "mobile" ? "60px" : 0,
                    border:
                        displayMode === "mobile" ? "8px solid #333" : "none",
                    boxShadow:
                        displayMode === "mobile"
                            ? "0 0 50px rgba(0,0,0,0.8)"
                            : "none",
                    overflow: "hidden",
                }}
            >
                <canvas
                    ref={ref}
                    onClick={handleCanvasClick}
                    style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        cursor: "pointer",
                        backgroundColor: "transparent",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        zIndex: 1,
                    }}
                />
            </div>

            {/* Top Left Controls */}
            <div
                style={{
                    position: "absolute",
                    top: "20px",
                    left: "20px",
                    display: "flex",
                    gap: "10px",
                    zIndex: 1000,
                    pointerEvents: "auto",
                }}
            >
                <button
                    onClick={() => handleAnimationTypeChange("bonus")}
                    style={{
                        padding: "12px 20px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        backgroundColor:
                            animationType === "bonus" ? "#d80000" : "#333",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                        transition: "all 0.3s ease",
                    }}
                >
                    🎯 Bonus Round
                </button>
                <button
                    onClick={() => handleAnimationTypeChange("jackpot")}
                    style={{
                        padding: "12px 20px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        backgroundColor:
                            animationType === "jackpot" ? "#fa883b" : "#333",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                        transition: "all 0.3s ease",
                    }}
                >
                    🏆 Jackpot Round
                </button>
                <button
                    onClick={() =>
                        setDisplayMode((prev) =>
                            prev === "web" ? "mobile" : "web"
                        )
                    }
                    style={{
                        padding: "12px 20px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        backgroundColor:
                            displayMode === "mobile" ? "#555" : "#009688",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                        transition: "all 0.3s ease",
                    }}
                >
                    {displayMode === "mobile" ? "📱 Mobile" : "🖥 Web"}
                </button>
                {/* Sequence Type Dropdown */}
                <select
                    value={sequenceType}
                    onChange={(e) =>
                        setSequenceType(e.target.value as SequenceType)
                    }
                    style={{ padding: "10px", borderRadius: 6 }}
                >
                    <option value="single">Single Blast</option>
                    <option value="chain">Chain Reaction</option>
                </select>
            </div>

            {/* Replay Button - Bottom Left */}
            <button
                onClick={handleReplay}
                style={{
                    position: "absolute",
                    bottom: "20px",
                    left: "20px",
                    padding: "12px 24px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    backgroundColor: "#FFB018",
                    color: "#000",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                    zIndex: 1000,
                    pointerEvents: "auto",
                }}
            >
                🔄 Replay
            </button>

            {/* Config Button - Top Right */}
            <button
                onClick={() => setShowConfig(true)}
                style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    padding: "12px 16px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    backgroundColor: "#333",
                    color: "#FFB018",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                    zIndex: 1000,
                    pointerEvents: "auto",
                }}
            >
                ⚙️ Config
            </button>

            {showConfig && (
                <ConfigModal
                    config={config}
                    setConfig={setConfig}
                    animationType={animationType}
                    explosionSteps={explosionSteps}
                    setExplosionSteps={setExplosionSteps}
                    sequenceType={sequenceType}
                    setSequenceType={setSequenceType}
                    onAnimationTypeChange={handleAnimationTypeChange}
                    onApply={handleApplyConfig}
                    onClose={() => setShowConfig(false)}
                />
            )}
        </div>
    );
};
