import * as THREE from "three";

export type GrassUniforms = {
  uTime: THREE.IUniform<number>;
  uGrassHeight: THREE.IUniform<number>;
  uWindStrength: THREE.IUniform<number>;
  uWindSpeed: THREE.IUniform<number>;
  uSunDirection: THREE.IUniform<THREE.Vector3>;
  uRootColor: THREE.IUniform<THREE.Color>;
  uTipColor: THREE.IUniform<THREE.Color>;
};

export function createGrassMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uGrassHeight: { value: 0.58 },
      uWindStrength: { value: 0.34 },
      uWindSpeed: { value: 1.5 },
      uSunDirection: { value: new THREE.Vector3(0.3, 0.7, 0.2).normalize() },
      uRootColor: { value: new THREE.Color("#1c4d2c") },
      uTipColor: { value: new THREE.Color("#a9e56a") },
    } satisfies GrassUniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
  });
}

const vertexShader = /* glsl */ `
  attribute vec3 instanceOffset;
  attribute float instanceScale;
  attribute float instanceAngle;
  attribute float instancePhase;

  uniform float uTime;
  uniform float uGrassHeight;
  uniform float uWindStrength;
  uniform float uWindSpeed;

  varying vec2 vUv;
  varying float vTip;
  varying float vWind;
  varying vec3 vWorldNormal;

  mat2 rotate2d(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
  }

  void main() {
    vUv = uv;
    vTip = pow(uv.y, 1.7);

    vec3 transformed = position;
    transformed.y *= uGrassHeight * instanceScale;

    float gust = sin(
      uTime * uWindSpeed +
      instancePhase +
      instanceOffset.x * 0.75 +
      instanceOffset.z * 0.45
    );
    float microGust = sin(uTime * (uWindSpeed * 1.73) + instancePhase * 2.1);
    float bend = (gust * 0.75 + microGust * 0.25) * uWindStrength * vTip;

    transformed.x += bend * 0.42;
    transformed.z += cos(gust + instancePhase) * uWindStrength * vTip * 0.16;

    transformed.xz = rotate2d(instanceAngle) * transformed.xz;
    transformed += instanceOffset;

    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWind = bend;
    vWorldNormal = normalize(mat3(modelMatrix) * vec3(-bend, 1.0, 0.18));

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform vec3 uRootColor;
  uniform vec3 uTipColor;

  varying vec2 vUv;
  varying float vTip;
  varying float vWind;
  varying vec3 vWorldNormal;

  void main() {
    float centerVein = 1.0 - smoothstep(0.0, 0.28, abs(vUv.x - 0.5));
    float edgeShade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
    float bladeNoise = sin(vUv.y * 28.0 + vWind * 3.0) * 0.035;

    vec3 baseColor = mix(uRootColor, uTipColor, vTip);
    baseColor += centerVein * vec3(0.06, 0.09, 0.02);
    baseColor *= 0.75 + edgeShade * 0.32 + bladeNoise;

    float light = clamp(dot(normalize(vWorldNormal), normalize(uSunDirection)) * 0.5 + 0.5, 0.0, 1.0);
    vec3 color = baseColor * (0.42 + light * 0.88);
    color += vec3(0.34, 0.58, 0.19) * pow(vTip, 4.0) * 0.18;

    gl_FragColor = vec4(color, 1.0);
  }
`;
