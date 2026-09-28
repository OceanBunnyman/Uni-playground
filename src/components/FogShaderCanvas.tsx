import { useEffect, useRef } from "react";

type Point = { x: number; y: number };

const vertexShaderSource = /* glsl */ `
  attribute vec2 aPosition;
  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const fragmentShaderSource = /* glsl */ `
  precision mediump float;
  #define MAX_CLEARINGS 128

  uniform vec2 uResolution;
  uniform vec2 uCamera;
  uniform vec2 uViewSize;
  uniform float uZoom;
  uniform float uTime;
  uniform int uClearingCount;
  uniform vec2 uClearings[MAX_CLEARINGS];
  uniform vec3 uFogLight;
  uniform vec3 uFogDeep;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.55;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + vec2(19.1, 7.7);
      amplitude *= 0.48;
    }
    return value;
  }

  void main() {
    vec2 screenUv = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uResolution;
    vec2 world = uCamera + (screenUv - 0.5) * uViewSize / uZoom;
    float clearing = 0.0;

    for (int i = 0; i < MAX_CLEARINGS; i++) {
      if (i >= uClearingCount) break;
      float radius = i == 0 ? 92.0 : 72.0;
      float edge = 7.0 / uZoom;
      clearing = max(clearing, 1.0 - smoothstep(radius - edge, radius + edge, distance(world, uClearings[i])));
    }

    if (clearing > 0.995) discard;

    vec2 drift = vec2(uTime * 0.018, -uTime * 0.011);
    float broad = fbm(world * 0.006 + drift);
    float detail = fbm(world * 0.014 - drift * 1.7 + vec2(4.2, 1.8));
    float density = smoothstep(0.18, 0.92, broad * 0.72 + detail * 0.4);
    vec3 color = mix(uFogDeep, uFogLight, density);
    float edgeMist = 1.0 - clearing;
    gl_FragColor = vec4(color, max(0.92, edgeMist));
  }
`;

function readRgb(element: HTMLElement, name: string, fallback: [number, number, number]) {
  const raw = getComputedStyle(element).getPropertyValue(name).trim();
  const values = raw.split(/\s+/).map(Number);
  if (values.length !== 3 || values.some((value) => !Number.isFinite(value))) return fallback;
  return values as [number, number, number];
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function FogShaderCanvas({ camera, explored, zoom, viewSize }: { camera: Point; explored: Point[]; zoom: number; viewSize: Point }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({ camera, explored, zoom, viewSize });
  stateRef.current = { camera, explored, zoom, viewSize };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl) return;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    if (!vertexShader || !fragmentShader || !program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);

    const resolutionLocation = gl.getUniformLocation(program, "uResolution");
    const cameraLocation = gl.getUniformLocation(program, "uCamera");
    const viewSizeLocation = gl.getUniformLocation(program, "uViewSize");
    const zoomLocation = gl.getUniformLocation(program, "uZoom");
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const clearingCountLocation = gl.getUniformLocation(program, "uClearingCount");
    const clearingsLocation = gl.getUniformLocation(program, "uClearings");
    const fogLightLocation = gl.getUniformLocation(program, "uFogLight");
    const fogDeepLocation = gl.getUniformLocation(program, "uFogDeep");
    const fogLight = readRgb(canvas, "--fog-light-rgb", [0.84, 0.88, 0.83]);
    const fogDeep = readRgb(canvas, "--fog-deep-rgb", [0.68, 0.75, 0.71]);
    gl.uniform3fv(fogLightLocation, fogLight);
    gl.uniform3fv(fogDeepLocation, fogDeep);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(canvas.clientWidth * scale));
      const height = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.uniform2f(resolutionLocation, width, height);
    };

    let frame = 0;
    const started = performance.now();
    const render = (now: number) => {
      const current = stateRef.current;
      resize();
      gl.uniform2f(cameraLocation, current.camera.x, current.camera.y);
      gl.uniform2f(viewSizeLocation, current.viewSize.x, current.viewSize.y);
      gl.uniform1f(zoomLocation, current.zoom);
      const margin = 110 / current.zoom;
      const halfWidth = current.viewSize.x / current.zoom / 2 + margin;
      const halfHeight = current.viewSize.y / current.zoom / 2 + margin;
      const nearby = current.explored.filter((point) => Math.abs(point.x - current.camera.x) <= halfWidth && Math.abs(point.y - current.camera.y) <= halfHeight);
      const clearings = [{ x: 198, y: 615 }, ...nearby.filter((point) => point.x !== 198 || point.y !== 615)].slice(0, 128);
      gl.uniform1i(clearingCountLocation, clearings.length);
      gl.uniform2fv(clearingsLocation, new Float32Array(clearings.flatMap((point) => [point.x, point.y])));
      gl.uniform1f(timeLocation, reduceMotion ? 0 : (now - started) / 1000);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduceMotion) frame = window.requestAnimationFrame(render);
    };
    render(started);

    return () => {
      window.cancelAnimationFrame(frame);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} className="fog-shader-canvas pointer-events-none absolute inset-0 z-[36] h-full w-full" aria-hidden="true" />;
}