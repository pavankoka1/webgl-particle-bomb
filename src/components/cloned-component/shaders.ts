export const VertexShaderSource = `
  attribute vec2 a_position;
  
  uniform vec2 u_resolution;
  uniform vec2 u_center;
  uniform float u_radius;
  uniform float u_rotationX;
  uniform float u_rotationY;
  uniform float u_rotationZ;
  uniform vec2 u_scale;
  uniform float u_depthA;
  uniform float u_depthB;
  uniform float u_depthScale;
  uniform float u_zPosition; // Add Z position uniform
 
  // Output to fragment shader
  varying vec3 v_normal;
  varying vec3 v_position;
  varying vec2 v_uv;
 
  // Rotation matrix functions
  mat3 rotateX(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
      1.0, 0.0, 0.0,
      0.0, c, -s,
      0.0, s, c
    );
  }
  
  mat3 rotateY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
      c, 0.0, s,
      0.0, 1.0, 0.0,
      -s, 0.0, c
    );
  }
  
  mat3 rotateZ(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
      c, -s, 0.0,
      s, c, 0.0,
      0.0, 0.0, 1.0
    );
  }
 
  void main() {
    // For circles, a_position represents the angle and radius
    float angle = a_position.x;
    float baseRadius = a_position.y; // This is the base radius from the circle geometry
    
    // Use the actual particle radius from uniform
    float actualRadius = u_radius;
    
    // Create 3D surface using the improved formula z = x²/a² - y²/b²
    float x = cos(angle) * actualRadius * u_scale.x;
    float y = sin(angle) * actualRadius * u_scale.y;
    
    // Apply the improved formula z = x²/a² - y²/b² with extreme scaling like sample
    float a = u_depthA; // Random parameter a for x² term
    float b = u_depthB; // Random parameter b for y² term
    float z = ((x * x) / (a * a) - (y * y) / (b * b)) * 0.5; // Extreme scaling like sample
    
    // Apply additional depth scaling
    z *= u_depthScale;
    
    // Calculate 3D position
    vec3 pos3D = vec3(x, y, z);
    
    // Apply rotations
    mat3 rotationMatrix = rotateX(u_rotationX) * rotateY(u_rotationY) * rotateZ(u_rotationZ);
    pos3D = rotationMatrix * pos3D;
    
    // Add Z position from particle movement
    pos3D.z += u_zPosition;
    
    // Calculate normal for the improved surface with extreme scaling like sample
    // The normal is the gradient of the surface: (-2x/a², 2y/b², 1) * 15.0
    vec3 normal;
    if (baseRadius > 0.0) {
      // Calculate gradient of the improved surface with extreme scaling
      float nx = (-2.0 * x / (a * a)) * 15.0;
      float ny = (2.0 * y / (b * b)) * 15.0;
      float nz = 1.0;
      normal = normalize(vec3(nx, ny, nz));
    } else {
      // For center vertex, use up vector
      normal = vec3(0.0, 0.0, 1.0);
    }
    normal = rotationMatrix * normal;
    
    // Convert to 2D screen position with perspective - enhanced for 3D movement
    float perspective = 1.0 + (pos3D.z / 10000.0); // Updated for new camera distance
    vec2 screenPos = u_center + pos3D.xy / perspective;
    
    // Pass to fragment shader
    v_normal = normal;
    v_position = vec3(screenPos, pos3D.z);
    v_uv = vec2(angle / (2.0 * 3.14159), baseRadius / 100.0);
    
    // Convert to clip space (WebGL Y-axis is inverted)
    vec2 zeroToOne = screenPos / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = vec2(zeroToTwo.x - 1.0, 1.0 - zeroToTwo.y);
 
    gl_Position = vec4(clipSpace, 0, 1);
  }
`;

export const FragmentShaderSource = `
  precision mediump float;
  
  uniform vec4 u_color;
  uniform vec3 u_lightPosition;
  uniform vec3 u_viewPosition;
  uniform vec3 u_lightColor;
  uniform vec3 u_objectColor;
  uniform float u_metallic;
  uniform float u_roughness;
  // Toggle lighting calculations (1.0 = on, 0.0 = off)
  uniform float u_useLighting;
  // Mode uniform for color selection (0 = jackpot, 1 = bonus)
  uniform float u_mode;
  
  varying vec3 v_normal;
  varying vec3 v_position;
  varying vec2 v_uv;
  
  void main() {
    // If lighting is disabled, output flat colour and exit early
    if (u_useLighting < 0.5) {
      vec3 color = u_color.rgb;
      gl_FragColor = vec4(color, u_color.a);
      return;
    }
    
    // Normalize vectors (exactly like sample)
    vec3 norm = normalize(v_normal);
    vec3 lightDir = normalize(u_lightPosition - v_position);
    vec3 viewDir = normalize(u_viewPosition - v_position);
    
    // Mode-based color selection (exactly like sample)
    vec3 baseColor;
    if (u_mode > 0.5) {
      // Bonus mode: use particle color
      baseColor = u_color.rgb;
    } else {
      // Jackpot mode: use gold object color
      baseColor = vec3(0.796, 0.557, 0.243); // #cb8e3e - Darker gold
    }
    
    // Ambient lighting (exactly like sample)
    float ambientStrength = 0.4;
    vec3 ambient = ambientStrength * u_lightColor;
    
    // Diffuse lighting (exactly like sample)
    float diff = abs(dot(norm, lightDir));
    vec3 diffuse = diff * u_lightColor * 1.2;
    
    // Specular lighting (exactly like sample)
    float specularStrength = 0.8;
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 64.0);
    vec3 specular = specularStrength * spec * u_lightColor;
    
    // Fresnel effect for metallic look (exactly like sample)
    float fresnel = pow(1.0 - max(dot(norm, viewDir), 0.0), 2.0);
    vec3 fresnelColor = mix(u_objectColor, u_lightColor, fresnel * 0.1);
    
    // Combine lighting with the appropriate color (exactly like sample)
    vec3 result = (ambient + diffuse + specular) * baseColor;
    
    gl_FragColor = vec4(result, u_color.a);
  }
`;