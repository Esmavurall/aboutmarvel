/* ============================================================================
 * scene3d.js — KART HOVER 3B EFEKTİ (Three.js)
 * TEK paylaşımlı WebGL canvas'ı vardır; hover edilen kartın İÇİNE, yazıların
 * ALTINA yerleştirilir (z-index ile). Aynı anda yalnızca bir kart hover edildiği
 * için tek renderer yeterli ve performanslıdır. Mouse'a göre 3B tilt + parallax
 * + ışık parıltısı uygular. Görsel (CORS dâhil) yüklenemezse renk paletine düşer.
 *
 * Dosya haritası:
 *   - Renderer + canvas + kamera kurulumu        → satır ~12
 *   - Shader'lar (vertex / fragment)             → satır ~25
 *   - uniforms + material + mesh (düzlem)        → satır ~78
 *   - Doku yükleyici + durum değişkenleri        → satır ~100
 *   - loadTexture()  : görseli yükle/önbellekle  → satır ~110
 *   - frameToAspect(): düzlemi ekrana sığdır     → satır ~128
 *   - sizeToCard()   : canvas'ı karta göre boyutla→ satır ~136
 *   - activate()     : hover başlat (DIŞA AÇIK)  → satır ~148
 *   - deactivate()   : hover bitir  (DIŞA AÇIK)  → satır ~176
 *   - setPointer()   : fare konumu  (DIŞA AÇIK)  → satır ~182
 *   - loop()         : her karede çiz            → satır ~188
 * ========================================================================== */
import * as THREE from "three";

// --- Renderer (saydam, antialias) + canvas'a CSS sınıfı ---
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const fxCanvas = renderer.domElement;
fxCanvas.className = "fx-layer";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100); // perspektif → tilt'te derinlik
camera.position.z = 2.6;

// --- Vertex shader: uv koordinatını fragment'a taşır ---
const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// --- Fragment shader: cover kırpma + parallax + ışık parıltısı + vignette ---
const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform float uHasTex;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec2 uMouse;          // kart içi 0..1
  uniform float uOpacity;
  uniform float uTime;
  uniform float uCanvasAspect;  // w/h
  uniform float uTexAspect;     // w/h

  void main() {
    vec3 base;
    if (uHasTex > 0.5) {
      // object-fit: cover hesabı
      vec2 uv = vUv;
      if (uTexAspect > uCanvasAspect) {
        uv.x = 0.5 + (uv.x - 0.5) * (uCanvasAspect / uTexAspect);
      } else {
        uv.y = 0.5 + (uv.y - 0.5) * (uTexAspect / uCanvasAspect);
      }
      // mouse'a doğru çok hafif parallax (derinlik)
      uv += (uMouse - 0.5) * 0.04;
      uv = clamp(uv, 0.001, 0.999);
      base = texture2D(uTex, uv).rgb;
    } else {
      float g = clamp((vUv.x + vUv.y) * 0.5, 0.0, 1.0);
      base = mix(uColorA, uColorB, g);
    }

    // mouse pozisyonunda yumuşak ışık parıltısı
    float d = distance(vUv, uMouse);
    base += smoothstep(0.6, 0.0, d) * 0.28;

    // hafif vignette (broşür hissi)
    float vig = smoothstep(1.0, 0.35, distance(vUv, vec2(0.5)));
    base *= mix(0.82, 1.05, vig);

    gl_FragColor = vec4(base, uOpacity);
  }
