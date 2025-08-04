import type { FC } from "react";
import { ExplosionConfig } from "./GlRenderer";
import { AnimationMode } from "./GlRenderer";
import { ExplosionStep } from "./explosionSteps";

interface ConfigModalProps {
    config: ExplosionConfig;
    setConfig: React.Dispatch<React.SetStateAction<ExplosionConfig>>;
    animationType: AnimationMode;
    explosionSteps: ExplosionStep[];
    setExplosionSteps: React.Dispatch<React.SetStateAction<ExplosionStep[]>>;
    onAnimationTypeChange: (mode: AnimationMode) => void;
    onApply: () => void;
    onClose: () => void;
}

export const ConfigModal: FC<ConfigModalProps> = ({
    config,
    setConfig,
    animationType,
    explosionSteps,
    setExplosionSteps,
    onAnimationTypeChange,
    onApply,
    onClose,
}) => {
    return (
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
                <h2 style={{ margin: 0, marginBottom: 20, color: "#FFB018" }}>Animation Configuration</h2>

                {/* Animation Type */}
                <div style={{ marginBottom: 20, padding: 15, backgroundColor: "#333", borderRadius: 8 }}>
                    <h3 style={{ margin: 0, marginBottom: 10, color: "#FFB018" }}>Animation Type</h3>
                    <div style={{ display: "flex", gap: 10 }}>
                        {(["bonus", "jackpot"] as AnimationMode[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => onAnimationTypeChange(type)}
                                style={{
                                    padding: "8px 16px",
                                    fontSize: 12,
                                    fontWeight: "bold",
                                    backgroundColor: animationType === type ? (type === "bonus" ? "#d80000" : "#fa883b") : "#555",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                }}
                            >
                                {type === "bonus" ? "🎯 Bonus" : "🏆 Jackpot"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Fade in percentage */}
                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: "block", marginBottom: 5 }}>Opacity Fade-In (% of particles):</label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={(config.fadeInPercentage ?? 0.5) * 100}
                        onChange={(e) => setConfig(prev => ({ ...prev, fadeInPercentage: parseInt(e.target.value) / 100 }))}
                        style={{ width: "100%" }}
                    />
                    <span style={{ fontSize: 12, color: "#ccc" }}>{Math.round((config.fadeInPercentage ?? 0.5) * 100)}%</span>
                </div>

                {/* Lighting & Reflectivity */}
                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: "block", marginBottom: 5 }}>Metallic:</label>
                    <input type="range" min="0" max="1" step="0.01" value={config.metallic ?? 0.5} onChange={(e) => setConfig(prev => ({ ...prev, metallic: parseFloat(e.target.value) }))} style={{ width: "100%" }} />
                    <label style={{ display: "block", marginBottom: 5, marginTop: 10 }}>Roughness:</label>
                    <input type="range" min="0" max="1" step="0.01" value={config.roughness ?? 0.5} onChange={(e) => setConfig(prev => ({ ...prev, roughness: parseFloat(e.target.value) }))} style={{ width: "100%" }} />
                    <div style={{ marginTop: 10 }}>
                        <label>
                            <input type="checkbox" checked={config.useLighting ?? false} onChange={(e) => setConfig(prev => ({ ...prev, useLighting: e.target.checked }))} /> Enable Lighting
                        </label>
                    </div>
                </div>

                {/* Explosion Steps JSON */}
                <div style={{ marginBottom: 20 }}>
                    <h3 style={{ margin: 0, marginBottom: 10, color: "#FFB018" }}>Chain Explosion Steps</h3>
                    <textarea
                        style={{ width: "100%", height: 120, backgroundColor: "#111", color: "#fff", padding: 8, borderRadius: 6, border: "1px solid #555" }}
                        value={JSON.stringify(explosionSteps, null, 2)}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                if (Array.isArray(parsed)) {
                                    setExplosionSteps(parsed as ExplosionStep[]);
                                }
                            } catch { /* ignore parse errors */ }
                        }}
                    />
                    <small style={{ color: "#888" }}>Edit JSON to customize chain reaction.</small>
                </div>

                {/* Additional controls could be added here. */}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={onClose} style={{ padding: "8px 16px", backgroundColor: "#555", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                    <button onClick={onApply} style={{ padding: "8px 16px", backgroundColor: "#FFB018", color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>Apply</button>
                </div>
            </div>
        </div>
    );
}; 