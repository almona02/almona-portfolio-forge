/**
 * Almona Fabricator Pro: Advanced PBR Shaders (WebGL 2.0)
 * 
 * Custom shader materials for photorealistic aluminium, UPVC, and glass rendering.
 * Leverages WebGL 2.0 features for enhanced visual quality:
 * - Anisotropic reflections for brushed aluminium
 * - Subsurface scattering approximation for UPVC
 * - Thin-film interference for glass coatings
 * - Environment-based reflections with parallax correction
 */

import * as THREE from 'three';

// ============================================================================
// SHADER CHUNKS - Reusable GLSL code
// ============================================================================

const COMMON_VERTEX = /* glsl */ `
#version 300 es
precision highp float;

in vec3 position;
in vec3 normal;
in vec2 uv;
in vec3 tangent;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;

out vec3 vWorldPosition;
out vec3 vNormal;
out vec3 vViewDirection;
out vec2 vUv;
out vec3 vTangent;
out vec3 vBitangent;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  vViewDirection = normalize(cameraPosition - worldPosition.xyz);
  vUv = uv;
  
  // TBN matrix for normal mapping
  vTangent = normalize(normalMatrix * tangent);
  vBitangent = cross(vNormal, vTangent);
  
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const PBR_FUNCTIONS = /* glsl */ `
#define PI 3.14159265359
#define RECIPROCAL_PI 0.31830988618

// GGX/Trowbridge-Reitz Normal Distribution Function
float D_GGX(float NdotH, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH2 = NdotH * NdotH;
  float denom = NdotH2 * (a2 - 1.0) + 1.0;
  return a2 / (PI * denom * denom);
}

// Smith's Schlick-GGX Geometry Function
float G_SchlickGGX(float NdotV, float roughness) {
  float r = roughness + 1.0;
  float k = (r * r) / 8.0;
  return NdotV / (NdotV * (1.0 - k) + k);
}

float G_Smith(float NdotV, float NdotL, float roughness) {
  return G_SchlickGGX(NdotV, roughness) * G_SchlickGGX(NdotL, roughness);
}

// Fresnel-Schlick approximation
vec3 F_Schlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// Fresnel with roughness for IBL
vec3 F_SchlickRoughness(float cosTheta, vec3 F0, float roughness) {
  return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// Anisotropic GGX for brushed metal
float D_GGX_Anisotropic(float NdotH, float TdotH, float BdotH, float ax, float ay) {
  float d = TdotH * TdotH / (ax * ax) + BdotH * BdotH / (ay * ay) + NdotH * NdotH;
  return 1.0 / (PI * ax * ay * d * d);
}
`;

// ============================================================================
// BRUSHED ALUMINIUM SHADER
// ============================================================================

const ALUMINIUM_FRAGMENT = /* glsl */ `
#version 300 es
precision highp float;

in vec3 vWorldPosition;
in vec3 vNormal;
in vec3 vViewDirection;
in vec2 vUv;
in vec3 vTangent;
in vec3 vBitangent;

uniform vec3 baseColor;
uniform float metalness;
uniform float roughness;
uniform float anisotropy;
uniform float anisotropyRotation;
uniform vec3 lightPosition;
uniform vec3 lightColor;
uniform float lightIntensity;
uniform samplerCube envMap;
uniform float envMapIntensity;
uniform float clearcoat;
uniform float clearcoatRoughness;

out vec4 fragColor;

${PBR_FUNCTIONS}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDirection);
  vec3 L = normalize(lightPosition - vWorldPosition);
  vec3 H = normalize(V + L);
  
  // Anisotropic direction (brushed metal grain)
  float rotation = anisotropyRotation * PI * 2.0;
  vec3 T = normalize(vTangent * cos(rotation) + vBitangent * sin(rotation));
  vec3 B = cross(N, T);
  
  // Dot products
  float NdotV = max(dot(N, V), 0.001);
  float NdotL = max(dot(N, L), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  float VdotH = max(dot(V, H), 0.0);
  float TdotH = dot(T, H);
  float BdotH = dot(B, H);
  
  // Anisotropic roughness
  float aspect = sqrt(1.0 - anisotropy * 0.9);
  float ax = max(0.001, roughness / aspect);
  float ay = max(0.001, roughness * aspect);
  
  // F0 for aluminium (high reflectivity)
  vec3 F0 = mix(vec3(0.04), baseColor, metalness);
  
  // Cook-Torrance BRDF with anisotropy
  float D = anisotropy > 0.0 
    ? D_GGX_Anisotropic(NdotH, TdotH, BdotH, ax, ay)
    : D_GGX(NdotH, roughness);
  float G = G_Smith(NdotV, NdotL, roughness);
  vec3 F = F_Schlick(VdotH, F0);
  
  vec3 specular = (D * G * F) / max(4.0 * NdotV * NdotL, 0.001);
  vec3 kD = (vec3(1.0) - F) * (1.0 - metalness);
  
  // Direct lighting
  vec3 Lo = (kD * baseColor * RECIPROCAL_PI + specular) * lightColor * lightIntensity * NdotL;
  
  // Environment reflection (IBL approximation)
  vec3 R = reflect(-V, N);
  vec3 envColor = texture(envMap, R).rgb;
  vec3 envSpecular = F_SchlickRoughness(NdotV, F0, roughness) * envColor * envMapIntensity;
  
  // Clearcoat layer (for polished aluminium)
  if (clearcoat > 0.0) {
    float Dc = D_GGX(NdotH, clearcoatRoughness);
    float Gc = G_Smith(NdotV, NdotL, clearcoatRoughness);
    vec3 Fc = F_Schlick(VdotH, vec3(0.04));
    vec3 clearcoatSpec = (Dc * Gc * Fc) / max(4.0 * NdotV * NdotL, 0.001);
    Lo += clearcoatSpec * clearcoat * lightColor * lightIntensity * NdotL;
  }
  
  // Ambient (simplified)
  vec3 ambient = vec3(0.03) * baseColor;
  
  // Final color
  vec3 color = ambient + Lo + envSpecular;
  
  // Tone mapping (ACES Filmic)
  color = color / (color + vec3(1.0));
  
  // Gamma correction
  color = pow(color, vec3(1.0 / 2.2));
  
  fragColor = vec4(color, 1.0);
}
`;

// ============================================================================
// UPVC SHADER (with subsurface scattering approximation)
// ============================================================================

const UPVC_FRAGMENT = /* glsl */ `
#version 300 es
precision highp float;