`;

// --- Uniform'lar: JS'ten shader'a aktarılan değerler (doku, renk, fare, vb.) ---
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

// --- Shader malzemesi + üzerine görsel bineceği düzlem (plane) ---
const material = new THREE.ShaderMaterial({
  vertexShader: vertex,
  fragmentShader: fragment,
  uniforms,
  transparent: true,
});

const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
scene.add(mesh);

// --- Doku yükleyici (CORS) + aynı görseli tekrar yüklememek için önbellek ---
const loader = new THREE.TextureLoader();
loader.crossOrigin = "anonymous";
const texCache = new Map();

// --- Durum: o an hover edilen kart ve yumuşatma için hedef değerler ---
let active = null;
const targetTilt = new THREE.Vector2(0, 0);
const targetMouse = new THREE.Vector2(0.5, 0.5);

// loadTexture(url): görseli yükler, önbelleğe alır; hata/CORS olursa null döner
// (null → shader renk paletine düşer). Promise döndürür.
function loadTexture(url) {
  if (!url) return Promise.resolve(null);
  if (texCache.has(url)) return Promise.resolve(texCache.get(url));
  return new Promise((resolve) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter; // bulanıklığı önle
        tex.generateMipmaps = false;
        texCache.set(url, tex);
        resolve(tex);
      },
      undefined,
      () => resolve(null) // hata/CORS → palete düş
    );
  });
}

// Düzlemi, kamerayı tam dolduracak şekilde boyutla (z=0)
function frameToAspect(aspect) {
  const vFov = (camera.fov * Math.PI) / 180;
  const h = 2 * Math.tan(vFov / 2) * camera.position.z;
  const w = h * aspect;
  mesh.scale.set(w * 1.14, h * 1.14, 1); // tilt boşluklarını kapatmak için pay
}

// sizeToCard(card): renderer'ı ve kamerayı kartın piksel boyutuna göre ayarlar
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

// activate(card, data): [DIŞA AÇIK] hover başladığında çağrılır (main.js).
// Canvas'ı karta taşır, paleti ayarlar ve hover görselini yükleyip gösterir.
export async function activate(card, data) {
  // önceki kartı temizle
  if (active && active !== card) active.classList.remove("fx-active");
  active = card;

  uniforms.uColorA.value.set(data.colorA || "#444");
  uniforms.uColorB.value.set(data.colorB || "#111");
  uniforms.uMouse.value.set(0.5, 0.5);
  targetMouse.set(0.5, 0.5);
  targetTilt.set(0, 0);
  mesh.rotation.set(0, 0, 0);

  // canvas'ı bu kartın içine taşı + boyutla
  card.prepend(fxCanvas);
  sizeToCard(card);

  // Hover'da, durağan kapaktan FARKLI olan ikinci sahneyi göster.
  const tex = await loadTexture(data.hoverImg || data.img);
  if (active !== card) return; // bu arada hover bittiyse iptal

  uniforms.uTex.value = tex;
  uniforms.uHasTex.value = tex ? 1 : 0;
  if (tex && tex.image) {
    uniforms.uTexAspect.value = tex.image.width / tex.image.height;
  }
  card.classList.add("fx-active");
}

// deactivate(card): [DIŞA AÇIK] hover bitince çağrılır; efekti kapatır
// (canvas, opaklık sıfırlanınca loop() içinde DOM'dan kaldırılır).
export function deactivate(card) {
  card.classList.remove("fx-active");
  if (active === card) active = null;
}

// setPointer(nx, ny): [DIŞA AÇIK] kart içi fare konumu (0..1); tilt/parallax hedefi
export function setPointer(nx, ny) {
  targetMouse.set(nx, ny);
  targetTilt.set((nx - 0.5) * 0.45, -(ny - 0.5) * 0.45); // radyan civarı
}

// loop(): her karede çalışır. Opaklığı/tilt'i/fare konumunu yumuşatıp sahneyi çizer;
// hover bittiğinde (opaklık ~0) canvas'ı DOM'dan kaldırıp çizimi durdurur.
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);

  const targetOp = active ? 1 : 0;
  uniforms.uOpacity.value += (targetOp - uniforms.uOpacity.value) * 0.16;

  if (!active && uniforms.uOpacity.value < 0.01) {
    if (fxCanvas.parentNode) fxCanvas.parentNode.removeChild(fxCanvas);
    return; // çizecek bir şey yok
  }

  uniforms.uTime.value = clock.getElapsedTime();
  mesh.rotation.y += (targetTilt.x - mesh.rotation.y) * 0.1;
  mesh.rotation.x += (targetTilt.y - mesh.rotation.x) * 0.1;
  uniforms.uMouse.value.lerp(targetMouse, 0.14);

  renderer.render(scene, camera);
}
loop();
