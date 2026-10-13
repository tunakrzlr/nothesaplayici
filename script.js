const GECMELER = [59.5, 60]; // 59,5 yuvarlanarak geçer, 60 resmi geçme notu
const FINAL_BARAJ = 30; // yıl sonu / bütünleme sınavından en az alınması gereken
const DATA = {
  3: {
    kurullar: [
      { ad: "Hematopoetik ve Lenfatik Sistem Hastalıkları", w: 9.94, lab: 5 },
      { ad: "Dolaşım ve Solunum Sistemi Hastalıkları", w: 19.75, lab: 15 },
      { ad: "Sindirim Sistemi ve Metabolizma Hastalıkları", w: 18.37, lab: 15 },
      { ad: "Hareket, Sinir, Duyu Sistemi Hastalıkları", w: 21.97, lab: 15 },
      { ad: "Ürogenital ve Endokrin Sistem Hastalıkları", w: 16.02, lab: 15 },
      { ad: "Yaşam Boyu Sağlık, Etik ve Adli Yaklaşımlar", w: 13.95, lab: 0 },
    ],
    ys: [
      { ad: "Teorik", w: 85 },
      { ad: "Mesleki Beceri", w: 9 },
      { ad: "Bilimsel Düşünme ve Planlama", w: 3 },
      { ad: "Topluma Dayalı Tıp Uygulamaları", w: 3 },
    ],
  },
};

const $ = (id) => document.getElementById(id);
const fmt = (n, d = 2) => n.toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d });
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const sinif = 3; // yalnızca 3. sınıf
let state = {}; // per-class: { k: [{toplam, lab, teo}], ys: [..], ysToplam, kurulDetail, ysDetail, example }

function blankState(s) {
  const d = DATA[s];
  return {
    k: d.kurullar.map(() => ({ toplam: "", lab: "", teo: "" })),
    ys: d.ys.map(() => ""),
    ysToplam: "",
    kurulDetail: false,
    ysDetail: true,
    example: false,
  };
}
function loadState(s) {
  const saved = store.get("gtf-state-" + s);
  if (saved && !saved.example && saved.k && saved.k.length === DATA[s].kurullar.length) { saved.kurulDetail = false; return saved; }
  return blankState(s);
}
function save() { store.set("gtf-state-" + sinif, state[sinif]); }

function num(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(",", "."));
  return isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
}

function numInput(id, value, label) {
  return `<div class="field"><label for="${id}">${label}</label><input type="number" inputmode="decimal" min="0" max="100" step="0.01" id="${id}" value="${value}"></div>`;
}

function renderRows() {
  const d = DATA[sinif], st = state[sinif];
  $("ysDetail").checked = st.ysDetail;

  $("kurulRows").innerHTML = d.kurullar.map((k, i) => {
    const bn = k.w * 0.6;
    let inputs;
    if (st.kurulDetail) {
      inputs = (k.lab ? numInput(`k${i}lab`, st.k[i].lab, `Lab %${k.lab}`) : "") +
               numInput(`k${i}teo`, st.k[i].teo, `Teorik %${100 - k.lab}`);
    } else {
      inputs = numInput(`k${i}`, st.k[i].toplam, "Kurul notu");
    }
    return `<div class="row" id="krow${i}">
      <div><div class="name">${i + 1}. ${k.ad}</div>
      <div class="meta">Ağırlık %${fmt(k.w)}</div></div>
      <div class="inputs">${inputs}</div>
      ${st.kurulDetail ? `<div class="calc" id="kcalc${i}"></div>` : ""}
    </div>`;
  }).join("");

  if (st.ysDetail) {
    $("ysRows").innerHTML = d.ys.map((c, i) => `<div class="row">
      <div><div class="name">${c.ad}</div><div class="meta">Sınavın %${c.w}'i${c.ad === "Teorik" ? "" : ` · <span class="hint">Tam puan için 100 girin</span>`}</div></div>
      <div class="inputs">${c.ad === "Teorik" ? `<div class="teo-need" id="needTeoRow" hidden><span class="lbl">Teorikten gereken</span><div class="pair"><span><span class="t">59,5 için</span><span class="val" id="needTeo0">–</span></span><span><span class="t">60 için</span><span class="val" id="needTeo1">–</span></span></div></div>` : ""}${numInput(`ys${i}`, st.ys[i], "Puan /100")}</div></div>`).join("");
  } else {
    $("ysRows").innerHTML = `<div class="row">
      <div><div class="name">Yıl sonu / Bütünleme toplam notu</div><div class="meta">${d.ys.map((c) => `${c.ad} %${c.w}`).join(" · ")}</div></div>
      <div class="inputs">${numInput("ysT", st.ysToplam, "Toplam /100")}</div></div>`;
  }
}

