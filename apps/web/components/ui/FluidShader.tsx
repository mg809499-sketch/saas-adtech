"use client";
import { useEffect, useRef } from "react";

const VS = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FS = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,
                        0.366025403784439,
                       -0.577350269189626,
                        0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);

    vec2 mouse = u_mouse.xy / u_resolution.xy;
    vec2 mouseOffset = (mouse - 0.5) * 0.4;
    p += mouseOffset * 0.3;

    float t = u_time * 0.18;

    float q = snoise(p * 1.8 + vec2(t * 0.35, t * 0.25));
    float r = snoise(p * 2.5 - vec2(t * 0.2, -t * 0.4) + vec2(q));

    float angle = atan(p.y, p.x);
    float dist = length(p);
    float pulse = sin(dist * 7.0 - u_time * 0.6 + q * 2.5);

    float grid = (sin(uv.x * 60.0 + q) * sin(uv.y * 60.0 + r)) * 0.02;

    vec3 bgDark = vec3(0.035, 0.065, 0.135);
    vec3 indigo = vec3(0.388, 0.40, 0.945);
    vec3 emerald = vec3(0.063, 0.725, 0.506);
    vec3 cyanGlow = vec3(0.22, 0.74, 0.97);

    float weightIndigo = smoothstep(-0.6, 0.8, q + pulse * 0.25);
    float weightEmerald = smoothstep(0.1, 1.0, r * 1.2 + pulse * 0.4);
    float weightGlow = smoothstep(0.65, 1.1, (q + r) * 0.7 + pulse * 0.5);

    vec3 color = bgDark;
    color = mix(color, indigo * 0.85, weightIndigo * 0.34);
    color = mix(color, emerald * 0.9, weightEmerald * 0.40);
    color += cyanGlow * (weightGlow * 0.28);
    color += vec3(grid);

    float vignette = smoothstep(1.4, 0.2, length(uv - 0.5));
    color *= vignette;

    gl_FragColor = vec4(color, 1.0);
}`;

// Fondo fluido WebGL con colores de marca. Solo cliente, con cleanup y pausa
// cuando la pestaña está oculta o el usuario prefiere movimiento reducido.
export function FluidShader() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "low-power" }) as WebGLRenderingContext | null;
    if (!gl) return;

    // Baja resolución: el fondo es fluido/difuso por naturaleza, así que
    // renderizar a ~1/3 y escalar por CSS recorta ~90% del costo de fragment.
    const syncSize = () => {
      const scale = 0.34;
      const w = Math.max(160, Math.floor((canvas.clientWidth || 1280) * scale));
      const h = Math.max(90, Math.floor((canvas.clientHeight || 720) * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    };
    syncSize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSize) : null;
    ro?.observe(canvas);

    const cs = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, cs(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, cs(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    // Sin interacción de cursor: el mouse queda fijo al centro (offset 0).
    const mouse = { x: canvas.width / 2, y: canvas.height / 2 };

    let raf = 0;
    let last = 0;
    const render = (t: number) => {
      raf = requestAnimationFrame(render);
      if (document.hidden) return;
      if (t - last < 50) return; // ~20fps: fondo ambiental, imperceptible vs 30fps
      last = t;
      if (!ro) syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // raf ya encolado arriba para mantener cadencia estable
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 block h-full w-full" />;
}
