// Okuma / ezber ekranı (sayfa bazlı, Medine Mushafı sayfa düzeni)
import * as D from "./data.js";
import { store } from "./store.js";
import { el, toast, sheet } from "./ui.js";

const MODLAR = [
  ["oku", "Oku"], ["okunussuz", "Okunuşsuz"], ["ipucu", "İpucu"], ["gizli", "Gizli"],
];
let mod = "oku";

function kelimeHtml(w) {
  return `<span class="k"><span class="ka">${w[0]}</span><span class="kt">${w[1]}</span></span>`;
}

function ayetHtml(a) {
  const k = `${a.s}:${a.v}`;
  return `<div class="ayet${store.zorMu(k) ? " zor" : ""}" data-k="${k}">
    <div class="kelimeler">${a.k.map(kelimeHtml).join("")}<span class="ayet-no" data-k="${k}">${D.arRakam(a.v)}</span></div>
    ${store.ayar.bitisik ? `<div class="bitisik"><span>${a.ok}</span></div>` : ""}
  </div>`;
}

async function sureBasi(s) {
  const su = D.sure(s);
  let h = `<div class="surah-head"><div class="ar">${su.ar}</div>
    <div class="tr">${su.s}. ${su.ad} Suresi <span>· ${su.ayet} ayet · ${su.tur}</span></div></div>`;
  if (s !== 1 && s !== 9) {
    // Besmele metni Açık Kuran'daki Fatiha 1. ayetinden alınır (kelime kelime)
    const f = await D.sureVerisi(1);
    const b = f.ayetler[0];
    h += `<div class="besmele"><div class="kelimeler" style="justify-content:center">${b.k.map(kelimeHtml).join("")}</div>
      ${store.ayar.bitisik ? `<div class="bitisik" style="text-align:center"><span>${b.ok}</span></div>` : ""}</div>`;
  }
  return h;
}

