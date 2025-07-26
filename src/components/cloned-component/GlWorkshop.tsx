import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import { GlRenderer, ExplosionConfig } from "./GlRenderer";

export const GlWorkshop: FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<GlRenderer | null>(null);
  const explosionTriggered = useRef(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<ExplosionConfig>({
    particleCount: 300,
    explosionDuration: 0.05,
    explosionForce: 75, // Reduced for better visibility
    particleRadius: 0.3,
    settlingDuration: 5,
    swingAmplitude: 150,
    fallSpeed: 1.5,
    gravity: 5,
    airResistance: 0.98,
    zScatter: 1000, // Reduced Z scatter
    cameraDistance: 10000
  });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    // Set canvas to full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
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
        glRenderer.triggerBombExplosion(undefined, undefined, config);
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
      renderer.triggerBombExplosion(x, y, config);
    }
  };

  const handleReplay = () => {
    if (renderer) {
      console.log('🔄 Replaying animation with config:', config);
      renderer.triggerBombExplosion(undefined, undefined, config);
    }
  };

  const handleApplyConfig = () => {
    setShowConfig(false);
    if (renderer) {
      console.log('⚙️ Applying new config:', config);
      renderer.triggerBombExplosion(undefined, undefined, config);
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
      backgroundColor: "#000"
    }}>
      <canvas
        ref={ref}
        onClick={handleCanvasClick}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          cursor: "pointer",
        }}
      />

      {/* Replay Button */}
      <button
        onClick={handleReplay}
        style={{
          position: "absolute",
          top: "20px",
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
          zIndex: 10,
        }}
      >
        🔄 Replay
      </button>

      {/* Config Button */}
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
          zIndex: 10,
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
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Particle Count:</label>
              <input
                type="range"
                min="50"
                max="500"
                value={config.particleCount}
                onChange={(e) => setConfig(prev => ({ ...prev, particleCount: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.particleCount}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Explosion Duration (ms):</label>
              <input
                type="range"
                min="1"
                max="100"
                step="10"
                value={config.explosionDuration * 1000}
                onChange={(e) => setConfig(prev => ({ ...prev, explosionDuration: parseInt(e.target.value) / 1000 }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{Math.round(config.explosionDuration * 1000)}ms</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Explosion Force:</label>
              <input
                type="range"
                min="10"
                max="1000"
                value={config.explosionForce}
                onChange={(e) => setConfig(prev => ({ ...prev, explosionForce: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.explosionForce}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Particle Radius:</label>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.1"
                value={config.particleRadius}
                onChange={(e) => setConfig(prev => ({ ...prev, particleRadius: parseFloat(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.particleRadius}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Settling Duration (seconds):</label>
              <input
                type="range"
                min="3"
                max="15"
                value={config.settlingDuration}
                onChange={(e) => setConfig(prev => ({ ...prev, settlingDuration: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.settlingDuration}s</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Swing Amplitude:</label>
              <input
                type="range"
                min="50"
                max="300"
                value={config.swingAmplitude}
                onChange={(e) => setConfig(prev => ({ ...prev, swingAmplitude: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.swingAmplitude}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Fall Speed:</label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={config.fallSpeed}
                onChange={(e) => setConfig(prev => ({ ...prev, fallSpeed: parseFloat(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.fallSpeed}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Gravity:</label>
              <input
                type="range"
                min="1"
                max="15"
                value={config.gravity}
                onChange={(e) => setConfig(prev => ({ ...prev, gravity: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.gravity}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Air Resistance:</label>
              <input
                type="range"
                min="0.9"
                max="0.999"
                step="0.001"
                value={config.airResistance}
                onChange={(e) => setConfig(prev => ({ ...prev, airResistance: parseFloat(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.airResistance}</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Z-Axis Scatter:</label>
              <input
                type="range"
                min="200"
                max="2000"
                value={config.zScatter}
                onChange={(e) => setConfig(prev => ({ ...prev, zScatter: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.zScatter}</span>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Camera Distance:</label>
              <input
                type="range"
                min="5000"
                max="20000"
                value={config.cameraDistance}
                onChange={(e) => setConfig(prev => ({ ...prev, cameraDistance: parseInt(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px", color: "#ccc" }}>{config.cameraDistance}</span>
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
