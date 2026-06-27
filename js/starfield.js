/* ============================================================================
 * starfield.js — ARKA PLAN 3B YILDIZ ALANI (Three.js, dekoratif)
 * En arkada (z-index:0, içeriğin ALTINDA), tüm ekranı kaplayan sabit bir
 * WebGL canvas'ı oluşturur. Fare hareket ettikçe kamera/parallax kayar ve
 * yıldızlar 3 boyutlu derinlik hissiyle hareket eder. pointer-events:none
 * olduğu için kartlara veya tıklamalara HİÇBİR etkisi yoktur.
 *
 * Dosya haritası:
 *   - Renderer + canvas'ı en arkaya yerleştirme   → satır ~20
 *   - Sahne + kamera                              → satır ~38
 *   - makeStarTexture(): yuvarlak yıldız dokusu   → satır ~43
 *   - makeLayer()     : bir yıldız katmanı üretir → satır ~62
 *   - far / near katmanları (parallax için iki kat)→ satır ~88
 *   - Fare + resize dinleyicileri                 → satır ~92
 *   - loop(): her karede süzülme + parallax çizimi→ satır ~108
 * ========================================================================== */
import * as THREE from "three";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- Canvas (en arkaya yerleştir) ---
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const canvas = renderer.domElement;
canvas.id = "starfield";
Object.assign(canvas.style, {
  position: "fixed",
  inset: "0",
  width: "100%",
  height: "100%",
  zIndex: "0",
  pointerEvents: "none",
});
document.body.prepend(canvas); // body'nin ilk çocuğu → her şeyin arkasında

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
camera.position.z = 320;

// makeStarTexture(): canvas 2D radial gradient ile yuvarlak/yumuşak yıldız dokusu
// üretir (kare nokta yerine ışıltılı yuvarlak görünüm için).
function makeStarTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.85)");
  g.addColorStop(0.5, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// --- Yıldızlar (iki katman: uzak + yakın → güçlü parallax) ---
const starGroup = new THREE.Group();
scene.add(starGroup);

// makeLayer(...): tek bir yıldız katmanı oluşturur (rastgele konumlu Points).
//   count    : yıldız sayısı | spreadXY/Z: yayılım | size: boyut
//   opacity  : saydamlık     | tint      : renk tonu
// Katmanı starGroup'a ekler ve Points nesnesini döndürür.
function makeLayer(count, spreadXY, spreadZ, size, opacity, tint) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spreadXY;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spreadXY;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spreadZ;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size,
    map: starTexture,
    color: tint,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  starGroup.add(points);
  return points;
}

const starTexture = makeStarTexture();
const far = makeLayer(1400, 1600, 900, 2.2, 0.7, 0x8fa6ff);   // uzak, mavimsi
const near = makeLayer(900, 1200, 600, 4.5, 0.95, 0xffffff);  // yakın, beyaz parlak

// --- Fare etkileşimi: konumu -1..1 aralığına çevirip hedef değişkenlere yaz ---
// (loop() içinde bu hedeflere doğru yumuşatma yapılır → akıcı parallax)
let targetX = 0;
let targetY = 0;
window.addEventListener("pointermove", (e) => {
  targetX = (e.clientX / window.innerWidth) * 2 - 1;
  targetY = (e.clientY / window.innerHeight) * 2 - 1;
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});
renderer.setSize(window.innerWidth, window.innerHeight, false);

// loop(): her karede çalışır. Sürekli yavaş süzülme + fareye doğru yumuşatılmış
// kamera/katman kayması ile 3B parallax üretir, sonra sahneyi çizer.
// (prefers-reduced-motion açıksa hareket atlanır, sadece çizim yapılır.)
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const t = clock.getElapsedTime();

  if (!reduceMotion) {
    // sürekli yavaş süzülme (canlılık)
    starGroup.rotation.y = t * 0.02;
    starGroup.rotation.x = Math.sin(t * 0.05) * 0.03;

    // fareye doğru yumuşatılmış parallax (3B derinlik)
    camera.position.x += (targetX * 60 - camera.position.x) * 0.04;
    camera.position.y += (-targetY * 60 - camera.position.y) * 0.04;
    // farklı katmanlar farklı tepki → derinlik
    far.rotation.y = -targetX * 0.05;
    near.rotation.y = -targetX * 0.12;
    near.rotation.x = targetY * 0.12;
  }

  camera.lookAt(scene.position);
  renderer.render(scene, camera);
}
loop();