function kurulNote(i) {
  const k = DATA[sinif].kurullar[i], s = state[sinif].k[i];
  if (!state[sinif].kurulDetail) return num(s.toplam);
  const teo = num(s.teo), lab = k.lab ? num(s.lab) : 0;
  if (teo === null || lab === null) return null;
  return (lab * k.lab + teo * (100 - k.lab)) / 100;
}
function ysNote() {
  const st = state[sinif], d = DATA[sinif];
  if (!st.ysDetail) return num(st.ysToplam);
  let t = 0;
  for (let i = 0; i < d.ys.length; i++) {
    const v = num(st.ys[i]);
    if (v === null) return null;
    t += v * d.ys[i].w / 100;
  }
  return t;
}

function compute() {
  const d = DATA[sinif], st = state[sinif];
  const notes = d.kurullar.map((_, i) => kurulNote(i));
  const filled = notes.every((n) => n !== null);

  notes.forEach((n, i) => {
    $("krow" + i).classList.toggle("below50", n !== null && n < 50);
    const c = $("kcalc" + i);
    if (c) c.textContent = n === null ? "Kurul notu: –" : `Kurul notu: ${fmt(n)}`;
  });

  let kAvg = null, kContrib = null;
  if (filled) {
    kAvg = notes.reduce((s, n, i) => s + n * d.kurullar[i].w, 0) / 100;
    kContrib = kAvg * 0.6;
  }
  const ys = ysNote();
  const ysContrib = ys === null ? null : ys * 0.4;

  // Weighted average over only the kurullar entered so far
  let pSum = 0, pW = 0, pCount = 0;
  notes.forEach((n, i) => { if (n !== null) { pSum += n * d.kurullar[i].w; pW += d.kurullar[i].w; pCount++; } });
  $("kPartial").textContent = pCount ? `${fmt(pSum / pW)} (${pCount}/${notes.length})` : "–";
  $("kAvg").textContent = kAvg === null ? "–" : fmt(kAvg);
  $("kContrib").textContent = kContrib === null ? "–" : fmt(kContrib);
  $("ysVal").textContent = ys === null ? "–" : fmt(ys);
  $("ysContrib").textContent = ysContrib === null ? "–" : fmt(ysContrib);

  const bn = kContrib !== null && ysContrib !== null ? kContrib + ysContrib : null;
  $("bnVal").innerHTML = bn === null ? "–" : `${fmt(bn)}<small> /100</small>`;
  $("barK").style.width = (kContrib ?? 0) + "%";
  $("barY").style.width = (ysContrib ?? 0) + "%";
  $("legK").textContent = `Kurullar: ${kContrib === null ? "–" : fmt(kContrib)}`;
  $("legY").textContent = `Yıl sonu: ${ysContrib === null ? "–" : fmt(ysContrib)}`;

  // Status chips
  const chips = [];
  if (filled) {
    const low = notes.map((n, i) => (n < 50 ? i + 1 : null)).filter(Boolean);
    if (low.length) {
      chips.push(["bad", `${low.join(", ")}. kurul 50'nin altında. Yıl sonu sınavından önce bu kurul(lar)ın telafi sınavına girmen gerekiyor.`]);
    } else if (notes.every((n) => n >= 60) && kAvg >= 80) {
      chips.push(["good", "Muafsın: her kurul ≥ 60 ve ortalama ≥ 80. Yıl sonu sınavına girmeden başarılı sayılırsın."]);
    } else {
      const why = kAvg < 80 ? `ortalama ${fmt(kAvg)} (muafiyet için 80 gerekli)` : "bir veya daha fazla kurul 60'ın altında";
      chips.push(["warn", `Yıl sonu sınavına girebilirsin. Muaf değilsin: ${why}.`]);
    }
  }
  $("chips").innerHTML = chips.map(([t, m]) => `<div class="chip ${t}">${m}</div>`).join("");

  // Year-end score needed for each passing grade (59,5 and 60).
  // Final must be at least FINAL_BARAJ, and high enough to bring the başarı notu to the grade.
  const reqFinals = GECMELER.map((g) => {
    if (kContrib === null) return null;
    return Math.max(FINAL_BARAJ, (g - kContrib) / 0.4);
  });
  reqFinals.forEach((r, j) => {
    $("needVal" + j).textContent = r === null ? "–" : r > 100 ? "—" : fmt(r);
  });
  let needText = "";
  if (kContrib === null) needText = "Kurul notlarını girince görünecek.";
  else if (reqFinals[0] > 100) needText = "Finalden 100 alsan da geçme notuna ulaşılamıyor.";
  else if (reqFinals[1] > 100) needText = "60'a ulaşılamıyor, 59,5 ile geçebilirsin.";
  $("needText").textContent = needText;
  $("needText").hidden = !needText;

  // Once every non-teorik component is entered, show the teorik score that reaches each final target
  const teoIdx = d.ys.findIndex((c) => c.ad === "Teorik");
  let others = null;
  if (kContrib !== null && st.ysDetail && teoIdx >= 0) {
    others = 0;
    d.ys.forEach((c, i) => {
      if (i === teoIdx || others === null) return;
      const v = num(st.ys[i]);
      others = v === null ? null : others + v * c.w / 100;
    });
  }
  if ($("needTeoRow")) {
    $("needTeoRow").hidden = others === null;
    reqFinals.forEach((r, j) => {
      let t = "–";
      if (others !== null && r !== null) {
        const teo = (r - others) / (d.ys[teoIdx].w / 100);
        t = teo <= 0 ? "0" : teo > 100 ? "100+" : fmt(teo);
      }
      $("needTeo" + j).textContent = t;
    });
  }

  document.querySelectorAll('input[type="number"]').forEach((el) => {
    const v = el.value;
    el.classList.toggle("bad", v !== "" && (isNaN(parseFloat(v)) || parseFloat(v) < 0 || parseFloat(v) > 100));
  });
}

