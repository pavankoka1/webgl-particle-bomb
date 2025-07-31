import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import { GlRenderer, ExplosionConfig } from "./GlRenderer";

// iPhone 14 Pro Max aspect ratio (width:height = 1290:2796 ≈ 0.461)
const IPHONE_ASPECT_RATIO = 1290 / 2796; // ≈ 0.461

// Color schemes for different animation types
const bonusColors: [number, number, number, number][] = [
  [0.847, 0.0, 0.0, 1.0], // #d80000 - Red
  [0.796, 0.859, 0.243, 1.0], // #cbdb3e - Lime Green
  [0.886, 0.361, 0.945, 1.0], // #e25cf1 - Magenta
  [0.149, 0.392, 0.58, 1.0], // #266494 - Blue
];

const jackpotColors: [number, number, number, number][] = [
  [0.729, 0.518, 0.2, 1.0], // #ba8433 - Golden Brown
  [0.98, 0.533, 0.231, 1.0], // #fa883b - Bright Gold
  [0.741, 0.4, 0.18, 1.0], // #bd662e - Dark Gold
  [0.239, 0.106, 0.043, 1.0], // #3d1b0b - Deep Brown
];

type AnimationType = 'bonus' | 'jackpot';

export const GlWorkshop: FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<GlRenderer | null>(null);
  const explosionTriggered = useRef(false);
  const [showConfig, setShowConfig] = useState(false);
  const [animationType, setAnimationType] = useState<AnimationType>('bonus');
  const [mobileDimensions, setMobileDimensions] = useState({ width: 0, height: 0 });

  const [config, setConfig] = useState<ExplosionConfig>({
    particleCount: 200, // More particles for better bomb effect
    explosionDuration: 0.08, // Much faster explosion (80ms)
    explosionForce: 5000, // Much stronger force for dramatic bomb effect
    particleRadiusMin: 4,
    particleRadiusMax: 12,
    settlingDuration: 6, // Longer settling for more dramatic effect
    swingAmplitude: 200, // More swing for realistic movement
    fallSpeed: 1.2, // Slightly faster fall
    gravity: 4, // Stronger gravity
    airResistance: 0.985, // Slightly more air resistance
    zScatter: 1200, // More Z scatter for depth
    cameraDistance: 10000,
    centerX: 0.5, // 0=left, 1=right
    centerY: 0.8, // 0=bottom, 1=top
    minX: 0.1, // 0=left edge, 1=right edge
    maxX: 0.9, // 0=left edge, 1=right edge
    minY: 0.1, // 0=bottom edge, 1=top edge
    maxY: 0.95, // 0=bottom edge, 1=top edge
    metallic: 0.98,
    roughness: 0.08,
    goldColor: [1.0, 0.8, 0.2, 1.0], // #FFCC33
  });

  // Get current color palette based on animation type
  const getCurrentColors = (): [number, number, number, number][] => {
    return animationType === 'bonus' ? bonusColors : jackpotColors;
  };



  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    // Set canvas to iPhone aspect ratio with 80-85% screen height
    const resizeCanvas = () => {
      const screenHeight = window.innerHeight;
      const targetHeight = screenHeight * 0.82; // 82% of screen height
      const targetWidth = targetHeight * IPHONE_ASPECT_RATIO;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Update mobile dimensions state
      setMobileDimensions({ width: targetWidth, height: targetHeight });

      // Update renderer if it exists
      if (renderer) {
        renderer.resize();
      }
    };

    // Initial resize
    resizeCanvas();

    // Add resize listener
    window.addEventListener('resize', resizeCanvas);

    const glRenderer = new GlRenderer(gl);
    setRenderer(glRenderer);
    glRenderer.start();

    // Trigger bomb explosion after a short delay (only once)
    if (!explosionTriggered.current) {
      console.log('🔄 Setting up initial explosion...');
      setTimeout(() => {
        console.log('💥 Triggering initial explosion at:', new Date().toISOString());
        const currentConfig = { ...config };
        currentConfig.colorPalette = getCurrentColors(); // Use current color palette
        glRenderer.triggerBombExplosion(undefined, undefined, currentConfig);
        explosionTriggered.current = true;
      }, 500);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      glRenderer.stop();
    };
  }, []); // Remove renderer from dependencies since we handle it with useRef

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (renderer) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      console.log('💥 Manual explosion triggered at:', x, y, 'Time:', new Date().toISOString());
      const currentConfig = { ...config };
      currentConfig.colorPalette = getCurrentColors(); // Use current color palette
      renderer.triggerBombExplosion(x, y, currentConfig);
    }
  };

  const handleReplay = () => {
    if (renderer) {
      console.log('🔄 Replaying animation with config:', config);
      const currentConfig = { ...config };
      currentConfig.colorPalette = getCurrentColors(); // Use current color palette
      renderer.triggerBombExplosion(undefined, undefined, currentConfig);
    }
  };

  const handleApplyConfig = () => {
    setShowConfig(false);
    if (renderer) {
      console.log('⚙️ Applying new config:', config);
      const currentConfig = { ...config };
      currentConfig.colorPalette = getCurrentColors(); // Use current color palette
      renderer.triggerBombExplosion(undefined, undefined, currentConfig);
    }
  };

  const handleAnimationTypeChange = (newType: AnimationType) => {
    setAnimationType(newType);
    if (renderer) {
      console.log(`🎨 Switching to ${newType} animation`);
      const currentConfig = { ...config };
      currentConfig.colorPalette = getCurrentColors(); // Use current color palette
      renderer.triggerBombExplosion(undefined, undefined, currentConfig);
    }
  };

  return (
    <div style={{
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
    }}>
      {/* Mobile-shaped container */}
      <div style={{
        position: "relative",
        width: mobileDimensions.width || window.innerHeight * 0.82 * IPHONE_ASPECT_RATIO,
        height: mobileDimensions.height || window.innerHeight * 0.82,
        backgroundColor: "transparent",
        borderRadius: "60px",
        border: "8px solid #333",
        boxShadow: "0 0 50px rgba(0,0,0,0.8)",
        overflow: "hidden",
      }}>
        <canvas
          ref={ref}
          onClick={handleCanvasClick}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            cursor: "pointer",
            backgroundColor: "transparent",
          }}
        />
      </div>

      {/* Animation Type Toggle - Top Left */}
      <div style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        display: "flex",
        gap: "10px",
        zIndex: 1000,
        pointerEvents: "auto",
      }}>
        <button
          onClick={() => handleAnimationTypeChange('bonus')}
          style={{
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: "bold",
            backgroundColor: animationType === 'bonus' ? "#d80000" : "#333",
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
          onClick={() => handleAnimationTypeChange('jackpot')}
          style={{
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: "bold",
            backgroundColor: animationType === 'jackpot' ? "#fa883b" : "#333",
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

      {/* Configuration Modal */}
      {showConfig && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 20,
        }}>
          <div style={{
            backgroundColor: "#222",
            padding: "30px",
            borderRadius: "12px",
            minWidth: "400px",
            maxWidth: "500px",
            color: "#fff",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            maxHeight: "80vh",
            overflowY: "auto",
          }}>
            <h2 style={{ margin: "0 0 20px 0", color: "#FFB018" }}>Animation Configuration</h2>

            {/* Animation Type Selection */}
            <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#333", borderRadius: "8px" }}>
              <h3 style={{ margin: "0 0 10px 0", color: "#FFB018" }}>Animation Type</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => handleAnimationTypeChange('bonus')}
                  style={{
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: animationType === 'bonus' ? "#d80000" : "#555",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  🎯 Bonus Round
                </button>
                <button
                  onClick={() => handleAnimationTypeChange('jackpot')}
                  style={{
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: animationType === 'jackpot' ? "#fa883b" : "#555",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  🏆 Jackpot Round
                </button>
              </div>
              <p style={{ fontSize: "12px", color: "#ccc", margin: "10px 0 0 0" }}>
                Current: {animationType === 'bonus' ? 'Bonus Round (Red/Green/Magenta/Blue)' : 'Jackpot Round (Gold/Brown)'}
              </p>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label title="Number of particles in the explosion (more = denser effect)" style={{ display: "block", marginBottom: "5px" }}>Particle Count:</label>
              <input
                type="range"
                min="50"
                max="1000"
                value={config.particleCount}
                onChange={(e) => setConfig(prev => ({ ...prev, particleCount: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
                title="Number of particles in the explosion (more = denser effect)"
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.particleCount}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label title="How long the explosion phase lasts (in milliseconds)" style={{ display: "block", marginBottom: "5px" }}>Explosion Duration (ms):</label>
              <input
                type="range"
                min="10"
                max="200"
                step="1"
                value={config.explosionDuration * 1000}
                onChange={(e) => setConfig(prev => ({ ...prev, explosionDuration: parseInt(e.target.value) / 1000 }))}
                style={{ width: "100%" }}
                title="How long the explosion phase lasts (in milliseconds)"
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{Math.round(config.explosionDuration * 1000)}ms</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label title="How forcefully particles are thrown outward" style={{ display: "block", marginBottom: "5px" }}>Explosion Force:</label>
              <input
                type="range"
                min="100"
                max="4000"
                value={config.explosionForce}
                onChange={(e) => setConfig(prev => ({ ...prev, explosionForce: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
                title="How forcefully particles are thrown outward"
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.explosionForce}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label title="Minimum particle radius (in pixels)" style={{ display: "block", marginBottom: "5px" }}>Particle Radius Min:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={config.particleRadiusMin}
                onChange={(e) => setConfig(prev => ({ ...prev, particleRadiusMin: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
                title="Minimum particle radius (in pixels)"
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.particleRadiusMin}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label title="Maximum particle radius (in pixels)" style={{ display: "block", marginBottom: "5px" }}>Particle Radius Max:</label>
              <input
                type="range"
                min="5"
                max="40"
                value={config.particleRadiusMax}
                onChange={(e) => setConfig(prev => ({ ...prev, particleRadiusMax: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
                title="Maximum particle radius (in pixels)"
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.particleRadiusMax}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label title="How long particles take to settle after the explosion (in seconds)" style={{ display: "block", marginBottom: "5px" }}>Settling Duration (seconds):</label>
              <input
                type="range"
                min="2"
                max="20"
                value={config.settlingDuration}
                onChange={(e) => setConfig(prev => ({ ...prev, settlingDuration: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
                title="How long particles take to settle after the explosion (in seconds)"
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.settlingDuration}s</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label title="How much particles swing side-to-side as they fall" style={{ display: "block", marginBottom: "5px" }}>Swing Amplitude:</label>
              <input
                type="range"
                min="0"
                max="400"
                value={config.swingAmplitude}
                onChange={(e) => setConfig(prev => ({ ...prev, swingAmplitude: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
                title="How much particles swing side-to-side as they fall"
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.swingAmplitude}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label title="How quickly particles fall (higher = faster)" style={{ display: "block", marginBottom: "5px" }}>Fall Speed:</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={config.fallSpeed}
                onChange={(e) => setConfig(prev => ({ ...prev, fallSpeed: parseFloat(e.target.value) }))}
                style={{ width: "100%" }}
                title="How quickly particles fall (higher = faster)"
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.fallSpeed}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label title="How strong gravity is (higher = faster downward acceleration)" style={{ display: "block", marginBottom: "5px" }}>Gravity:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={config.gravity}
                onChange={(e) => setConfig(prev => ({ ...prev, gravity: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
                title="How strong gravity is (higher = faster downward acceleration)"
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.gravity}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label title="How much air slows down particles (closer to 1 = less resistance)" style={{ display: "block", marginBottom: "5px" }}>Air Resistance:</label>
              <input
                type="range"
                min="0.90"
                max="0.999"
                step="0.001"
                value={config.airResistance}
                onChange={(e) => setConfig(prev => ({ ...prev, airResistance: parseFloat(e.target.value) }))}
                style={{ width: "100%" }}
                title="How much air slows down particles (closer to 1 = less resistance)"
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.airResistance}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label title="How much particles spread out along the z-axis (depth)" style={{ display: "block", marginBottom: "5px" }}>Z-Axis Scatter:</label>
              <input
                type="range"
                min="100"
                max="3000"
                value={config.zScatter}
                onChange={(e) => setConfig(prev => ({ ...prev, zScatter: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
                title="How much particles spread out along the z-axis (depth)"
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.zScatter}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label title="How far the camera is from the explosion (affects perspective)" style={{ display: "block", marginBottom: "5px" }}>Camera Distance:</label>
              <input
                type="range"
                min="5000"
                max="20000"
                value={config.cameraDistance}
                onChange={(e) => setConfig(prev => ({ ...prev, cameraDistance: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
                title="How far the camera is from the explosion (affects perspective)"
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.cameraDistance}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Center X:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={config.centerX}
                onChange={(e) => setConfig(prev => ({ ...prev, centerX: parseFloat(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.centerX.toFixed(2)}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Center Y:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={config.centerY}
                onChange={(e) => setConfig(prev => ({ ...prev, centerY: parseFloat(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.centerY.toFixed(2)}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Min X:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={config.minX}
                onChange={(e) => setConfig(prev => ({ ...prev, minX: parseFloat(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.minX.toFixed(2)}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Max X:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={config.maxX}
                onChange={(e) => setConfig(prev => ({ ...prev, maxX: parseFloat(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.maxX.toFixed(2)}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Min Y:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={config.minY}
                onChange={(e) => setConfig(prev => ({ ...prev, minY: parseFloat(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.minY.toFixed(2)}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Max Y:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={config.maxY}
                onChange={(e) => setConfig(prev => ({ ...prev, maxY: parseFloat(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.maxY.toFixed(2)}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Metallic:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={config.metallic}
                onChange={(e) => setConfig(prev => ({ ...prev, metallic: parseFloat(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.metallic.toFixed(2)}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Roughness:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={config.roughness}
                onChange={(e) => setConfig(prev => ({ ...prev, roughness: parseFloat(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.roughness.toFixed(2)}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Gold Color (R, G, B):</label>
              <input
                type="color"
                value={`#${((1 << 24) + (Math.round(config.goldColor[0] * 255) << 16) + (Math.round(config.goldColor[1] * 255) << 8) + Math.round(config.goldColor[2] * 255)).toString(16).slice(1, 7)}`}
                onChange={(e) => {
                  const hex = e.target.value;
                  const r = parseInt(hex.slice(1, 3), 16) / 255;
                  const g = parseInt(hex.slice(3, 5), 16) / 255;
                  const b = parseInt(hex.slice(5, 7), 16) / 255;
                  setConfig(prev => ({ ...prev, goldColor: [r, g, b, 1.0] }));
                }}
                style={{ width: "100%", height: "30px" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.goldColor.map(c => c.toFixed(2)).join(", ")}</span>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowConfig(false)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#555",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyConfig}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#FFB018",
                  color: "#000",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};