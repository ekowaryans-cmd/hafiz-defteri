// Fihrist, Tekrar ve İlerleme ekranları
import * as D from "./data.js";
import { store, tarihYaz } from "./store.js";
import { trNormal } from "./ui.js";

let fihristSekme = "sure";

function devamKarti() {
  const p = store.konum.sayfa || 1;
  const [s, v] = D.sayfaAraligi(p);
  const vade = store.vadesiGelenler().length;
  return `<div class="card continue" data-href="#/sayfa/${p}">
    <div class="big">${p}</div>
    <div><div class="muted" style="font-size:.8rem">KALDIĞINIZ YER</div>
    <b>${D.sure(s).ad} ${v}. ayet</b>
    <div class="muted" style="font-size:.85rem">${vade ? `Bugün ${vade} sayfanın tekrar vakti var` : "Bugün bekleyen tekrar yok"}</div></div></div>`;
}

export function fihrist(view, ctx) {
  ctx.baslik("Hafız Defteri", "Kur'an-ı Kerim");
  view.innerHTML = `${devamKarti()}
    <div class="seg" id="seg">
      <button data-t="sure">Sureler</button><button data-t="cuz">Cüzler</button><button data-t="sayfa">Sayfalar</button>
    </div>
    <div id="liste"></div>`;
  const liste = view.querySelector("#liste");

  const ciz = () => {
    view.querySelectorAll("#seg button").forEach((b) => b.classList.toggle("on", b.dataset.t === fihristSekme));
    if (fihristSekme === "sure") {
      liste.innerHTML = `<input class="search" id="ara" placeholder="Sure ara… (ör. Yasin, 36)" inputmode="search">
        <div class="card list" id="sl"></div>`;
      const sl = liste.querySelector("#sl");
      const yaz = (q = "") => {
        const n = trNormal(q.trim());
        sl.innerHTML = D.sureler().filter((s) => !n || trNormal(s.ad).includes(n) || String(s.s) === n)
          .map((s) => `<div class="item" data-href="#/sure/${s.s}">
            <span class="num">${s.s}</span>
            <div class="t"><b>${s.ad}</b><div>${s.ayet} ayet · ${s.tur} · Sayfa ${s.sayfa} · Cüz ${s.cuz}</div></div>
            <span class="ar">${s.ar}</span></div>`).join("") || `<div class="empty">Bulunamadı</div>`;
      };
      yaz();
      liste.querySelector("#ara").addEventListener("input", (e) => yaz(e.target.value));
    } else if (fihristSekme === "cuz") {
      liste.innerHTML = `<div class="card list">${Object.entries(D.cuzler()).map(([n, [s, v]]) => `
        <div class="item" data-href="#/sure/${s}/${v}"><span class="num">${n}</span>
        <div class="t"><b>${n}. Cüz</b><div>${D.sure(s).ad} ${v}. ayetten başlar</div></div></div>`).join("")}</div>`;
    } else {
      const N = D.sayfaSayisi();
      liste.innerHTML = `<div class="pagegrid">${Array.from({ length: N }, (_, i) => {
        const st = store.sayfa(i + 1).st;
        const renk = st === "ezber" ? "background:var(--green);color:var(--paper)" : st === "calisiliyor" ? "background:var(--gold);color:#fff" : "";
        return `<button data-href="#/sayfa/${i + 1}" style="${renk}">${i + 1}</button>`;
      }).join("")}</div>`;
    }
  };
  view.querySelector("#seg").onclick = (e) => { const b = e.target.closest("button"); if (b) { fihristSekme = b.dataset.t; ciz(); } };
  ciz();
}

function sayfaSatiri(p, ek = "") {
  const [s, v] = D.sayfaAraligi(p);
  return `<div class="item" data-href="#/sayfa/${p}"><span class="num">${p}</span>
    <div class="t"><b>${D.sure(s).ad} ${v}. ayet</b><div>Cüz ${D.cuzOfSayfa(p)}${ek}</div></div></div>`;
}

