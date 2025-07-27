# WebGL Explosion Animation System Documentation

## Overview

This WebGL-based explosion animation system creates realistic particle explosions with advanced physics simulation. The system features a three-phase animation: approach, explosion, and settling, with particles that can freely move outside the canvas boundaries.

## Key Features

### 1. Realistic Explosion Physics
- **Three-Phase Animation**: Particles start from deep Z-axis, explode outward, then settle with gravity
- **No Canvas Boundaries**: Particles can freely move outside the canvas and "fly away"
- **Realistic Force Distribution**: Explosion force varies per particle for natural spread
- **Depth Perception**: 3D movement with proper perspective and Z-axis positioning

### 2. Enhanced Particle Physics
- **Actual Pixel Radius**: Particles use real pixel dimensions (default: 50px radius, fully configurable)
- **Slower Fall Speed**: Reduced gravity (3) and fall speed (1.2) for more realistic motion
- **Advanced Swing Motion**: Leaf-like particles have enhanced swing with cross-axis motion
- **Realistic Air Resistance**: Particles experience proper air resistance (0.985) for thin objects

### 3. Particle Types
- **Fall Particles** (60%): Standard falling debris with moderate swing
- **Leaf Particles** (25%): Enhanced swing motion with slower fall and wider amplitude
- **Fade Particles** (15%): Gradually fade out during settling phase

## Configuration Parameters

### ExplosionConfig Interface
```typescript
interface ExplosionConfig {
  particleCount: number;        // Number of particles (default: 400)
  explosionDuration: number;    // Explosion phase duration in seconds (default: 0.12)
  explosionForce: number;       // Explosion velocity multiplier (default: 1200)
  particleRadiusMin: number;    // Minimum particle radius in pixels (default: 50)
  particleRadiusMax: number;    // Maximum particle radius in pixels (default: 50)
  settlingDuration: number;     // Settling phase duration in seconds (default: 12)
  swingAmplitude: number;       // Swing motion amplitude (default: 300)
  fallSpeed: number;           // Fall speed multiplier (default: 1.2)
  gravity: number;             // Gravity strength (default: 3)
  airResistance: number;       // Air resistance factor (default: 0.985)
  zScatter: number;           // Z-axis scatter range (default: 1200)
  cameraDistance: number;      // Camera distance for perspective (default: 10000)
  centerX: number;            // Explosion center X (0=left, 1=right)
  centerY: number;            // Explosion center Y (0=bottom, 1=top)
  minX: number;               // Minimum X boundary (unused - no boundaries)
  maxX: number;               // Maximum X boundary (unused - no boundaries)
  minY: number;               // Minimum Y boundary (unused - no boundaries)
  maxY: number;               // Maximum Y boundary (unused - no boundaries)
  metallic: number;           // Material metallic property (default: 0.98)
  roughness: number;          // Material roughness property (default: 0.08)
  goldColor: [number, number, number, number]; // Gold color palette
}
```

## Animation Phases

### 1. Approach Phase
- **Duration**: Variable (until particles reach explosion center)
- **Behavior**: Particles accelerate from deep Z-axis towards explosion center
- **Visual Effects**: 
  - Particles start small and grow as they approach
  - Rotation and scaling based on Z-position
  - Dramatic depth effect with perspective

### 2. Explosion Phase
- **Duration**: 0.12 seconds (configurable)
- **Behavior**: Particles burst outward from center with realistic force distribution
- **Physics**: 
  - Explosion velocity varies per particle (1.5x to 3x base force)
  - No boundary constraints - particles can go anywhere
  - Enhanced rotation and wobble effects

### 3. Settling Phase
- **Duration**: 12 seconds (configurable)
- **Behavior**: Particles fall due to gravity with enhanced swing motion
- **Physics**:
  - **Gravity**: Reduced to 3 for slower, more realistic fall
  - **Air Resistance**: 0.985 for realistic thin particle behavior
  - **Swing Motion**: Enhanced with cross-axis motion for leaf-like particles
  - **No Boundaries**: Particles can fall off screen or fly away

## Particle Physics Details

### Swing Motion
```typescript
// Enhanced swing motion for realistic leaf-like debris movement
const swingX = Math.sin(this.swingPhase) * this.swingAmplitude * 0.02;
const swingY = Math.cos(this.swingPhase * 0.7) * this.swingAmplitude * 0.01;
const swingZ = Math.sin(this.swingPhase * 0.5) * this.swingAmplitude * 0.003;

// Additional cross-axis swing for more realistic motion
const crossSwingX = Math.sin(this.swingPhase * 1.3) * this.swingAmplitude * 0.015;
const crossSwingY = Math.cos(this.swingPhase * 0.9) * this.swingAmplitude * 0.008;
```

### Air Resistance
- **Standard Particles**: 0.985 air resistance
- **Leaf Particles**: Additional damping (0.4x velocity) for slower motion
- **Realistic Behavior**: Thin particles experience more air resistance

### Particle Lifecycle
1. **Creation**: Particles start from deep Z with approach velocity
2. **Explosion**: Burst outward with varied force distribution
3. **Settling**: Fall with gravity and swing motion
4. **Completion**: Particles are removed when:
   - They fall off screen (with 100px margin)
   - Life expires (1000-3000 frames)
   - Settling duration exceeds limit

