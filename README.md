# 🎬 MARVEL · Sinematik Evren Kataloğu

Marvel Sinematik Evreni'ndeki (MCU) filmlerin **vurucu sahnelerini broşür kapağı**
olarak sunan, modern ve sade bir film kataloğu. Her kartın üzerine gelindiğinde
**Three.js** ile sahne 3 boyutlu canlanır; altında filmin künyesi açılır.

> Build/araç gerektirmez — saf HTML, CSS ve JavaScript. Tek yapman gereken statik
> bir sunucuyla açmak.

---

## ✨ Özellikler

- **35 MCU filmi**, Faz 1 → Faz 5 kronolojik sırada
- Her film kartında: film ismi, **yapımcı**, yönetmen, merak uyandıran özet,
  **başrol oyuncuları** ve **vurucu sahne** etiketi
- **İki ayrı görsel**: durağan kapak ile hover sahnesi farklı karelerdir
- **Three.js 3B hover efekti**: tilt + parallax derinlik + ışık parıltısı
- **Arama** (film / oyuncu / yönetmen) ve **Faz filtresi**
- Tüm görseller **yerelde** barındırılır → dış servis/erişim engellerinden bağımsız
- **Dayanıklı tasarım**: Three.js yüklenemezse katalog yine de çalışır (saf-CSS hover'a düşer);
  bir görsel açılmazsa filmin renk paletinde gradient'e düşer

---

## 📁 Proje Yapısı

```
deneme/
├── index.html                  # Giriş noktası: iskelet, hero, arama/filtre, CDN'ler
├── README.md                   # Bu dosya
│
├── css/
│   └── style.css               # Tüm özel stiller (kart, 3B katman, hover, animasyon)
│
├── js/
│   ├── data.js                 # Film verisi (35 film) + görsel yollarının bağlanması
│   ├── main.js                 # Kart render'ı, arama/filtre, hover olay bağlama
│   ├── scene3d.js              # Three.js 3B hover efekti (opsiyonel modül)
│   └── starfield.js            # Three.js arka plan 3B yıldız alanı (fareyle hareketli)
│
└── assets/
    └── images/
        ├── covers/             # Durağan kart kapakları   (35 × <film-id>.jpg)
        └── scenes/             # Hover'da gösterilen sahne (35 × <film-id>.jpg)
```

---

## 📄 Dosya Dosya Ne İşe Yarıyor?

### `index.html`
Uygulamanın iskeleti ve tek HTML sayfası.
- **Tailwind CSS** (Play CDN) — utility class'larla hızlı, sade, responsive arayüz
- **Google Fonts** — `Bebas Neue` (başlıklar) + `Inter` (gövde)
- **Three.js importmap** — `three` modülünü `unpkg`'den ESM olarak getirir (bundler yok)
- Hero bölümü, **arama kutusu** ve **Faz filtre** alanı
- Kataloğun render edileceği `#grid` konteyneri
- `css/style.css` ve `js/main.js` (type="module") bağlantıları

### `css/style.css`
Tailwind dışındaki tüm özel görsel mantık.
- `.film-card` — broşür kartı (3:4 oran, yuvarlatma, hover'da yükselme + parıltılı gölge)
- **Katman sıralaması (z-index)** — gradient `0` < kapak resmi `1` < 3B canvas `2` <
  karartma `3` < yazılar `4` *(durağan görselin görünmesini sağlayan kritik kısım)*
- `.film-detail` — hover'da yumuşakça açılan künye paneli (grid-rows geçişi)
- `.fx-layer` — Three.js canvas'ının kart içindeki konumu/katmanı
- Giriş animasyonu, filtre çipleri, `prefers-reduced-motion` desteği

### `js/data.js`
Tek **veri kaynağı**. `FILMS` dizisini dışa aktarır.
- Her film nesnesi: `id`, `title`, `year`, `phase`, `producer`, `director`,
  `cast[]`, `summary`, `scene`, `colorA`, `colorB` (palet)
- Dosya sonunda her filme görsel yolları bağlanır:
  - `img`      → `assets/images/covers/<id>.jpg` (durağan kapak)
  - `hoverImg` → `assets/images/scenes/<id>.jpg` (hover sahnesi)

### `js/main.js`
Uygulama mantığı.
- `data.js`'ten `FILMS`'i alır, kartların HTML'ini üretip `#grid`'e basar
- **Arama** (film/oyuncu/yönetmen) ve **Faz** filtresini yönetir
- Her karta `pointerenter / pointerleave / pointermove` olaylarını bağlar
- **`scene3d.js`'i dinamik import eder** → yüklenemezse sessizce CSS hover'a düşer
  (katalog her durumda çalışır)

### `js/scene3d.js`
**Three.js** ile 3B hover efekti (opsiyonel modül).
- Tek paylaşımlı `WebGLRenderer`; canvas hover edilen kartın **içine, yazıların altına** taşınır
- Özel **ShaderMaterial**: `object-fit: cover` kırpması + mouse'a göre parallax +
  ışık parıltısı + vignette
- `PerspectiveCamera` ile mouse'a göre yumuşatılmış 3B tilt
- `activate() / deactivate() / setPointer()` fonksiyonlarını dışa aktarır
- Görsel yüklenemezse (CORS vb.) filmin renk paletinden gradient'e düşer

### `js/starfield.js`
**Three.js** ile arka plan 3B yıldız alanı (dekoratif).
- En arkada (`z-index:0`, içeriğin altında), tüm ekranı kaplayan sabit bir WebGL canvas
- `pointer-events:none` → **kartlara/tıklamalara hiçbir etkisi yoktur**; sadece arkadaki siyah alan
- İki katman yıldız (uzak + yakın) → fare hareketinde **parallax derinlik**
- Fareye göre yumuşatılmış kamera kayması + sürekli yavaş süzülme
- `prefers-reduced-motion` açıkken hareket durur

### `assets/images/`
Tüm görseller yereldedir (kaynak: The Movie Database — TMDB).
- `covers/` — kartların durağan kapakları
- `scenes/` — hover'da Three.js'in gösterdiği farklı sahne kareleri

---

## 🛠️ Kullanılan Teknolojiler

| Teknoloji | Nasıl yüklenir | Ne için |
|---|---|---|
| **HTML5 / CSS3** | — | Yapı ve stil |
| **Vanilla JS (ES Modules)** | yerel | Render, arama, filtre, olaylar |
| **Tailwind CSS** | Play CDN | Hızlı, tutarlı, responsive arayüz |
| **Three.js (r160)** | unpkg (ESM importmap) | 3B hover efekti |
| **Google Fonts** | CDN | Tipografi (Bebas Neue + Inter) |

---

## 🚀 Çalıştırma

ES modülleri `file://` ile çalışmaz; basit bir statik sunucu yeterli:

```bash
# Node (npx)
npx serve .

# veya Python
py -m http.server 8000
```

Ardından tarayıcıda: `http://localhost:8000`

> İçeriği değiştirmek için yeni filmi `js/data.js` içindeki `FILMS` dizisine ekle ve
> görsellerini `assets/images/covers/<id>.jpg` ile `assets/images/scenes/<id>.jpg`
> olarak koy — `<id>` filmin `id` alanıyla aynı olmalı.

---

## 📌 Notlar

- Görseller © **The Movie Database (TMDB)**; Marvel ve film isimleri **Marvel Studios**'a aittir.
  Bu proje eğitim/hayran kataloğu amaçlıdır.
- Erişilebilirlik: `prefers-reduced-motion` açıkken animasyonlar devre dışı kalır.