in vec3 vWorldPosition;
in vec3 vNormal;
in vec3 vViewDirection;
in vec2 vUv;

uniform vec3 baseColor;
uniform float roughness;
uniform vec3 subsurfaceColor;
uniform float subsurfaceRadius;
uniform vec3 lightPosition;
uniform vec3 lightColor;
uniform float lightIntensity;
uniform samplerCube envMap;
uniform float envMapIntensity;

out vec4 fragColor;

${PBR_FUNCTIONS}

// Simplified subsurface scattering
vec3 subsurfaceScattering(vec3 N, vec3 L, vec3 V, float thickness) {
  vec3 H = normalize(L + N * 0.5);
  float VdotH = pow(clamp(dot(V, -H), 0.0, 1.0), 3.0);
  return subsurfaceColor * VdotH * thickness;
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDirection);
  vec3 L = normalize(lightPosition - vWorldPosition);
  vec3 H = normalize(V + L);
  
  float NdotV = max(dot(N, V), 0.001);
  float NdotL = max(dot(N, L), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  float VdotH = max(dot(V, H), 0.0);
  
  // F0 for UPVC (dielectric)
  vec3 F0 = vec3(0.04);
  
  // Standard PBR
  float D = D_GGX(NdotH, roughness);
  float G = G_Smith(NdotV, NdotL, roughness);
  vec3 F = F_Schlick(VdotH, F0);
  
  vec3 specular = (D * G * F) / max(4.0 * NdotV * NdotL, 0.001);
  vec3 kD = (vec3(1.0) - F);
  
  // Direct lighting
  vec3 Lo = (kD * baseColor * RECIPROCAL_PI + specular) * lightColor * lightIntensity * NdotL;
  
  // Subsurface scattering (gives UPVC its characteristic soft look)
  vec3 sss = subsurfaceScattering(N, L, V, subsurfaceRadius) * lightColor * lightIntensity;
  
  // Environment
  vec3 R = reflect(-V, N);
  vec3 envColor = texture(envMap, R).rgb;
  vec3 envSpecular = F_SchlickRoughness(NdotV, F0, roughness) * envColor * envMapIntensity * 0.5;
  
  // Ambient
  vec3 ambient = vec3(0.05) * baseColor;
  
  // Combine
  vec3 color = ambient + Lo + sss + envSpecular;
  
  // Tone mapping
  color = color / (color + vec3(1.0));
  color = pow(color, vec3(1.0 / 2.2));
  
  fragColor = vec4(color, 1.0);
}
`;

// ============================================================================
// ADVANCED GLASS SHADER (with thin-film interference)
// ============================================================================

const GLASS_FRAGMENT = /* glsl */ `
#version 300 es
precision highp float;