## Visual Effects

### Material Properties
- **Metallic**: 0.98 for realistic gold appearance
- **Roughness**: 0.08 for sharp reflections
- **Gold Palette**: 5-color gradient from black to bright gold

### Lighting System
- **Dual-Sided Lighting**: Front and back face illumination
- **Enhanced Reflections**: Golden shine with cave-like lighting
- **Rim Lighting**: Edge definition for better particle visibility
- **Depth Shading**: 3D perception through Z-based shading

### Shader Features
- **PBR Materials**: Physically-based rendering for realistic gold
- **Fresnel Effect**: Realistic reflection angles
- **GGX Distribution**: Modern specular highlights
- **Perspective**: Proper 3D depth perception

## Usage Examples

### Basic Explosion
```typescript
// Create explosion at center of canvas
renderer.triggerBombExplosion();

// Create explosion at specific coordinates
renderer.triggerBombExplosion(400, 300);
```

### Custom Configuration
```typescript
const customConfig: ExplosionConfig = {
  particleCount: 600,
  explosionForce: 1500,
  particleRadiusMin: 30,  // Smaller particles
  particleRadiusMax: 80,  // Larger particles
  swingAmplitude: 400,
  fallSpeed: 0.8,
  gravity: 2,
  // ... other properties
};

renderer.triggerBombExplosion(500, 400, customConfig);
```

### Particle Radius Control
The particle radius is fully controllable through the configuration:

```typescript
// Uniform size particles (default)
const uniformConfig = {
  particleRadiusMin: 50,
  particleRadiusMax: 50
};

// Variable size particles
const variableConfig = {
  particleRadiusMin: 20,
  particleRadiusMax: 100
};

// Small particles for subtle effect
const smallConfig = {
  particleRadiusMin: 10,
  particleRadiusMax: 25
};

// Large particles for dramatic effect
const largeConfig = {
  particleRadiusMin: 80,
  particleRadiusMax: 150
};
```

### Configuration Management
```typescript
// Get current default configuration
const config = renderer.getDefaultConfig();

// Update default configuration
renderer.updateConfig({
  particleCount: 500,
  explosionForce: 1400
});
```

## Technical Implementation

### WebGL Shaders
- **Vertex Shader**: Handles 3D positioning, rotation, and perspective
- **Fragment Shader**: PBR lighting with gold material properties
- **Actual Pixel Radius**: Uses real pixel values instead of normalized coordinates

### Particle System
- **Efficient Updates**: 60fps physics simulation
- **Memory Management**: Automatic cleanup of expired particles
- **No Boundary Checks**: Particles can move freely outside canvas

### Performance Optimizations
- **Static Geometry**: Circle vertices generated once
- **Efficient Rendering**: Single draw call per particle
- **Lifecycle Management**: Automatic particle removal

## Recent Improvements

### Version 2.0 Changes
1. **Removed Canvas Boundaries**: Particles can freely move outside canvas
2. **Actual Pixel Radius**: Radius now represents real pixels (2-8px)
3. **Slower Fall Physics**: Reduced gravity and fall speed for realism
4. **Enhanced Swing Motion**: Cross-axis swing for leaf-like particles
5. **Better Explosion Physics**: More realistic force distribution
6. **Improved Air Resistance**: More realistic for thin particles

### Physics Improvements
- **Gravity**: Reduced from 8 to 3 for slower fall
- **Fall Speed**: Reduced from 2.5 to 1.2 for more realistic motion
- **Air Resistance**: Increased from 0.99 to 0.985 for better thin particle behavior
- **Swing Amplitude**: Increased from 200 to 300 for more dramatic motion

### Visual Improvements
- **Explosion Duration**: Increased from 0.08s to 0.12s for more dramatic effect
- **Explosion Force**: Increased from 800 to 1200 for more realistic spread
- **Z Scatter**: Increased from 800 to 1200 for more depth variation
- **Settling Duration**: Increased from 8s to 12s for longer particle life

## Troubleshooting

### Common Issues
1. **Particles Not Visible**: Check camera distance and Z-position ranges
2. **Performance Issues**: Reduce particle count or increase air resistance
3. **Unrealistic Motion**: Adjust gravity, fall speed, or swing amplitude
4. **Explosion Too Fast/Slow**: Modify explosion duration and force

### Debug Information
The system provides console logging for:
- Particle creation and lifecycle events
- Explosion phase transitions
- Particle completion and removal
- Performance metrics (particle counts)

## Future Enhancements

### Planned Features
1. **Wind Effects**: Environmental wind simulation
2. **Particle Collisions**: Inter-particle physics
3. **Multiple Explosion Types**: Different explosion patterns
4. **Sound Integration**: Audio feedback for explosions
5. **Mobile Optimization**: Touch-based explosion triggers

### Performance Optimizations
1. **Instanced Rendering**: Batch particle rendering
2. **GPU Physics**: Move physics calculations to GPU
3. **Level-of-Detail**: Reduce particle count for distant explosions
4. **Memory Pooling**: Reuse particle objects

## Conclusion

This WebGL explosion animation system provides realistic, visually appealing particle explosions with advanced physics simulation. The removal of canvas boundaries and enhancement of swing motion creates a more natural and immersive experience, while the actual pixel radius system ensures consistent visual quality across different screen resolutions. 