export function tekrar(view, ctx) {
  ctx.baslik("Tekrar", "Bugünkü ve yaklaşan tekrarlar");
  const bugun = store.vadesiGelenler();
  const yakin = store.yaklasanlar(7);
  const zorlar = store.zorlar().map((k) => k.split(":").map(Number))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  view.innerHTML = `
    <div class="section"><div class="h2">Bugün (${bugun.length})</div></div>
    ${bugun.length ? `<div class="card list">${bugun.map((p) => sayfaSatiri(p, " · tekrar vakti")).join("")}</div>`
      : `<div class="empty">Bugün bekleyen tekrar yok.<br>Ezberlediğiniz sayfayı okuma ekranında “Ezberlendi” diye işaretleyin; tekrar takvimi kendiliğinden kurulur.</div>`}
    <div class="section"><div class="h2">Önümüzdeki 7 gün (${yakin.length})</div></div>
    ${yakin.length ? `<div class="card list">${yakin.map(([p, t]) => sayfaSatiri(p, " · " + tarihYaz(t))).join("")}</div>` : `<div class="empty">Yaklaşan tekrar yok.</div>`}
    <div class="section"><div class="h2">Zor ayetler (${zorlar.length})</div></div>
    ${zorlar.length ? `<div class="card list">${zorlar.map(([s, v]) => `<div class="item" data-href="#/sure/${s}/${v}">
      <span class="num">${v}</span><div class="t"><b>${D.sure(s).ad} ${v}. ayet</b><div>Ayet numarasına dokunarak işaret konur veya kaldırılır</div></div></div>`).join("")}</div>`
      : `<div class="empty">Okurken ayet numarasına dokunup “Zor ayet” seçerseniz burada listelenir.</div>`}
    <p class="muted" style="margin:18px 16px;font-size:.82rem">Tekrar aralıkları: 1, 2, 4, 7, 15, 30, 60, 90 gün. “Akıcı” bir basamak ileri, “Takıldım” bir basamak geri götürür. “Unuttum” sayfayı yeniden “Çalışılıyor” durumuna alır.</p>`;
}

export function ilerleme(view, ctx) {
  ctx.baslik("İlerleme", "604 sayfa · 30 cüz");
  const N = D.sayfaSayisi();
  const say = { ezber: 0, calisiliyor: 0 };
  const cuzSayfa = {};
  for (let p = 1; p <= N; p++) {
    const st = store.sayfa(p).st;
    if (say[st] !== undefined) say[st]++;
    (cuzSayfa[D.cuzOfSayfa(p)] ||= []).push(p);
  }
  const tamCuz = Object.values(cuzSayfa).filter((ps) => ps.every((p) => store.sayfa(p).st === "ezber")).length;
  view.innerHTML = `
    <div class="section"><div class="h2">Genel durum</div></div>
    <div class="stats">
      <div class="card stat"><b>${say.ezber}</b><span>ezber sayfa</span></div>
      <div class="card stat"><b>${say.calisiliyor}</b><span>çalışılıyor</span></div>
      <div class="card stat"><b>${tamCuz}</b><span>tamamlanan cüz</span></div>
    </div>
    <div class="card cuzmap">${Object.entries(cuzSayfa).map(([c, ps]) => `<div class="cuzrow"><span>${c}</span>
      <div class="cells">${ps.map((p) => `<i class="${store.vakti(p) ? "vakti" : store.sayfa(p).st}" data-href="#/sayfa/${p}" title="Sayfa ${p}"></i>`).join("")}</div></div>`).join("")}</div>
    <div class="legend"><span><i style="background:var(--paper-2);border:1px solid var(--line)"></i>Yeni</span>
      <span><i style="background:var(--gold)"></i>Çalışılıyor</span><span><i style="background:var(--green)"></i>Ezberlendi</span>
      <span><i style="background:var(--red)"></i>Tekrar vakti</span></div>
    <p class="muted" style="margin:6px 16px;font-size:.82rem">Her satır bir cüz, her kare bir sayfadır (sağdan sola). Kareye dokunarak o sayfayı açabilirsiniz.</p>`;
}
