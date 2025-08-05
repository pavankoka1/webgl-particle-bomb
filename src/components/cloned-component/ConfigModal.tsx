import type { FC } from "react";
import { ExplosionConfig } from "./GlRenderer";
import { AnimationMode } from "./GlRenderer";
import { ExplosionStep } from "./explosionSteps";

type SequenceType = 'single' | 'chain';

interface ConfigModalProps {
    config: ExplosionConfig;
    setConfig: React.Dispatch<React.SetStateAction<ExplosionConfig>>;
    animationType: AnimationMode;
    explosionSteps: ExplosionStep[];
    setExplosionSteps: React.Dispatch<React.SetStateAction<ExplosionStep[]>>;
    sequenceType: SequenceType;
    setSequenceType: React.Dispatch<React.SetStateAction<SequenceType>>;
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
    sequenceType,
    setSequenceType,
    onAnimationTypeChange,
    onApply,
    onClose,
}) => {

    // Helper to update explosion step
    const updateStep = (index: number, field: keyof ExplosionStep, value: number | boolean) => {
        setExplosionSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    };

    const addNewStep = () => {
        setExplosionSteps(prev => {
            const lastDelay = prev.length ? prev[prev.length - 1].delay + 300 : 0;
            return [...prev, { delay: lastDelay, centerX: 0.5, centerY: 0.5, explosionDuration: 0.03, explosionForce: 2000, particleCount: 80 }];
        });
    };

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

                {/* Sequence Type */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", marginBottom: 5 }}>Sequence Type:</label>
                    <select value={sequenceType} onChange={(e) => setSequenceType(e.target.value as SequenceType)} style={{ padding: 8, borderRadius: 6 }}>
                        <option value="single">Single Blast</option>
                        <option value="chain">Chain Reaction</option>
                    </select>
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

                {/* Core Explosion Parameters */}
                <div style={{ marginBottom: 20 }}>
                    {[
                        { key: 'particleCount', label: 'Particle Count', min: 10, max: 1000, step: 10 },
                        { key: 'explosionDuration', label: 'Explosion Duration (s)', min: 0.01, max: 0.1, step: 0.005 },
                        { key: 'explosionForce', label: 'Explosion Force', min: 100, max: 12000, step: 100 },
                        { key: 'particleRadiusMin', label: 'Particle Radius Min', min: 1, max: 20, step: 1 },
                        { key: 'particleRadiusMax', label: 'Particle Radius Max', min: 2, max: 30, step: 1 },
                        { key: 'airResistance', label: 'Air Resistance', min: 0.9, max: 1, step: 0.001 },
                        { key: 'gravity', label: 'Gravity', min: 0, max: 20, step: 0.5 },
                        { key: 'windStrength', label: 'Wind Strength', min: 0, max: 20, step: 0.5 },
                        { key: 'windDirection', label: 'Wind Direction (rad)', min: 0, max: 6.283, step: 0.1 },
                    ].map(meta => (
                        <div key={meta.key} style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', marginBottom: 4 }}>{meta.label}: {(config as any)[meta.key]}</label>
                            <input type="range" min={meta.min} max={meta.max} step={meta.step}
                                value={(config as any)[meta.key] ?? meta.min}
                                onChange={e => setConfig(prev => ({ ...prev, [meta.key]: parseFloat(e.target.value) }))}
                                style={{ width: '100%' }} />
                        </div>
                    ))}
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

                {/* Explosion Steps UI */}
                <div style={{ marginBottom: 20 }}>
                    <h3 style={{ margin: 0, marginBottom: 10, color: "#FFB018" }}>Chain Explosions</h3>
                    {explosionSteps.map((step, idx) => (
                        <div key={idx} style={{ border: '1px solid #444', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>Step {idx + 1}</strong>
                                <button onClick={() => setExplosionSteps(prev => prev.filter((_, i) => i !== idx))} style={{ background: '#900', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}>✕</button>
                            </div>
                            {[
                                { field: 'delay', label: 'Delay (ms)', min: 0, max: 3000, step: 50 },
                                { field: 'centerX', label: 'Center X', min: 0, max: 1, step: 0.01 },
                                { field: 'centerY', label: 'Center Y', min: 0, max: 1, step: 0.01 },
                                { field: 'explosionDuration', label: 'Duration (s)', min: 0.01, max: 0.1, step: 0.005 },
                                { field: 'explosionForce', label: 'Force', min: 100, max: 5000, step: 100 },
                                { field: 'particleCount', label: 'Particles', min: 10, max: 300, step: 10 },
                            ].map(meta => (
                                <div key={meta.field} style={{ marginTop: 8 }}>
                                    <label style={{ display: 'block', marginBottom: 4 }}>{meta.label}: {(step as any)[meta.field]}</label>
                                    <input type="range" min={meta.min} max={meta.max} step={meta.step}
                                        value={(step as any)[meta.field] ?? meta.min}
                                        onChange={e => updateStep(idx, meta.field as any, parseFloat(e.target.value))}
                                        style={{ width: '100%' }} />
                                </div>
                            ))}
                            <div style={{ marginTop: 8 }}>
                                <label>
                                    <input type="checkbox" checked={step.clearExisting ?? false} onChange={e => updateStep(idx, 'clearExisting', e.target.checked)} /> Clear Existing
                                </label>
                            </div>
                        </div>
                    ))}
                    <button onClick={addNewStep} style={{ padding: '6px 12px', backgroundColor: '#00796b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ Add Step</button>
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