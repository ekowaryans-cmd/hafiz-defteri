// Küçük arayüz yardımcıları
export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

let toastZaman = null;
export function toast(msg) {
  document.querySelector(".toast")?.remove();
  const t = el(`<div class="toast" role="status"></div>`);
  t.textContent = msg;
  document.body.append(t);
  clearTimeout(toastZaman);
  toastZaman = setTimeout(() => t.remove(), 2600);
}

// Alttan açılan seçenek menüsü: secenekler = [[etiket, fonksiyon], ...]
export function sheet(baslik, secenekler) {
  document.querySelector(".sheet-bg")?.remove();
  const bg = el(`<div class="sheet-bg"><div class="sheet card"><div class="sheet-t"></div></div></div>`);
  bg.querySelector(".sheet-t").textContent = baslik;
  const kutu = bg.querySelector(".sheet");
  for (const [etiket, fn] of secenekler) {
    const b = el(`<button class="sheet-b"></button>`);
    b.textContent = etiket;
    b.onclick = () => { bg.remove(); fn(); };
    kutu.append(b);
  }
  const iptal = el(`<button class="sheet-b iptal">Vazgeç</button>`);
  iptal.onclick = () => bg.remove();
  kutu.append(iptal);
  bg.addEventListener("click", (e) => { if (e.target === bg) bg.remove(); });
  document.body.append(bg);
}

export function trNormal(s) {
  return s.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ']/g, "").replace(/ı/g, "i");
}
