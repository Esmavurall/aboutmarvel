import * as THREE from "three";

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const fxCanvas = renderer.domElement;
fxCanvas.className = "fx-layer";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.z = 2.6;

const vertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform float uHasTex;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec2 uMouse;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uCanvasAspect;
  uniform float uTexAspect;

  void main() {
    vec3 base;
    if (uHasTex > 0.5) {
      vec2 uv = vUv;
      if (uTexAspect > uCanvasAspect) {
        uv.x = 0.5 + (uv.x - 0.5) * (uCanvasAspect / uTexAspect);
      } else {
        uv.y = 0.5 + (uv.y - 0.5) * (uTexAspect / uCanvasAspect);
      }
      uv += (uMouse - 0.5) * 0.04;
      uv = clamp(uv, 0.001, 0.999);
      base = texture2D(uTex, uv).rgb;
    } else {
      float g = clamp((vUv.x + vUv.y) * 0.5, 0.0, 1.0);
      base = mix(uColorA, uColorB, g);
    }

    float d = distance(vUv, uMouse);
    base += smoothstep(0.6, 0.0, d) * 0.28;

    float vig = smoothstep(1.0, 0.35, distance(vUv, vec2(0.5)));
    base *= mix(0.82, 1.05, vig);

    gl_FragColor = vec4(base, uOpacity);
  }
`;

const uniforms = {
  uTex: { value: null },
  uHasTex: { value: 0 },
  uColorA: { value: new THREE.Color("#444") },
  uColorB: { value: new THREE.Color("#111") },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uOpacity: { value: 0 },
  uTime: { value: 0 },
  uCanvasAspect: { value: 0.75 },
  uTexAspect: { value: 1.78 },
};

const material = new THREE.ShaderMaterial({
  vertexShader: vertex,
  fragmentShader: fragment,
  uniforms,
  transparent: true,
});

const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
scene.add(mesh);

const loader = new THREE.TextureLoader();
loader.crossOrigin = "anonymous";
const texCache = new Map();

let active = null;
const targetTilt = new THREE.Vector2(0, 0);
const targetMouse = new THREE.Vector2(0.5, 0.5);

function loadTexture(url) {
  if (!url) return Promise.resolve(null);
  if (texCache.has(url)) return Promise.resolve(texCache.get(url));
  return new Promise((resolve) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        texCache.set(url, tex);
        resolve(tex);
      },
      undefined,
      () => resolve(null)
    );
  });
}

function frameToAspect(aspect) {
  const vFov = (camera.fov * Math.PI) / 180;
  const h = 2 * Math.tan(vFov / 2) * camera.position.z;
  const w = h * aspect;
  mesh.scale.set(w * 1.14, h * 1.14, 1);
}

function sizeToCard(card) {
  const w = card.clientWidth;
  const h = card.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  uniforms.uCanvasAspect.value = w / h;
  frameToAspect(w / h);
}

export async function activate(card, data) {
  if (active && active !== card) active.classList.remove("fx-active");
  active = card;

  const url = data.hoverImg || data.img;
  const cached = texCache.get(url);

  uniforms.uColorA.value.set(data.colorA || "#444");
  uniforms.uColorB.value.set(data.colorB || "#111");
  uniforms.uMouse.value.set(0.5, 0.5);
  targetMouse.set(0.5, 0.5);
  targetTilt.set(0, 0);
  mesh.rotation.set(0, 0, 0);

  if (cached) {
    uniforms.uTex.value = cached;
    uniforms.uHasTex.value = 1;
    if (cached.image) {
      uniforms.uTexAspect.value = cached.image.width / cached.image.height;
    }
  } else {
    uniforms.uTex.value = null;
    uniforms.uHasTex.value = 0;
  }

  card.prepend(fxCanvas);
  sizeToCard(card);

  if (cached) {
    card.classList.add("fx-active");
  }

  const tex = cached || (await loadTexture(url));
  if (active !== card) return;

  if (tex) {
    uniforms.uTex.value = tex;
    uniforms.uHasTex.value = 1;
    if (tex.image) {
      uniforms.uTexAspect.value = tex.image.width / tex.image.height;
    }
    card.classList.add("fx-active");
  }
}

export function preload(urls) {
  if (Array.isArray(urls)) {
    urls.forEach((url) => loadTexture(url));
  }
}

export function deactivate(card) {
  card.classList.remove("fx-active");
  if (active === card) active = null;
}

export function setPointer(nx, ny) {
  targetMouse.set(nx, ny);
  targetTilt.set((nx - 0.5) * 0.45, -(ny - 0.5) * 0.45);
}

window.addEventListener("resize", () => {
  if (active && document.body.contains(active)) {
    sizeToCard(active);
  }
});

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);

  if (active && !document.body.contains(active)) {
    active = null;
  }

  const targetOp = active ? 1 : 0;
  uniforms.uOpacity.value += (targetOp - uniforms.uOpacity.value) * 0.16;

  if (!active && uniforms.uOpacity.value < 0.01) {
    if (fxCanvas.parentNode) fxCanvas.parentNode.removeChild(fxCanvas);
    return;
  }

  uniforms.uTime.value = clock.getElapsedTime();
  mesh.rotation.y += (targetTilt.x - mesh.rotation.y) * 0.1;
  mesh.rotation.x += (targetTilt.y - mesh.rotation.x) * 0.1;
  uniforms.uMouse.value.lerp(targetMouse, 0.14);

  renderer.render(scene, camera);
}
loop();
