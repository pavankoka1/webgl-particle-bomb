import React, { FC, useState } from "react";
import { GlRendererFC } from "./GlRenderer";
import { ExplosionControls } from "./constants";

export const GlWorkshop: FC = () => {
    const [controls, setControls] = useState<ExplosionControls>({
        particleCount: 100,
        startX: 0.5,
        startY: 0.5,
        xScatter: 1,
        zScatter: 1,
        yMin: 0.3,
        yMax: 0.8,
    });
    const [draft, setDraft] = useState<ExplosionControls>(controls);
    const [replayKey, setReplayKey] = useState(0);
    const [blastVelocity, setBlastVelocity] = useState(1.0);
    const [settleVelocity, setSettleVelocity] = useState(0.1);

    const handleApply = () => {
        setControls(draft);
        setReplayKey(k => k + 1);
    };
    const handleReplay = () => {
        setReplayKey(k => k + 1);
    };

    return (
        <>
            <GlRendererFC
                key={replayKey}
                particleCount={controls.particleCount}
                startX={controls.startX}
                startY={controls.startY}
                xScatter={controls.xScatter}
                zScatter={controls.zScatter}
                yMin={controls.yMin}
                yMax={controls.yMax}
                blastVelocity={blastVelocity}
                settleVelocity={settleVelocity}
            />
            <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', zIndex: 10, background: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 8 }}>
                <div>
                    <label>Particles: <input type="number" min={1} max={300} value={draft.particleCount} onChange={e => setDraft(c => ({ ...c, particleCount: Number(e.target.value) }))} style={{ width: 60 }} /></label>
                </div>
                <div>
                    <label>Start X: <input type="number" min={0} max={1} step={0.01} value={draft.startX} onChange={e => setDraft(c => ({ ...c, startX: Number(e.target.value) }))} style={{ width: 60 }} /></label>
                </div>
                <div>
                    <label>Start Y: <input type="number" min={0} max={1} step={0.01} value={draft.startY} onChange={e => setDraft(c => ({ ...c, startY: Number(e.target.value) }))} style={{ width: 60 }} /></label>
                </div>
                <div>
                    <label>X Scatter: <input type="number" min={0} max={1} step={0.01} value={draft.xScatter} onChange={e => setDraft(c => ({ ...c, xScatter: Number(e.target.value) }))} style={{ width: 60 }} /></label>
                </div>
                <div>
                    <label>Z Scatter (depth):
                        <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="3"
                            value={draft.zScatter}
                            onChange={e => setDraft({ ...draft, zScatter: Number(e.target.value) })}
                        />
                    </label>
                </div>
                <div>
                    <label>Y Min: <input type="number" min={0} max={1} step={0.01} value={draft.yMin} onChange={e => setDraft(c => ({ ...c, yMin: Number(e.target.value) }))} style={{ width: 60 }} /></label>
                </div>
                <div>
                    <label>Y Max: <input type="number" min={0} max={1} step={0.01} value={draft.yMax} onChange={e => setDraft(c => ({ ...c, yMax: Number(e.target.value) }))} style={{ width: 60 }} /></label>
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button onClick={handleApply} style={{ padding: '4px 12px', fontWeight: 600 }}>Apply</button>
                    <button onClick={handleReplay} style={{ padding: '4px 12px', fontWeight: 600 }}>Replay</button>
                </div>
                <label>
                    Blast Velocity:
                    <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="5"
                        value={blastVelocity}
                        onChange={e => setBlastVelocity(Number(e.target.value))}
                    />
                </label>
                <label>
                    Settle Velocity:
                    <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="5"
                        value={settleVelocity}
                        onChange={e => setSettleVelocity(Number(e.target.value))}
                    />
                </label>
            </div>
        </>
    );
};

export default GlWorkshop;
