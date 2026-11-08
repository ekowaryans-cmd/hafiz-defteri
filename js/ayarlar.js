// Ayarlar, çevrimdışı ses, yedekleme ve kaynaklar
import * as D from "./data.js";
import { store } from "./store.js";
import { KARILER, sesUrl, indir, kayitliSayisi } from "./audio.js";
import { toast } from "./ui.js";

export let kurulumOlayi = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); kurulumOlayi = e; });

export function temaUygula() {
  const t = store.ayar.tema;
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = t;
  document.documentElement.style.setProperty("--ar-size", store.ayar.arBoy + "px");
  document.documentElement.style.setProperty("--tr-size", store.ayar.trBoy + "px");
}

async function cuzUrlleri(c) {
  const cz = D.cuzler(), [s1, v1] = cz[c], son = cz[c + 1];
  const urls = [];
  for (let s = s1; s <= 114; s++) {
    const d = await D.sureVerisi(s);
    for (const a of d.ayetler) {
      if (s === s1 && a.v < v1) continue;
      if (son && (s > son[0] || (s === son[0] && a.v >= son[1]))) return urls;
      urls.push(sesUrl(store.ayar.kari, s, a.v));
    }
  }
  return urls;
}

export async function ayarlar(view, ctx) {
  ctx.baslik("Ayarlar", "Görünüm, ses, yedek");
  const a = store.ayar;
  const ornek = (await D.sureVerisi(1)).ayetler[1];
  view.innerHTML = `
    <div class="section"><div class="h2">Hafız (okuyucu)</div></div>
    <div class="card set">
      <label for="kari">Ses</label>
      <select id="kari">${KARILER.map((k) => `<option value="${k.id}"${k.id === a.kari ? " selected" : ""}>${k.ad}${k.tur ? " – " + k.tur : ""}</option>`).join("")}</select>
      <div class="row" style="margin-top:10px"><button class="btn" id="dinle">Örnek dinle (Fatiha 2)</button></div>
      <div class="toggle"><span>Sure başında besmele okunsun</span><input type="checkbox" id="besmele"${a.besmele ? " checked" : ""}></div>
    </div>

    <div class="section"><div class="h2">Görünüm</div></div>
    <div class="card set">
      <label>Arapça yazı boyutu: <span id="arV">${a.arBoy}</span></label>
      <input type="range" id="arBoy" min="22" max="60" value="${a.arBoy}">
      <label style="margin-top:10px">Okunuş yazı boyutu: <span id="trV">${a.trBoy}</span></label>
      <input type="range" id="trBoy" min="10" max="22" value="${a.trBoy}">
      <div class="sample"><div class="kelimeler" style="justify-content:center">${ornek.k.map((w) => `<span class="k"><span class="ka">${w[0]}</span><span class="kt">${w[1]}</span></span>`).join("")}</div></div>
      <div class="toggle" style="margin-top:8px"><span>Ayetin bitişik (ulamalı) okunuşunu da göster</span><input type="checkbox" id="bitisik"${a.bitisik ? " checked" : ""}></div>
      <label style="margin-top:8px" for="tema">Tema</label>
      <select id="tema"><option value="auto">Cihaza göre</option><option value="light">Açık</option><option value="dark">Koyu (gece)</option></select>
    </div>

    <div class="section"><div class="h2">İnternetsiz ses</div></div>
    <div class="card set">
      <p class="muted" style="margin:0 0 8px;font-size:.88rem">Dinlediğiniz her ayet zaten cihaza kaydedilir. İsterseniz bir cüzün tamamını önceden indirebilirsiniz (seçili hafız için). Bir cüz, hafıza ve okuyuş türüne göre onlarca MB yer kaplayabilir; Wi-Fi'de indirmeniz önerilir.</p>
      <div class="row"><select id="cuzSec" style="flex:1">${Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}">${i + 1}. Cüz</option>`).join("")}</select>
      <button class="btn primary" id="cuzIndir">İndir</button></div>
      <div class="muted" id="indirDurum" style="margin-top:8px;font-size:.85rem"></div>
    </div>

    <div class="section"><div class="h2">Yedek</div></div>
    <div class="card set">
      <p class="muted" style="margin:0 0 8px;font-size:.88rem">Ezber kayıtlarınız bu cihazda saklanır. Telefon değiştirirken veya tablete aktarırken yedek alın.</p>
      <div class="row"><button class="btn" id="yedekAl">Yedeği indir</button>
      <label class="btn" style="margin:0">Yedeği yükle<input type="file" id="yedekYukle" accept=".json,application/json" hidden></label></div>
    </div>

    <div class="section${kurulumOlayi ? "" : " hidden"}" id="kurBolum"><button class="btn gold" id="kur" style="width:100%">Ana ekrana uygulama olarak ekle</button></div>

    <div class="section"><div class="h2">Kaynaklar</div></div>
    <div class="card set about">
      <p><b>Arapça kelimeler ve Latin harfli okunuş:</b> <a href="https://acikkuran.com" target="_blank" rel="noopener">Açık Kuran</a> (acikkuran.com), CC BY-NC-SA 4.0 lisansı. Ticari olmayan kişisel kullanım. Metinler hiç değiştirilmeden alınmıştır.</p>
      <p><b>Doğrulama metni, sayfa ve cüz bilgisi:</b> <a href="https://tanzil.net" target="_blank" rel="noopener">Tanzil Projesi</a>, Uthmani metin ve Medine Mushafı sayfa düzeni, CC BY 3.0. Her ayetin harfleri Tanzil ile tek tek karşılaştırılmıştır.</p>
      <p><b>Ses:</b> <a href="https://everyayah.com" target="_blank" rel="noopener">EveryAyah.com</a>, ayet ayet kayıtlar.</p>
      <p><b>Yazı tipleri:</b> Amiri Quran ve Alegreya (SIL Open Font License).</p>
      <p class="muted">Latin harfli okunuş Arapçadaki bazı sesleri tam karşılayamaz. Ezberde yardımcıdır; tashih için bir hocaya okumanın yerini tutmaz.</p>
    </div>`;

  const $ = (id) => view.querySelector("#" + id);
  $("tema").value = a.tema;
  $("kari").onchange = (e) => { store.setAyar("kari", e.target.value); ctx.calarYenile(); toast("Hafız değiştirildi"); };
  $("besmele").onchange = (e) => store.setAyar("besmele", e.target.checked);
  $("bitisik").onchange = (e) => store.setAyar("bitisik", e.target.checked);
  $("tema").onchange = (e) => { store.setAyar("tema", e.target.value); temaUygula(); };
  $("arBoy").oninput = (e) => { store.setAyar("arBoy", +e.target.value); $("arV").textContent = e.target.value; temaUygula(); };
  $("trBoy").oninput = (e) => { store.setAyar("trBoy", +e.target.value); $("trV").textContent = e.target.value; temaUygula(); };
  $("dinle").onclick = () => { const au = new Audio(sesUrl(store.ayar.kari, 1, 2)); au.play().catch(() => toast("Örnek için internet gerekir")); };

  const durumYaz = async () => {
    const urls = await cuzUrlleri(+$("cuzSec").value);
    const n = await kayitliSayisi(urls);
    $("indirDurum").textContent = `Bu cüzde ${urls.length} ayet var; ${n} tanesi cihazda kayıtlı.`;
  };
  $("cuzSec").onchange = durumYaz;
  durumYaz();
  $("cuzIndir").onclick = async () => {
    const b = $("cuzIndir"); b.disabled = true;
    try {
      const urls = await cuzUrlleri(+$("cuzSec").value);
      const hata = await indir(urls, (i, n) => { $("indirDurum").textContent = `İndiriliyor… ${i}/${n}`; });
      toast(hata ? `${hata} ayet indirilemedi; tekrar deneyin.` : "Cüz indirildi");
    } catch (err) { toast(err.message || "İndirme başarısız"); }
    finally { b.disabled = false; durumYaz(); }
  };

  $("yedekAl").onclick = () => {
    const blob = new Blob([store.disaAktar()], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `hafiz-defteri-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  };
  $("yedekYukle").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { store.iceAktar(await f.text()); temaUygula(); toast("Yedek yüklendi"); ayarlar(view, ctx); }
    catch (err) { toast(err.message || "Yedek okunamadı"); }
  };
  $("kur").onclick = async () => { if (kurulumOlayi) { kurulumOlayi.prompt(); kurulumOlayi = null; $("kurBolum").classList.add("hidden"); } };
}
