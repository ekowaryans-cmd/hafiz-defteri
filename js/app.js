// Hafız Defteri – yönlendirme ve ses çubuğu
import * as D from "./data.js";
import { store } from "./store.js";
import { Calar, KARILER } from "./audio.js";
import { okuEkrani } from "./oku.js";
import { fihrist, tekrar, ilerleme } from "./ekranlar.js";
import { ayarlar, temaUygula } from "./ayarlar.js";
import { toast } from "./ui.js";

const view = document.getElementById("view");
const playerEl = document.getElementById("player");
const AYET_TEKRAR = [1, 2, 3, 5, 7, 10];
const TUR_TEKRAR = [1, 2, 3, 0];          // 0 = sürekli
const BOSLUK = [0, 2, 5, -1];             // -1 = ayet süresi kadar (dinle ve tekrar et)
const HIZ = [1, 0.85, 0.75, 1.15];
const oynatma = { ayetT: 0, turT: 0, bos: 0, hiz: HIZ.indexOf(store.ayar.hiz) >= 0 ? HIZ.indexOf(store.ayar.hiz) : 0 };

let sayfaAyetleri = [], aktifSayfa = null, oynayanK = null, sonBilgi = "Sayfayı dinle", navTok = 0;

const calar = new Calar((tip, veri) => {
  if (tip === "ayet") {
    oynayanK = veri.besmele ? null : `${veri.s}:${veri.v}`;
    document.querySelectorAll(".ayet.playing").forEach((x) => x.classList.remove("playing"));
    const e = oynayanK && document.querySelector(`.ayet[data-k="${oynayanK}"]`);
    if (e) { e.classList.add("playing"); e.scrollIntoView({ block: "center", behavior: "smooth" }); }
    bilgiYaz(veri.besmele ? "Besmele" : `${D.sure(veri.s).ad} ${veri.v}. ayet`);
  } else if (tip === "durum") oynatButonu(veri);
  else if (tip === "bekle") bilgiYaz(veri > 0 && oynatma.bos === 3 ? "Şimdi siz tekrar edin…" : "…", true);
  else if (tip === "bitti") {
    oynayanK = null; sonBilgi = "Sayfayı dinle"; bilgiYaz(sonBilgi);
    document.querySelectorAll(".ayet.playing").forEach((x) => x.classList.remove("playing"));
    if (!location.hash.match(/sayfa|sure|oku/)) playerEl.classList.add("hidden");
  }
  else if (tip === "hata") toast(veri);
});
calar.setHiz(HIZ[oynatma.hiz]);
if ("mediaSession" in navigator) {
  try {
    navigator.mediaSession.setActionHandler("play", () => calar.devam());
    navigator.mediaSession.setActionHandler("pause", () => calar.duraklat());
    navigator.mediaSession.setActionHandler("nexttrack", () => calar.atla(1));
    navigator.mediaSession.setActionHandler("previoustrack", () => calar.atla(-1));
  } catch { /* desteklenmiyor */ }
}

const ICON = {
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>`,
  prev: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6l8 6-8 6z" fill="currentColor"/></svg>`,
  next: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 6l-8 6 8 6z" fill="currentColor"/></svg>`,
};

function playerCiz() {
  const k = KARILER.find((x) => x.id === store.ayar.kari);
  const t = TUR_TEKRAR[oynatma.turT];
  const b = BOSLUK[oynatma.bos];
  playerEl.innerHTML = `
    <button class="pbtn" id="pNext" aria-label="Sonraki ayet">${ICON.next}</button>
    <button class="pbtn main" id="pPlay" aria-label="Oynat">${calar.calisiyor ? ICON.pause : ICON.play}</button>
    <button class="pbtn" id="pPrev" aria-label="Önceki ayet">${ICON.prev}</button>
    <div class="info"><b id="pBilgi"></b><span>${k ? k.ad : ""}</span></div>
    <div class="opts">
      <button class="opt" id="pAyet">×${AYET_TEKRAR[oynatma.ayetT]}<small>ayet tekrarı</small></button>
      <button class="opt" id="pTur">${t === 0 ? "∞" : "×" + t}<small>sayfa tekrarı</small></button>
      <button class="opt" id="pBos">${b === -1 ? "Siz okuyun" : b === 0 ? "Yok" : b + " sn"}<small>ayet arası</small></button>
      <button class="opt" id="pHiz">${String(HIZ[oynatma.hiz]).replace(".", ",")}×<small>hız</small></button>
    </div>`;
  const $ = (id) => playerEl.querySelector("#" + id);
  $("pBilgi").textContent = sonBilgi;
  $("pPlay").onclick = () => {
    if (calar.calisiyor) calar.duraklat();
    else if (calar.sira.length && calar.sayfa === aktifSayfa) calar.devam();
    else cal(0);
  };
  $("pNext").onclick = () => calar.atla(1);
  $("pPrev").onclick = () => calar.atla(-1);
  $("pAyet").onclick = () => { oynatma.ayetT = (oynatma.ayetT + 1) % AYET_TEKRAR.length; ayarlariUygula(); playerCiz(); };
  $("pTur").onclick = () => { oynatma.turT = (oynatma.turT + 1) % TUR_TEKRAR.length; ayarlariUygula(); playerCiz(); };
  $("pBos").onclick = () => {
    oynatma.bos = (oynatma.bos + 1) % BOSLUK.length; ayarlariUygula(); playerCiz();
    if (BOSLUK[oynatma.bos] === -1) toast("Her ayetten sonra, ayet süresi kadar susulur: siz tekrar edersiniz.");
  };
  $("pHiz").onclick = () => { oynatma.hiz = (oynatma.hiz + 1) % HIZ.length; calar.setHiz(HIZ[oynatma.hiz]);
if ("mediaSession" in navigator) {
  try {
    navigator.mediaSession.setActionHandler("play", () => calar.devam());
    navigator.mediaSession.setActionHandler("pause", () => calar.duraklat());
    navigator.mediaSession.setActionHandler("nexttrack", () => calar.atla(1));
    navigator.mediaSession.setActionHandler("previoustrack", () => calar.atla(-1));
  } catch { /* desteklenmiyor */ }
} store.setAyar("hiz", HIZ[oynatma.hiz]); playerCiz(); };
}
function ayarlariUygula() {
  calar.ayetTekrar = AYET_TEKRAR[oynatma.ayetT];
  calar.turTekrar = TUR_TEKRAR[oynatma.turT];
  calar.bosluk = BOSLUK[oynatma.bos];
}
function bilgiYaz(t, gecici = false) {
  if (!gecici) sonBilgi = t;
  const e = document.getElementById("pBilgi"); if (e) e.textContent = t;
  if (!gecici && "mediaSession" in navigator && window.MediaMetadata) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: t, artist: KARILER.find((x) => x.id === store.ayar.kari)?.ad || "", album: "Hafız Defteri" });
  }
}
function oynatButonu(on) { const e = document.getElementById("pPlay"); if (e) e.innerHTML = on ? ICON.pause : ICON.play; }

