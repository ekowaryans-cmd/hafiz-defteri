// Kalıcı kayıt: ezber durumu, tekrar takvimi, ayarlar (cihazda, localStorage).
const KEY = "hafizDefteri.v1";
const DAY = 86400000;
// Tekrar aralıkları (gün): her başarılı tekrarda bir sonraki basamağa geçilir.
export const ARALIK = [1, 2, 4, 7, 15, 30, 60, 90];

const VARSAYILAN = {
  konum: { sayfa: 1 },
  sayfalar: {},          // { "42": { st: "yeni|calisiliyor|ezber", adim, vade, gecmis: [[tarih, sonuc]] } }
  zor: {},               // { "2:255": 1 }
  ayar: {
    kari: "Minshawy_Mujawwad_192kbps",
    arBoy: 34, trBoy: 13,
    tema: "auto",
    bitisik: true,
    tersOkunus: true,   // okunuş harfleri sağdan sola (ör. bismi → imsib)
    besmele: true,
    hiz: 1,
  },
};

let durum = yukle();

function birlestir(d) {
  const base = JSON.parse(JSON.stringify(VARSAYILAN));
  if (!d || typeof d !== "object") return base;
  const sayfalar = {};
  for (const [k, v] of Object.entries(d.sayfalar || {})) {
    const n = +k;
    if (Number.isInteger(n) && n >= 1 && n <= 604 && v && ["calisiliyor", "ezber"].includes(v.st)) sayfalar[n] = v;
  }
  const zor = {};
  for (const k of Object.keys(d.zor || {})) {
    const m = /^(\d+):(\d+)$/.exec(k);
    if (m && +m[1] >= 1 && +m[1] <= 114 && +m[2] >= 1) zor[k] = 1;
  }
  const sayfa = +(d.konum && d.konum.sayfa);
  return {
    konum: { sayfa: Number.isInteger(sayfa) && sayfa >= 1 && sayfa <= 604 ? sayfa : 1 },
    sayfalar, zor,
    ayar: { ...base.ayar, ...(d.ayar || {}) },
  };
}

function yukle() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return birlestir(JSON.parse(raw));
  } catch (e) { console.warn("Kayıt okunamadı", e); }
  return birlestir(null);
}

export function kaydet() {
  try { localStorage.setItem(KEY, JSON.stringify(durum)); }
  catch (e) { console.warn("Kayıt yazılamadı", e); }
}

export const store = {
  get ayar() { return durum.ayar; },
  get konum() { return durum.konum; },
  setAyar(k, v) { durum.ayar[k] = v; kaydet(); },
  setKonum(sayfa) { durum.konum = { sayfa }; kaydet(); },

  sayfa(p) { return durum.sayfalar[p] || { st: "yeni" }; },
  tumSayfalar() { return durum.sayfalar; },

  setDurum(p, st) {
    if ((durum.sayfalar[p]?.st || "yeni") === st) return;   // aynı durum: takvimi bozma
    const s = { ...(durum.sayfalar[p] || { gecmis: [] }) };
    s.st = st;
    if (st === "ezber") { s.adim = 0; s.vade = gunBasi(Date.now()) + ARALIK[0] * DAY; }
    else { delete s.adim; delete s.vade; }
    if (st === "yeni") delete durum.sayfalar[p]; else durum.sayfalar[p] = s;
    kaydet();
  },

  // sonuc: "akici" | "takildim" | "unuttum"
  tekrarSonucu(p, sonuc) {
    const s = { ...(durum.sayfalar[p] || { st: "ezber", adim: 0, gecmis: [] }) };
    s.gecmis = [...(s.gecmis || []), [Date.now(), sonuc]].slice(-30);
    if (sonuc === "akici") s.adim = Math.min((s.adim ?? 0) + 1, ARALIK.length - 1);
    else if (sonuc === "takildim") s.adim = Math.max((s.adim ?? 0) - 1, 0);
    else { s.adim = 0; s.st = "calisiliyor"; }
    if (s.st === "ezber") s.vade = gunBasi(Date.now()) + ARALIK[s.adim] * DAY;
    else delete s.vade;
    durum.sayfalar[p] = s;
    kaydet();
  },

  vakti(p) {
    const s = durum.sayfalar[p];
    return !!(s && s.st === "ezber" && s.vade && s.vade <= Date.now());
  },
  vadesiGelenler() {
    return Object.entries(durum.sayfalar)
      .filter(([, s]) => s.st === "ezber" && s.vade && s.vade <= Date.now())
      .sort((a, b) => a[1].vade - b[1].vade)
      .map(([p]) => +p);
  },
  yaklasanlar(gun = 7) {
    const sinir = Date.now() + gun * DAY;
    return Object.entries(durum.sayfalar)
      .filter(([, s]) => s.st === "ezber" && s.vade > Date.now() && s.vade <= sinir)
      .sort((a, b) => a[1].vade - b[1].vade)
      .map(([p, s]) => [+p, s.vade]);
  },

  zorMu(k) { return !!durum.zor[k]; },
  zorDegistir(k) { if (durum.zor[k]) delete durum.zor[k]; else durum.zor[k] = 1; kaydet(); return !!durum.zor[k]; },
  zorlar() { return Object.keys(durum.zor); },

  disaAktar() { return JSON.stringify({ uygulama: "Hafız Defteri", surum: 1, tarih: new Date().toISOString(), veri: durum }, null, 1); },
  iceAktar(metin) {
    const d = JSON.parse(metin);
    if (!d || d.uygulama !== "Hafız Defteri" || !d.veri) throw new Error("Bu dosya bir Hafız Defteri yedeği değil.");
    durum = birlestir(d.veri);
    kaydet();
  },
};

// Gün sabah 04:00'te başlar (gece yarısından sonraki çalışma bir önceki güne sayılır)
function gunBasi(t) {
  const d = new Date(t); d.setHours(4, 0, 0, 0);
  if (d.getTime() > t) d.setDate(d.getDate() - 1);
  return d.getTime();
}

export function tarihYaz(t) {
  return new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "short" });
}
