const vertexSource = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;
uniform vec2 resolution;
uniform float scroll;
out vec4 color;

mat2 rotate(float angle) {
  float s = sin(angle), c = cos(angle);
  return mat2(c, -s, s, c);
}

float ringDistance(vec3 p) {
  return length(vec2(length(p.xy) - 1.15, p.z)) - 0.22;
}

float shape(vec3 p) {
  vec3 ring = p;
  ring.yz = rotate(0.65 + scroll * 0.09) * ring.yz;
  ring.xz = rotate(-0.4 + scroll * 0.22) * ring.xz;
  float spread = sin(clamp(scroll / 4.8, 0.0, 1.0) * 3.14159) * 0.48;
  vec3 right = ring - vec3(spread, 0.0, 0.0);
  vec3 left = ring + vec3(spread, 0.0, 0.0);
  float torus = min(max(ringDistance(right), -right.x), max(ringDistance(left), left.x));
  float pearl = length(p - vec3(-1.7, -0.7, 0.35)) - 0.3;
  return min(torus, pearl);
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - resolution) / resolution.y;
  uv -= vec2(0.65, 0.1 + sin(scroll * 0.2) * 0.18);
  vec3 origin = vec3(0.0, 0.0, 4.5);
  vec3 ray = normalize(vec3(uv, -2.6));
  float travel = 0.0;
  float distance = 1.0;
  for (int step = 0; step < 40; step++) {
    distance = shape(origin + ray * travel);
    if (distance < 0.003 || travel > 8.0) break;
    travel += distance;
  }
  if (distance >= 0.003) {
    color = vec4(0.0);
    return;
  }
  vec3 p = origin + ray * travel;
  vec2 e = vec2(0.004, 0.0);
  vec3 normal = normalize(vec3(
    shape(p + e.xyy) - shape(p - e.xyy),
    shape(p + e.yxy) - shape(p - e.yxy),
    shape(p + e.yyx) - shape(p - e.yyx)
  ));
  vec3 light = normalize(vec3(-0.4, 0.8, 1.4));
  float diffuse = max(dot(normal, light), 0.0);
  float shine = pow(max(dot(reflect(-light, normal), -ray), 0.0), 32.0);
  float rim = pow(1.0 - max(dot(normal, -ray), 0.0), 3.0);
  vec3 pearl = mix(vec3(0.13, 0.25, 0.43), vec3(0.66, 0.83, 1.0), diffuse);
  color = vec4(pearl + shine * 0.45 + rim * 0.15, 1.0);
}`;

export function createScene(canvas: HTMLCanvasElement): () => void {
  let gl: WebGL2RenderingContext | null;
  try {
    gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    });
  } catch {
    return () => {};
  }
  if (!gl) return () => {};
  const context = gl;
  const program = context.createProgram();
  const shaders: WebGLShader[] = [];
  const release = () => {
    shaders.forEach((shader) => context.deleteShader(shader));
    if (program) context.deleteProgram(program);
  };
  if (!program) return release;
  for (const [type, source] of [
    [context.VERTEX_SHADER, vertexSource],
    [context.FRAGMENT_SHADER, fragmentSource],
  ] as const) {
    const shader = context.createShader(type);
    if (!shader) {
      release();
      return () => {};
    }
    shaders.push(shader);
    context.shaderSource(shader, source);
    context.compileShader(shader);
    context.attachShader(program, shader);
  }
  context.linkProgram(program);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    release();
    return () => {};
  }
  const resolution = context.getUniformLocation(program, "resolution");
  const scroll = context.getUniformLocation(program, "scroll");
  let frame = 0;
  let lost = false;
  const render = () => {
    frame = 0;
    if (lost || document.hidden) return;
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    const scale = Math.min(
      window.devicePixelRatio || 1,
      1.25,
      1200 / width,
      800 / height,
    );
    const pixelWidth = Math.round(width * scale);
    const pixelHeight = Math.round(height * scale);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.viewport(0, 0, canvas.width, canvas.height);
    context.useProgram(program);
    context.uniform2f(resolution, canvas.width, canvas.height);
    context.uniform1f(scroll, Math.min(window.scrollY / height, 12));
    context.drawArrays(context.TRIANGLES, 0, 3);
    canvas.dataset.ready = "true";
  };
  const schedule = () => {
    if (!frame && !lost && !document.hidden)
      frame = requestAnimationFrame(render);
  };
  const contextLost = () => {
    lost = true;
    cancelAnimationFrame(frame);
    delete canvas.dataset.ready;
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  document.addEventListener("visibilitychange", schedule);
  canvas.addEventListener("webglcontextlost", contextLost);
  schedule();
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    document.removeEventListener("visibilitychange", schedule);
    canvas.removeEventListener("webglcontextlost", contextLost);
    delete canvas.dataset.ready;
    release();
  };
}