// i: sayfadaki ayet sırası; tek: yalnız o ayet
function cal(i, tek = false) {
  const kari = store.ayar.kari;
  const secim = tek ? [sayfaAyetleri[i]] : sayfaAyetleri.slice(i);
  const sira = [];
  for (const a of secim) {
    if (a.v === 1 && a.s !== 1 && a.s !== 9 && store.ayar.besmele && !tek) sira.push({ s: 1, v: 1, kari, besmele: true });
    sira.push({ s: a.s, v: a.v, kari });
  }
  ayarlariUygula();
  if (tek) toast("Bu ayet sürekli tekrarlanıyor. Durdurmak için ⏸");
  calar.sayfa = aktifSayfa;
  calar.baslat(sira, 0, tek);
}

const ctx = {
  baslik(t, alt) {
    document.getElementById("title").innerHTML = `${alt ? `<small></small>` : ""}<span></span>`;
    const h = document.getElementById("title");
    if (alt) h.querySelector("small").textContent = alt;
    h.querySelector("span").textContent = t;
  },
  git(h) { location.hash = h; },
  calarHazirla(ayetler, p) { sayfaAyetleri = ayetler; aktifSayfa = p; playerEl.classList.remove("hidden"); playerCiz(); },
  calarYenile() { calar.sifirla(); playerCiz(); },
  guncelMi(tok) { return tok === navTok; },
  cal,
};

async function yonlendir() {
  const tok = ++navTok;
  ctx.tok = tok;
  const h = location.hash || "#/oku";
  const [, ad, x, y] = h.split("/");
  document.querySelectorAll("#tabs a").forEach((a) => a.classList.toggle("on",
    a.dataset.tab === ad || (a.dataset.tab === "oku" && (ad === "sayfa" || ad === "sure"))));
  if (!["sayfa", "sure", "oku"].includes(ad) && !calar.calisiyor) playerEl.classList.add("hidden");
  try {
    if (ad === "sayfa") await okuEkrani(view, parseInt(x, 10) || 1, ctx);
    else if (ad === "oku") await okuEkrani(view, store.konum.sayfa || 1, ctx);
    else if (ad === "sure") {
      const s = Math.max(1, Math.min(114, parseInt(x, 10) || 1)), v = parseInt(y, 10) || 1;
      const p = await D.ayetSayfasi(s, v);
      if (tok !== navTok) return;
      history.replaceState(null, "", `#/sayfa/${p}`);
      await okuEkrani(view, p, ctx);
      if (v > 1) document.querySelector(`.ayet[data-k="${s}:${v}"]`)?.scrollIntoView({ block: "center" });
    }
    else if (ad === "tekrar") tekrar(view, ctx);
    else if (ad === "ilerleme") ilerleme(view, ctx);
    else if (ad === "ayarlar") await ayarlar(view, ctx);
    else fihrist(view, ctx);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="empty">Bir hata oluştu: ${String(e.message || e).replace(/</g, "&lt;")}</div>`;
  }
  if (tok === navTok && oynayanK) document.querySelector(`.ayet[data-k="${oynayanK}"]`)?.classList.add("playing");
}

view.addEventListener("click", (e) => {
  const a = e.target.closest("[data-href]");
  if (a) location.hash = a.dataset.href;
});

async function basla() {
  temaUygula();
  try { await D.hazirla(); }
  catch (e) { view.innerHTML = `<div class="empty">Veriler yüklenemedi. Uygulama bir web sunucusu üzerinden açılmalıdır.</div>`; return; }
  window.addEventListener("hashchange", yonlendir);
  yonlendir();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  navigator.storage?.persist?.().catch(() => {});
}
basla();