function clearExampleIfNeeded() {
  const st = state[sinif];
  if (st.example) {
    const fresh = blankState(sinif);
    fresh.kurulDetail = st.kurulDetail; fresh.ysDetail = st.ysDetail;
    state[sinif] = fresh;
    return true;
  }
  return false;
}

document.addEventListener("input", (e) => {
  const id = e.target.id, st = state[sinif];
  let m;
  if (!(m = id.match(/^k(\d+)(lab|teo)?$/)) && !id.match(/^ys(\d+|T)$/)) return;
  // Scores are out of 100: cap anything typed above 100 and drop a minus sign
  const typed = parseFloat(e.target.value);
  if (typed > 100) e.target.value = "100";
  else if (typed < 0) e.target.value = String(-typed);
  if (clearExampleIfNeeded()) {
    const v = e.target.value;
    renderRows();
    const el = $(id); el.value = v; el.focus();
  }
  const s = state[sinif];
  if ((m = id.match(/^k(\d+)$/))) s.k[+m[1]].toplam = e.target.value;
  else if ((m = id.match(/^k(\d+)(lab|teo)$/))) s.k[+m[1]][m[2]] = e.target.value;
  else if (id === "ysT") s.ysToplam = e.target.value;
  else if ((m = id.match(/^ys(\d+)$/))) s.ys[+m[1]] = e.target.value;
  save(); compute();
});

$("ysDetail").addEventListener("change", (e) => { state[sinif].ysDetail = e.target.checked; save(); renderRows(); compute(); });
$("clearBtn").addEventListener("click", () => {
  const st = state[sinif], fresh = blankState(sinif);
  fresh.kurulDetail = st.kurulDetail; fresh.ysDetail = st.ysDetail;
  state[sinif] = fresh; save(); renderRows(); compute();
});

state[sinif] = loadState(sinif);
renderRows(); compute();
