// Ses: EveryAyah.com ayet ayet MP3 dosyaları. Çalınan her dosya cihazda saklanır
// (Cache API), böylece bir kez dinlenen ayet internetsiz de çalar.
export const KARILER = [
  { id: "Husary_128kbps", ad: "Mahmud Halil el-Husari", tur: "Murattal" },
  { id: "Husary_128kbps_Mujawwad", ad: "Mahmud Halil el-Husari", tur: "Mücevved" },
  { id: "Abdul_Basit_Murattal_192kbps", ad: "Abdulbasit Abdussamed", tur: "Murattal" },
  { id: "Abdul_Basit_Mujawwad_128kbps", ad: "Abdulbasit Abdussamed", tur: "Mücevved" },
  { id: "Minshawy_Mujawwad_192kbps", ad: "Muhammed Sıddık el-Minşavi", tur: "Mücevved" },
  { id: "Alafasy_128kbps", ad: "Mişari Raşid el-Afasi", tur: "Murattal" },
  { id: "MaherAlMuaiqly128kbps", ad: "Mahir el-Muaykılî", tur: "Murattal" },
  { id: "Yasser_Ad-Dussary_128kbps", ad: "Yasir ed-Devserî", tur: "Murattal" },
  { id: "Mustafa_Ismail_48kbps", ad: "Mustafa İsmail", tur: "" },
];
const SES_CACHE = "ses-v1";
const pad = (n) => String(n).padStart(3, "0");
export const sesUrl = (kari, s, v) => `https://everyayah.com/data/${kari}/${pad(s)}${pad(v)}.mp3`;

async function sesBlob(url) {
  let cache = null;
  try { cache = await caches.open(SES_CACHE); } catch { /* Cache API yok */ }
  if (cache) {
    const hit = await cache.match(url);
    if (hit) return hit.blob();
  }
  const r = await fetch(url, { mode: "cors" });
  if (!r.ok) throw new Error(`Ses alınamadı (${r.status})`);
  if (cache) { try { await cache.put(url, r.clone()); } catch { /* yer yok */ } }
  return r.blob();
}

export async function indir(urls, ilerleme) {
  if (!("caches" in self)) throw new Error("Bu tarayıcıda çevrimdışı kayıt desteklenmiyor (https gerekir).");
  const cache = await caches.open(SES_CACHE);
  let i = 0, hata = 0;
  for (const u of urls) {
    try {
      if (!(await cache.match(u))) {
        const r = await fetch(u, { mode: "cors" });
        if (r.ok) await cache.put(u, r); else hata++;
      }
    } catch { hata++; }
    ilerleme?.(++i, urls.length);
  }
  return hata;
}

export async function kayitliSayisi(urls) {
  try {
    const cache = await caches.open(SES_CACHE);
    let n = 0;
    for (const u of urls) if (await cache.match(u)) n++;
    return n;
  } catch { return 0; }
}

// Kısa sessiz WAV: iOS'ta ilk dokunuşta ses öğesinin kilidini açmak için
const SESSIZ = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

// Çalma sırası: ayetler [{s, v, kari, besmele?}], ayet tekrarı, sıra tekrarı, ayet arası bekleme
export class Calar {
  constructor(olay) {
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.olay = olay;           // (tip, veri) => void
    this.sira = [];
    this.i = 0; this.tekrarSayac = 0; this.turSayac = 0;
    this.ayetTekrar = 1; this.turTekrar = 1; this.bosluk = 0; // bosluk: saniye veya -1 = ayet süresi kadar
    this.tek = false;           // tek ayet sürekli tekrar modu
    this.calisiyor = false; this.url = null; this.yuklu = null; this.zamanlayici = null;
    this.gen = 0; this.kilitAcik = false; this.hiz = 1;
    this.audio.addEventListener("ended", () => this.bitti());
    this.audio.addEventListener("error", () => {
      if (this.audio.src && this.audio.src !== SESSIZ && this.calisiyor) this.hataOldu("Ses çalınamadı. İnternet bağlantısını kontrol edin.");
    });
  }

  kilitAc() {
    // Kullanıcı dokunuşu içinde, beklemeden önce çağrılır (iOS Safari)
    if (this.kilitAcik) return;
    this.kilitAcik = true;
    try { this.audio.src = SESSIZ; this.audio.play().catch(() => {}); } catch { /* yok say */ }
  }

