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
    
    // Create 3D surface using the formula z = x²/a - y²/b
    float x = cos(angle) * actualRadius * u_scale.x;
    float y = sin(angle) * actualRadius * u_scale.y;
    
    // Apply the formula z = x²/a - y²/b with random parameters
    float a = u_depthA; // Random parameter a for x² term
    float b = u_depthB; // Random parameter b for y² term
    float z = (x * x) / a - (y * y) / b;
    
    // Apply random depth scaling
    z *= u_depthScale;
    
    // Calculate 3D position
    vec3 pos3D = vec3(x, y, z);
    
    // Apply rotations
    mat3 rotationMatrix = rotateX(u_rotationX) * rotateY(u_rotationY) * rotateZ(u_rotationZ);
    pos3D = rotationMatrix * pos3D;
    
    // Add Z position from particle movement
    pos3D.z += u_zPosition;
    
    // Calculate normal for the surface z = x²/a - y²/b
    // The normal is the gradient of the surface: (-2x/a, 2y/b, 1)
    vec3 normal;
    if (baseRadius > 0.0) {
      // Calculate gradient of the surface
      float nx = -2.0 * x / a;
      float ny = 2.0 * y / b;
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
  uniform float u_metallic;
  uniform float u_roughness;
  
  varying vec3 v_normal;
  varying vec3 v_position;
  varying vec2 v_uv;
  
  // Lighting functions
  vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
  }
  
  float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;
    
    float nom   = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = 3.14159 * denom * denom;
    
    return nom / denom;
  }
  
  float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;
    
    float nom   = NdotV;
    float denom = NdotV * (1.0 - k) + k;
    
    return nom / denom;
  }
  
  float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);
    
    return ggx1 * ggx2;
  }

  void main() {
    vec3 baseColor = u_color.rgb;
    vec3 normal = normalize(v_normal);
    vec3 viewDir = normalize(u_viewPosition - v_position);
    vec3 lightDir = normalize(u_lightPosition - v_position);
    
    // Metallic properties
    float metallic = u_metallic;
    float roughness = max(u_roughness, 0.001);
    
    // Dramatic gold color for cave-like shine
    vec3 goldTint = u_color.rgb; // Use the input color as the main gold color
    baseColor = mix(baseColor, goldTint, 1.0); // Use only the input color
    
    // Calculate F0 (base reflectivity)
    vec3 F0 = mix(vec3(0.2, 0.15, 0.05), baseColor, metallic); // more gold base reflectivity
    
    // Ambient lighting (very low for cave effect)
    vec3 ambient = baseColor * 0.01;
    
    // Dual-sided lighting - calculate for both front and back faces
    vec3 normalFront = normal;
    vec3 normalBack = -normal;
    
    // Front face lighting
    float NdotL_front = max(dot(normalFront, lightDir), 0.0);
    vec3 diffuse_front = baseColor * NdotL_front * (1.0 - metallic);
    
    // Back face lighting (dual-sided reflection)
    float NdotL_back = max(dot(normalBack, lightDir), 0.0);
    vec3 diffuse_back = baseColor * NdotL_back * (1.0 - metallic) * 0.2; // Much dimmer
    
    // Combine front and back diffuse
    vec3 diffuse = diffuse_front + diffuse_back;
    
    // Specular lighting for front face
    vec3 halfwayDir_front = normalize(lightDir + viewDir);
    float NDF_front = DistributionGGX(normalFront, halfwayDir_front, roughness);
    float G_front = GeometrySmith(normalFront, viewDir, lightDir, roughness);
    vec3 F_front = fresnelSchlick(max(dot(halfwayDir_front, viewDir), 0.0), F0);
    
    vec3 numerator_front = NDF_front * G_front * F_front;
    float denominator_front = 4.0 * max(dot(normalFront, viewDir), 0.0) * NdotL_front + 0.0001;
    vec3 specular_front = numerator_front / denominator_front;
    
    // Specular lighting for back face
    vec3 halfwayDir_back = normalize(lightDir + viewDir);
    float NDF_back = DistributionGGX(normalBack, halfwayDir_back, roughness);
    float G_back = GeometrySmith(normalBack, viewDir, lightDir, roughness);
    vec3 F_back = fresnelSchlick(max(dot(halfwayDir_back, viewDir), 0.0), F0);
    
    vec3 numerator_back = NDF_back * G_back * F_back;
    float denominator_back = 4.0 * max(dot(normalBack, viewDir), 0.0) * NdotL_back + 0.0001;
    vec3 specular_back = numerator_back / denominator_back;
    
    // Combine front and back specular
    vec3 specular = specular_front + specular_back * 0.1; // Minimal back specular
    
    // Combine lighting
    vec3 Lo = (diffuse + specular) * 50.0; // Even higher intensity for golden shine
    
    // Initialize final color
    vec3 color = ambient + Lo;
    
    // ENHANCED GOLDEN REFLECTION - Like gold in a dark cave
    if (metallic > 0.8) {
      // Front reflection - strong golden shine on lit side
      vec3 reflection_front = reflect(-viewDir, normalFront);
      float reflectionIntensity_front = pow(1.0 - roughness, 6.0); // Even sharper reflections
      color += reflectionIntensity_front * F0 * 40.0; // Stronger front reflection
      
      // Back reflection - minimal for shadow effect
      vec3 reflection_back = reflect(-viewDir, normalBack);
      float reflectionIntensity_back = pow(1.0 - roughness, 6.0);
      color += reflectionIntensity_back * F0 * 0.08; // Minimal back reflection
    }
    
    // ENHANCED rim lighting for golden edge definition
    float rim_front = 1.0 - max(dot(normalFront, viewDir), 0.0);
    float rim_back = 1.0 - max(dot(normalBack, viewDir), 0.0);
    rim_front = pow(rim_front, 2.0);
    rim_back = pow(rim_back, 2.0);
    color += (rim_front + rim_back * 0.1) * F0 * metallic * 18.0; // Stronger rim lighting
    
    // ENHANCED specular highlights for golden shine
    float specularHighlight_front = pow(max(dot(normalFront, halfwayDir_front), 0.0), 1.0 / (roughness * 0.008));
    float specularHighlight_back = pow(max(dot(normalBack, halfwayDir_back), 0.0), 1.0 / (roughness * 0.008));
    color += (specularHighlight_front + specularHighlight_back * 0.2) * F0 * 180.0; // Much brighter highlights
    
    // Add depth-based shading for better 3D perception
    float depth = v_position.z;
    float depthShading = 1.0 - (depth + 200.0) / 400.0;
    depthShading = clamp(depthShading, 0.05, 1.0); // Allow for deep shadows
    color *= depthShading;
    
    // Gamma correction
    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0 / 2.2));
    
    gl_FragColor = vec4(color, u_color.a);
  }
`;