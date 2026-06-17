import * as THREE from "three";

export type SkyUniforms = {
  uTime: THREE.IUniform<number>;
  uSunDirection: THREE.IUniform<THREE.Vector3>;
  uTurbidity: THREE.IUniform<number>;
  uExposure: THREE.IUniform<number>;
  uCloudCoverage: THREE.IUniform<number>;
  uCloudDensity: THREE.IUniform<number>;
  uCloudSpeed: THREE.IUniform<number>;
  uCloudScale: THREE.IUniform<number>;
};

export function createSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDirection: { value: new THREE.Vector3(0.3, 0.7, 0.2).normalize() },
      uTurbidity: { value: 4.2 },
      uExposure: { value: 1 },
      uCloudCoverage: { value: 0.46 },
      uCloudDensity: { value: 0.54 },
      uCloudSpeed: { value: 0.18 },
      uCloudScale: { value: 4.2 },
    } satisfies SkyUniforms,
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
  });
}

const vertexShader = /* glsl */ `
  varying vec3 vWorldDirection;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldDirection = normalize(worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSunDirection;
  uniform float uTurbidity;
  uniform float uExposure;
  uniform float uCloudCoverage;
  uniform float uCloudDensity;
  uniform float uCloudSpeed;
  uniform float uCloudScale;

  varying vec3 vWorldDirection;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.52;
    mat2 rotation = mat2(0.82, -0.57, 0.57, 0.82);

    for (int i = 0; i < 6; i++) {
      value += valueNoise(p) * amplitude;
      p = rotation * p * 2.05 + 11.7;
      amplitude *= 0.5;
    }

    return value;
  }

  void main() {
    vec3 direction = normalize(vWorldDirection);
    float altitude = clamp(direction.y, 0.0, 1.0);
    float horizon = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
    float sunAmount = max(dot(direction, normalize(uSunDirection)), 0.0);
    float haze = clamp(uTurbidity / 12.0, 0.0, 1.0);

    vec3 zenith = mix(vec3(0.025, 0.18, 0.42), vec3(0.16, 0.32, 0.56), haze);
    vec3 upperSky = mix(zenith, vec3(0.23, 0.48, 0.82), smoothstep(0.22, 0.88, uSunDirection.y));
    vec3 horizonColor = mix(vec3(1.0, 0.48, 0.18), vec3(0.66, 0.84, 0.98), smoothstep(0.1, 0.78, uSunDirection.y));
    vec3 sky = mix(horizonColor, upperSky, pow(horizon, 0.62));

    vec3 rayleigh = vec3(0.35, 0.56, 1.0) * pow(1.0 - sunAmount, 2.0) * 0.1;
    vec3 solarGlow = vec3(1.0, 0.72, 0.36) * pow(sunAmount, mix(48.0, 10.0, haze));
    vec3 sunCore = vec3(1.0, 0.92, 0.72) * pow(sunAmount, 740.0);
    vec3 lowSunWarmth = vec3(0.9, 0.28, 0.08) * (1.0 - smoothstep(0.05, 0.5, uSunDirection.y)) * pow(sunAmount, 4.0);

    vec2 cloudUv = direction.xz / max(direction.y + 0.24, 0.24);
    cloudUv *= uCloudScale;
    cloudUv += vec2(uTime * uCloudSpeed * 0.018, uTime * uCloudSpeed * 0.007);

    float cloudBase = fbm(cloudUv);
    float cloudDetail = fbm(cloudUv * 2.8 + cloudBase * 1.7);
    float cloudField = mix(cloudBase, cloudDetail, 0.42);
    float cloudEdge = mix(0.72, 0.28, uCloudCoverage);
    float cloudMask = smoothstep(cloudEdge, cloudEdge + 0.2, cloudField);
    cloudMask *= smoothstep(0.02, 0.2, altitude) * (1.0 - smoothstep(0.92, 1.0, altitude));
    cloudMask *= mix(0.08, 1.0, uCloudDensity);

    float cloudShadowNoise = fbm(cloudUv * 1.34 + vec2(19.4, -7.1));
    float cloudSelfShadow = smoothstep(0.18, 1.0, cloudShadowNoise);
    float cloudSun = pow(max(dot(direction, normalize(uSunDirection)), 0.0), 2.2);
    vec3 cloudWarm = mix(vec3(1.0, 0.55, 0.22), vec3(1.0, 0.86, 0.58), smoothstep(0.15, 0.65, uSunDirection.y));
    vec3 cloudCool = vec3(0.54, 0.62, 0.68);
    vec3 cloudColor = mix(cloudCool, vec3(1.0), 0.42 + cloudSun * 0.28);
    cloudColor = mix(cloudColor, cloudWarm, cloudSun * 0.48 + (1.0 - smoothstep(0.12, 0.44, uSunDirection.y)) * 0.2);
    cloudColor *= mix(0.64, 1.22, cloudSelfShadow);

    sky = mix(sky, cloudColor, clamp(cloudMask, 0.0, 0.72));
    sky += vec3(1.0, 0.72, 0.44) * cloudMask * cloudSun * 0.18;

    vec3 color = sky + rayleigh + solarGlow + sunCore + lowSunWarmth;
    color = vec3(1.0) - exp(-color * uExposure);

    gl_FragColor = vec4(color, 1.0);
  }
`;