  baslat(sira, i = 0, tek = false) {
    this.kilitAc();
    this.sira = sira; this.i = i; this.tek = tek;
    this.tekrarSayac = 0; this.turSayac = 0; this.yuklu = null;
    this.calisiyor = true; this.cal();
  }

  async cal() {
    const gen = ++this.gen;
    clearTimeout(this.zamanlayici);
    const o = this.sira[this.i];
    if (!o) return this.dur(true);
    this.olay("ayet", o);
    let blob;
    try { blob = await sesBlob(sesUrl(o.kari, o.s, o.v)); }
    catch { if (gen === this.gen) this.hataOldu("Ses alınamadı. İlk dinlemede internet gerekir."); return; }
    if (gen !== this.gen || !this.calisiyor) return;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(blob);
    this.yuklu = o;
    this.audio.src = this.url;
    this.audio.defaultPlaybackRate = this.hiz;
    this.audio.playbackRate = this.hiz;
    await this.oynat(gen);
  }

  async oynat(gen) {
    try {
      await this.audio.play();
      if (gen === this.gen) this.olay("durum", true);
    } catch (e) {
      if (gen !== this.gen || e.name === "AbortError") return;
      if (e.name === "NotAllowedError") { this.calisiyor = false; this.olay("durum", false); this.olay("hata", "Oynatmak için ▶ düğmesine tekrar dokunun."); }
      else this.hataOldu("Ses çalınamadı.");
    }
  }

  hataOldu(msg) {
    this.gen++;
    this.calisiyor = false;
    clearTimeout(this.zamanlayici);
    this.olay("durum", false);
    this.olay("hata", msg);
  }

  bitti() {
    if (!this.calisiyor || this.audio.src === SESSIZ) return;
    const gen = this.gen;
    const o = this.sira[this.i];
    if (!o) return;
    const bekle = this.bosluk === -1 ? (this.audio.duration || 3) / this.hiz : this.bosluk;
    const ilerle = () => {
      if (!this.calisiyor || gen !== this.gen) return;
      if (!o.besmele && ++this.tekrarSayac < this.ayetTekrar) {
        // aynı ayeti yeniden çal (yeniden yüklemeden)
        this.olay("ayet", o);
        this.audio.currentTime = 0;
        return this.oynat(this.gen);
      }
      this.tekrarSayac = 0;
      this.i++;
      if (this.i >= this.sira.length) {
        const sonsuz = this.tek || this.turTekrar === 0;
        if (sonsuz || ++this.turSayac < this.turTekrar) this.i = 0;
        else return this.dur(true);
      }
      this.cal();
    };
    if (bekle > 0 && !o.besmele) { this.olay("bekle", bekle); this.zamanlayici = setTimeout(ilerle, bekle * 1000); }
    else ilerle();
  }

  duraklat() {
    this.gen++;
    this.audio.pause(); this.calisiyor = false; clearTimeout(this.zamanlayici);
    this.olay("durum", false);
  }

  devam() {
    if (!this.sira.length) return;
    this.kilitAc();
    if (this.i >= this.sira.length) return this.baslat(this.sira, 0, this.tek);
    this.calisiyor = true;
    const o = this.sira[this.i];
    if (this.yuklu === o && !this.audio.ended && this.audio.currentTime > 0) {
      this.olay("ayet", o);
      this.oynat(++this.gen);
    } else this.cal();
  }

  atla(d) {
    if (!this.sira.length) return;
    this.kilitAc();
    this.i = Math.max(0, Math.min(this.sira.length - 1, this.i + d));
    this.tekrarSayac = 0; this.calisiyor = true; this.cal();
  }

  dur(bittiMi = false) {
    this.gen++;
    this.audio.pause(); this.calisiyor = false; clearTimeout(this.zamanlayici);
    if (bittiMi) { this.i = this.sira.length; this.turSayac = 0; }
    this.olay("durum", false); this.olay("bitti", bittiMi);
  }

  sifirla() { this.dur(); this.sira = []; this.yuklu = null; this.i = 0; }
  setHiz(h) { this.hiz = h; this.audio.defaultPlaybackRate = h; this.audio.playbackRate = h; }
}