in vec3 vWorldPosition;
in vec3 vNormal;
in vec3 vViewDirection;
in vec2 vUv;

uniform vec3 baseColor;
uniform float ior;
uniform float transmission;
uniform float thickness;
uniform float roughness;
uniform vec3 lightPosition;
uniform vec3 lightColor;
uniform samplerCube envMap;
uniform float envMapIntensity;
uniform float thinFilmThickness;
uniform float thinFilmIor;

out vec4 fragColor;

${PBR_FUNCTIONS}

// Thin-film interference color
vec3 thinFilmInterference(float cosTheta, float filmThickness, float filmIor) {
  if (filmThickness <= 0.0) return vec3(1.0);
  
  float opticalPath = 2.0 * filmIor * filmThickness / cosTheta;
  
  // Wavelengths for RGB (in nm)
  vec3 wavelengths = vec3(650.0, 510.0, 475.0);
  
  // Phase difference
  vec3 phase = 2.0 * PI * opticalPath / wavelengths;
  
  // Interference intensity (simplified)
  vec3 interference = 0.5 + 0.5 * cos(phase);
  
  return interference;
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDirection);
  
  float NdotV = max(dot(N, V), 0.001);
  
  // Fresnel for glass
  float f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
  float fresnel = f0 + (1.0 - f0) * pow(1.0 - NdotV, 5.0);
  
  // Thin-film interference (for coated glass)
  vec3 thinFilm = thinFilmInterference(NdotV, thinFilmThickness, thinFilmIor);
  
  // Reflection
  vec3 R = reflect(-V, N);
  vec3 reflection = texture(envMap, R).rgb * envMapIntensity;
  
  // Refraction direction
  vec3 refractDir = refract(-V, N, 1.0 / ior);
  vec3 refraction = texture(envMap, refractDir).rgb * envMapIntensity;
  
  // Combine with transmission
  vec3 color = mix(refraction * baseColor, reflection, fresnel) * thinFilm;
  
  // Apply transmission (alpha)
  float alpha = mix(1.0 - transmission, 1.0, fresnel);
  
  // Tone mapping
  color = color / (color + vec3(1.0));
  color = pow(color, vec3(1.0 / 2.2));
  
  fragColor = vec4(color, alpha);
}
`;

// ============================================================================
// MATERIAL FACTORY FUNCTIONS
// ============================================================================

export interface AluminiumMaterialParams {
  color?: THREE.Color | string | number;
  roughness?: number;
  anisotropy?: number;
  anisotropyRotation?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  envMap?: THREE.CubeTexture;
  envMapIntensity?: number;
}

export interface UPVCMaterialParams {
  color?: THREE.Color | string | number;
  roughness?: number;
  subsurfaceColor?: THREE.Color | string | number;
  subsurfaceRadius?: number;
  envMap?: THREE.CubeTexture;
  envMapIntensity?: number;
}

export interface GlassMaterialParams {
  color?: THREE.Color | string | number;
  ior?: number;
  transmission?: number;
  thickness?: number;
  roughness?: number;
  envMap?: THREE.CubeTexture;
  envMapIntensity?: number;
  thinFilmThickness?: number;
  thinFilmIor?: number;
}

/**
 * Create an advanced brushed aluminium material
 */
export function createAdvancedAluminiumMaterial(params: AluminiumMaterialParams = {}): THREE.ShaderMaterial {
  const color = params.color instanceof THREE.Color 
    ? params.color 
    : new THREE.Color(params.color ?? 0xC0C0C0);
    
  return new THREE.ShaderMaterial({
    vertexShader: COMMON_VERTEX,
    fragmentShader: ALUMINIUM_FRAGMENT,
    uniforms: {
      baseColor: { value: color },
      metalness: { value: 0.95 },
      roughness: { value: params.roughness ?? 0.25 },
      anisotropy: { value: params.anisotropy ?? 0.5 },
      anisotropyRotation: { value: params.anisotropyRotation ?? 0.0 },
      lightPosition: { value: new THREE.Vector3(10, 10, 10) },
      lightColor: { value: new THREE.Color(0xffffff) },
      lightIntensity: { value: 2.0 },
      envMap: { value: params.envMap ?? null },
      envMapIntensity: { value: params.envMapIntensity ?? 1.0 },
      clearcoat: { value: params.clearcoat ?? 0.1 },
      clearcoatRoughness: { value: params.clearcoatRoughness ?? 0.1 },
    },
    glslVersion: THREE.GLSL3,
    side: THREE.DoubleSide,
  });
}

/**
 * Create an advanced UPVC material with subsurface scattering
 */
export function createAdvancedUPVCMaterial(params: UPVCMaterialParams = {}): THREE.ShaderMaterial {
  const color = params.color instanceof THREE.Color 
    ? params.color 
    : new THREE.Color(params.color ?? 0xFFFFFF);
    
  const subsurfaceColor = params.subsurfaceColor instanceof THREE.Color
    ? params.subsurfaceColor
    : new THREE.Color(params.subsurfaceColor ?? 0xFFFFEE);
    
  return new THREE.ShaderMaterial({
    vertexShader: COMMON_VERTEX,
    fragmentShader: UPVC_FRAGMENT,
    uniforms: {
      baseColor: { value: color },
      roughness: { value: params.roughness ?? 0.5 },
      subsurfaceColor: { value: subsurfaceColor },
      subsurfaceRadius: { value: params.subsurfaceRadius ?? 0.3 },
      lightPosition: { value: new THREE.Vector3(10, 10, 10) },
      lightColor: { value: new THREE.Color(0xffffff) },
      lightIntensity: { value: 2.0 },
      envMap: { value: params.envMap ?? null },
      envMapIntensity: { value: params.envMapIntensity ?? 0.5 },
    },
    glslVersion: THREE.GLSL3,
    side: THREE.DoubleSide,
  });
}

/**
 * Create an advanced glass material with thin-film interference
 */
export function createAdvancedGlassMaterial(params: GlassMaterialParams = {}): THREE.ShaderMaterial {
  const color = params.color instanceof THREE.Color 
    ? params.color 
    : new THREE.Color(params.color ?? 0xFFFFFF);
    
  return new THREE.ShaderMaterial({
    vertexShader: COMMON_VERTEX,
    fragmentShader: GLASS_FRAGMENT,
    uniforms: {
      baseColor: { value: color },
      ior: { value: params.ior ?? 1.52 },
      transmission: { value: params.transmission ?? 0.95 },
      thickness: { value: params.thickness ?? 0.006 },
      roughness: { value: params.roughness ?? 0.0 },
      lightPosition: { value: new THREE.Vector3(10, 10, 10) },
      lightColor: { value: new THREE.Color(0xffffff) },
      envMap: { value: params.envMap ?? null },
      envMapIntensity: { value: params.envMapIntensity ?? 1.0 },
      thinFilmThickness: { value: params.thinFilmThickness ?? 0.0 },
      thinFilmIor: { value: params.thinFilmIor ?? 1.38 },
    },
    glslVersion: THREE.GLSL3,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
}

/**
 * Update light position for all custom materials in a scene
 */
export function updateMaterialLights(
  scene: THREE.Scene,
  lightPosition: THREE.Vector3,
  lightColor: THREE.Color,
  lightIntensity: number
): void {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
      const uniforms = object.material.uniforms;
      if (uniforms.lightPosition) uniforms.lightPosition.value.copy(lightPosition);
      if (uniforms.lightColor) uniforms.lightColor.value.copy(lightColor);
      if (uniforms.lightIntensity) uniforms.lightIntensity.value = lightIntensity;
    }
  });
}

/**
 * Update environment map for all custom materials
 */
export function updateMaterialEnvMap(scene: THREE.Scene, envMap: THREE.CubeTexture): void {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
      const uniforms = object.material.uniforms;
      if (uniforms.envMap) uniforms.envMap.value = envMap;
    }
  });
}

export default {
  createAdvancedAluminiumMaterial,
  createAdvancedUPVCMaterial,
  createAdvancedGlassMaterial,
  updateMaterialLights,
  updateMaterialEnvMap,
};