export async function okuEkrani(view, p, ctx) {
  p = Math.max(1, Math.min(D.sayfaSayisi(), p));
  const tok = ctx.tok;
  const ayetler = await D.sayfaAyetleri(p);
  if (!ctx.guncelMi(tok)) return;
  const cuz = D.cuzOfSayfa(p);
  const sureAdlari = [...new Set(ayetler.map((a) => D.sure(a.s).ad))].join(" · ");
  ctx.baslik(`Sayfa ${p}`, `${sureAdlari} · Cüz ${cuz}`);

  let govde = "";
  for (const a of ayetler) {
    if (a.v === 1) govde += await sureBasi(a.s);
    govde += ayetHtml(a);
  }
  if (!ctx.guncelMi(tok)) return;   // bu arada başka sayfaya geçildi
  store.setKonum(p);
  const sd = store.sayfa(p);
  const vakti = store.vakti(p);

  view.innerHTML = `
    <div class="readbar" id="readbar">
      ${MODLAR.map(([m, t]) => `<button class="chip${m === mod ? " on" : ""}" data-mod="${m}">${t}</button>`).join("")}
      <button class="chip" id="sonrakiK">Sonraki kelime</button>
      <button class="chip" id="hepsiniAc">Hepsini aç</button>
    </div>
    <article class="page mod-${mod}" id="sayfa">
      <div class="page-head"><span>Cüz ${cuz}</span><span>${sureAdlari}</span><span>${p}</span></div>
      ${govde}
    </article>
    <div class="page-foot">
      <button class="btn" id="sonraki">← Sonraki sayfa</button>
      <button class="btn" id="git">Sayfaya git</button>
      <button class="btn" id="onceki">Önceki sayfa →</button>
    </div>
    <section class="card status">
      ${vakti ? `<div class="h2" style="margin-top:0">Tekrar vakti geldi</div>
        <p class="muted" style="margin:0 0 10px">Sayfayı ezberden okuyun (Gizli modda), sonra nasıl geçtiğini işaretleyin.</p>
        <div class="row"><button class="btn primary" data-sonuc="akici">Akıcı</button>
        <button class="btn gold" data-sonuc="takildim">Takıldım</button>
        <button class="btn danger" data-sonuc="unuttum">Unuttum</button></div><hr style="border:0;border-top:1px solid var(--line);margin:14px 0">` : ""}
      <div class="muted" style="font-size:.85rem;margin-bottom:8px">Bu sayfanın durumu</div>
      <div class="row">
        <button class="btn${sd.st === "yeni" ? " on" : ""}" data-st="yeni">Yeni</button>
        <button class="btn${sd.st === "calisiliyor" ? " on" : ""}" data-st="calisiliyor">Çalışılıyor</button>
        <button class="btn${sd.st === "ezber" ? " on" : ""}" data-st="ezber">Ezberlendi</button>
      </div>
    </section>`;

  const sayfaEl = view.querySelector("#sayfa");
  const modUygula = () => {
    sayfaEl.className = `page mod-${mod}`;
    sayfaEl.querySelectorAll(".k.acik").forEach((k) => k.classList.remove("acik"));
    if (mod === "ipucu") sayfaEl.querySelectorAll(".ayet .kelimeler").forEach((kl) => kl.querySelector(".k")?.classList.add("acik"));
    view.querySelectorAll("[data-mod]").forEach((b) => b.classList.toggle("on", b.dataset.mod === mod));
    view.querySelector("#sonrakiK").classList.toggle("hidden", !(mod === "gizli" || mod === "ipucu"));
    view.querySelector("#hepsiniAc").classList.toggle("hidden", !(mod === "gizli" || mod === "ipucu"));
  };
  modUygula();

  view.querySelector("#readbar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mod]");
    if (b) { mod = b.dataset.mod; modUygula(); }
  });
  view.querySelector("#sonrakiK").onclick = () => {
    const k = sayfaEl.querySelector(".ayet .k:not(.acik)");
    if (k) { k.classList.add("acik"); k.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  };
  view.querySelector("#hepsiniAc").onclick = () => sayfaEl.querySelectorAll(".k").forEach((k) => k.classList.add("acik"));

  sayfaEl.addEventListener("click", (e) => {
    const no = e.target.closest(".ayet-no");
    if (no) return ayetMenusu(no.dataset.k, ayetler, ctx);
    const k = e.target.closest(".k");
    if (k && (mod === "gizli" || mod === "ipucu")) k.classList.toggle("acik");
  });

  view.querySelector("#sonraki").onclick = () => ctx.git(`#/sayfa/${p + 1}`);
  view.querySelector("#onceki").onclick = () => ctx.git(`#/sayfa/${p - 1}`);
  view.querySelector("#git").onclick = () => {
    const n = parseInt(prompt(`Sayfa numarası (1–${D.sayfaSayisi()})`, p), 10);
    if (n) ctx.git(`#/sayfa/${n}`);
  };
  view.querySelectorAll("[data-st]").forEach((b) => (b.onclick = () => {
    store.setDurum(p, b.dataset.st);
    toast(b.dataset.st === "ezber" ? "Ezberlendi. İlk tekrar yarın." : "Kaydedildi");
    okuEkrani(view, p, ctx);
  }));
  view.querySelectorAll("[data-sonuc]").forEach((b) => (b.onclick = () => {
    store.tekrarSonucu(p, b.dataset.sonuc);
    toast({ akici: "Maşallah! Bir sonraki tekrar daha ileri bir güne alındı.", takildim: "Tekrar aralığı kısaltıldı.", unuttum: "Sayfa yeniden çalışılacaklara alındı." }[b.dataset.sonuc]);
    okuEkrani(view, p, ctx);
  }));

  // Kaydırarak sayfa çevirme (mushaf gibi: sağa kaydır = sonraki sayfa)
  let x0 = null, y0 = null;
  sayfaEl.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  sayfaEl.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50) ctx.git(`#/sayfa/${p + (dx > 0 ? 1 : -1)}`);
  });

  ctx.calarHazirla(ayetler, p);
  window.scrollTo(0, 0);
}

function ayetMenusu(k, ayetler, ctx) {
  const i = ayetler.findIndex((a) => `${a.s}:${a.v}` === k);
  const a = ayetler[i];
  const zor = store.zorMu(k);
  sheet(`${D.sure(a.s).ad} ${a.v}. ayet`, [
    ["Buradan itibaren dinle", () => ctx.cal(i)],
    ["Sadece bu ayeti tekrar tekrar dinle", () => ctx.cal(i, true)],
    [zor ? "Zor ayet işaretini kaldır" : "Zor ayet olarak işaretle", () => {
      const yeni = store.zorDegistir(k);
      document.querySelector(`.ayet[data-k="${k}"]`)?.classList.toggle("zor", yeni);
      toast(yeni ? "Zor ayetlere eklendi" : "İşaret kaldırıldı");
    }],
  ]);
}
