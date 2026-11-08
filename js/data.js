// Veri yükleme: tüm metin data/ klasöründen gelir (kaynak: Açık Kuran + Tanzil).
const onbellek = new Map();
let SURELER = null, SAYFALAR = null, CUZLER = null;

async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} yüklenemedi (${r.status})`);
  return r.json();
}

export async function hazirla() {
  [SURELER, SAYFALAR, CUZLER] = await Promise.all([
    json("data/sureler.json"), json("data/sayfalar.json"), json("data/cuzler.json"),
  ]);
}

export const sureler = () => SURELER;
export const sure = (s) => SURELER[s - 1];
export const cuzler = () => CUZLER;
export const sayfaSayisi = () => Object.keys(SAYFALAR).length;
export const sayfaAraligi = (p) => SAYFALAR[p];   // [s1, v1, s2, v2]

export async function sureVerisi(s) {
  if (!onbellek.has(s)) onbellek.set(s, json(`data/sure/${String(s).padStart(3, "0")}.json`));
  return onbellek.get(s);
}

// Bir sayfadaki ayetler: [{ s, ...ayet }]
export async function sayfaAyetleri(p) {
  const [s1, v1, s2, v2] = SAYFALAR[p];
  const out = [];
  for (let s = s1; s <= s2; s++) {
    const d = await sureVerisi(s);
    for (const a of d.ayetler) {
      if ((s === s1 && a.v < v1) || (s === s2 && a.v > v2)) continue;
      out.push({ s, ...a });
    }
  }
  return out;
}

// Ayetin bulunduğu sayfa
export async function ayetSayfasi(s, v) {
  const d = await sureVerisi(s);
  const a = d.ayetler.find((x) => x.v === v);
  return a ? a.sayfa : SURELER[s - 1].sayfa;
}

export function cuzOfSayfa(p) {
  const [s, v] = SAYFALAR[p];
  let c = 1;
  for (const [n, r] of Object.entries(CUZLER)) if (r[0] < s || (r[0] === s && r[1] <= v)) c = +n;
  return c;
}

const AR_RAKAM = "٠١٢٣٤٥٦٧٨٩";
export const arRakam = (n) => String(n).replace(/\d/g, (d) => AR_RAKAM[d]);
