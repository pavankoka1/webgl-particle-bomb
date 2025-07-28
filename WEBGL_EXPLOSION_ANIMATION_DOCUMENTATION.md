# WebGL Explosion Animation Documentation

## Animation Phases

### 1. Approach Phase (FAST STREAM)
- Particles start from a tight cluster at deep Z, distributed in a small radius around the explosion center.
- Each particle follows a cubic Bezier curve (p0, p1, p2, p3) to the explosion center, but the curve is nearly straight and the approach is very fast (0.22s typical).
- This creates a focused, fast stream effect from deep Z to the center, not a wide circle.

### 2. Explosion Phase (BOMB EFFECT)
- When a particle reaches the center, it transitions to the explosion phase.
- The explosion is now much quicker and more forceful: explosion velocity is high, and the duration is very short (0.02–0.04s typical).
- **All particles use the same, natural explosion scatter** (no special center-blast logic), with a reduced explosion radius to keep particles in the canvas even with high force.

### 3. Settling Phase (REALISTIC WIND, SLOWER FALL)
- Particles fall due to gravity, with swing and wind effects.
- Wind is a slow, global vector (sin/cos of time) added to the swing forces, making the wind less uniform and more natural.
- **Settling is slower and more natural for all particles** (lower gravity, lower fallSpeed, higher air resistance).
- Swing amplitude is reduced for realism, and randomness is added to each particle's swing.

## Key Parameters
- **Bezier Control Points**: p0, p1, p2, p3 (see above)
- **Explosion Velocity**: High for bomb effect
- **Explosion Scatter**: All particles use natural scatter (reduced radius)
- **Explosion Duration**: 0.02–0.04s for a fast burst
- **Approach Duration**: 0.22s for a fast stream
- **Settling**: Lower gravity, lower fallSpeed, higher air resistance
- **Swing Amplitude**: Reduced for realism
- **Wind**: Global, time-varying vector

## Rationale for Changes
- **Fast Stream Approach**: Makes the approach phase visually dynamic and focused, like a stream from deep Z.
- **Bomb-like Explosion**: Quick, forceful burst for dramatic effect.
- **Natural Scatter**: All particles behave consistently, with no artificial center bias.
- **Canvas-Fit**: Reduced explosion radius keeps particles in the canvas even with high force.
- **Slower, Realistic Settling**: All particles settle naturally, with no abrupt or fast falls.
- **Realistic Wind**: Swing and wind are less uniform, more natural, and visually pleasing.

## Usage
- All changes are type-safe and parameterized for easy tuning.
- See `Particle.ts` and `GlRenderer.ts` for implementation details. 