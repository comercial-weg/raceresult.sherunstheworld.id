(function(){
  const PHOTO = 'https://gallery.sherunstheworld.id/bib/';
  // E-sertifikat dibuat langsung di browser dari desain cert-bg.jpg (hanya kategori 10K).
  const CERT_BG = 'assets/cert-bg.jpg';
  const CERT_CATS = ['10K'];
  const PAGE = 25;
  const DATA_URL = 'data/results.json';
  const $ = id => document.getElementById(id);
  const nf = n => n.toLocaleString('id-ID');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const toS = t => { const p = t.split(':').map(Number); return p[0]*3600 + p[1]*60 + p[2]; };
  const pad = n => String(n).padStart(2,'0');
  const hms = s => pad(Math.floor(s/3600)) + ':' + pad(Math.floor(s%3600/60)) + ':' + pad(s%60);
  const short = s => { const h = Math.floor(s/3600), m = Math.floor(s%3600/60), x = s%60; return h ? h + ':' + pad(m) + ':' + pad(x) : m + ':' + pad(x); };
  const paceStr = (s, km) => { const p = Math.floor(s/km); return Math.floor(p/60) + ':' + pad(p%60); };
  const icoCam = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/></svg>';
  const icoCert = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M9 9.2l2 2 4-4"/><path d="M8.6 13.9 7 22l5-3 5 3-1.6-8.1"/></svg>';
  const certLink = (bib, cls, label) => '<button type="button" class="'+cls+' cert-btn" data-bib="'+bib+'" aria-label="E-sertifikat BIB '+bib+'" title="E-sertifikat">'+icoCert+(label||'')+'</button>';
  let toastT;
  const toast = msg => { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200); };

  /* ---------- e-sertifikat ---------- */
  let bgImg = null, lastFocus = null;
  const loadBg = () => bgImg || (bgImg = new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = CERT_BG; }));
  async function drawCert(r){
    const W = 2025, H = 1620, PINK = '#E13F83', F = "'SRTW Cert','Bricolage Grotesque',sans-serif";
    await Promise.all([document.fonts.load("800 100px 'SRTW Cert'"), document.fonts.load("700 40px 'SRTW Cert'")]).catch(() => {});
    const img = await loadBg();
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, W, H);
    // Nama, di atas garis
    const nm = r.name.toUpperCase();
    let fs = 128; x.font = '800 '+fs+'px '+F;
    while (x.measureText(nm).width > 1560 && fs > 56) { fs -= 4; x.font = '800 '+fs+'px '+F; }
    x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
    x.strokeStyle = '#B32C66'; x.lineWidth = fs*0.30; x.strokeText(nm, W/2+6, 820);
    x.strokeStyle = '#fff'; x.lineWidth = fs*0.24; x.strokeText(nm, W/2, 812);
    x.fillStyle = PINK; x.fillText(nm, W/2, 812);
    // Label waktu
    x.font = '700 44px '+F; x.fillStyle = '#fff';
    if ('letterSpacing' in x) x.letterSpacing = '4px';
    x.fillText('FINISH TIME', W/2, 948);
    if ('letterSpacing' in x) x.letterSpacing = '0px';
    // Waktu di kotak putih miring
    x.font = '800 124px '+F;
    const bw = x.measureText(r.time).width + 110, bh = 168;
    x.save(); x.translate(W/2, 1072); x.rotate(-2.5*Math.PI/180);
    x.shadowColor = 'rgba(60,50,0,.25)'; x.shadowBlur = 24; x.shadowOffsetY = 8;
    x.fillStyle = '#fff'; x.fillRect(-bw/2, -bh/2, bw, bh);
    x.shadowColor = 'transparent';
    x.fillStyle = PINK; x.textBaseline = 'middle'; x.fillText(r.time, 0, 8);
    x.restore();
    return c;
  }
  const toJpeg = (c, q) => new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error('blob')), 'image/jpeg', q));
  // Kualitas JPEG diturunkan bertahap sampai file maksimal ~500 KB
  async function jpegUnder(c, max){
    let b;
    for (const q of [0.92, 0.88, 0.84, 0.8, 0.75, 0.7]) { b = await toJpeg(c, q); if (b.size <= max) return b; }
    return b;
  }
  // PDF 1 halaman berisi gambar JPEG, ukuran halaman sama dengan desain asli (1012,5 x 810 pt)
  async function makePdf(jpg, wPx, hPx, wPt, hPt){
    const data = new Uint8Array(await jpg.arrayBuffer()), enc = new TextEncoder();
    const parts = [], off = []; let len = 0;
    const push = d => { const u = typeof d === 'string' ? enc.encode(d) : d; parts.push(u); len += u.length; };
    const obj = (n, f) => { off[n] = len; push(n + ' 0 obj\n'); f(); push('\nendobj\n'); };
    push('%PDF-1.4\n'); push(new Uint8Array([37, 226, 227, 207, 211, 10]));
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
    obj(3, () => push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + wPt + ' ' + hPt + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'));
    obj(4, () => { push('<< /Type /XObject /Subtype /Image /Width ' + wPx + ' /Height ' + hPx + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + data.length + ' >>\nstream\n'); push(data); push('\nendstream'); });
    const cs = 'q ' + wPt + ' 0 0 ' + hPt + ' 0 0 cm /Im0 Do Q';
    obj(5, () => push('<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream'));
    obj(6, () => push('<< /Title (E-Sertifikat She Runs The World 2026) /Producer (SRTW 2026 Results) >>'));
    const xref = len;
    let t = 'xref\n0 7\n0000000000 65535 f \n';
    for (let i = 1; i <= 6; i++) t += String(off[i]).padStart(10, '0') + ' 00000 n \n';
    push(t + 'trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    return new Blob(parts, {type: 'application/pdf'});
  }
  let pdfUrl = null, pdfBlob = null;
  const certFile = r => 'E-Sertifikat-SRTW2026-' + r.bib + '-' + r.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.pdf';
  async function openCert(bib){
    const r = byBib.get(String(bib)); if (!r) return;
    if (!CERT_CATS.includes(r.cat)) { toast('E-sertifikat kategori ' + r.cat + ' belum tersedia.'); return; }
    if (!r.name) { toast('Nama untuk BIB ' + r.bib + ' belum terdaftar. Hubungi panitia lewat DM @sherunstheworld.id.'); return; }
    lastFocus = document.activeElement;
    const m = $('cert-modal'), dl = $('cert-dl'), pv = $('cert-prev');
    $('cert-title').textContent = 'E-sertifikat ' + r.name;
    pv.innerHTML = '<span class="loading">Menyiapkan sertifikat…</span>';
    dl.setAttribute('aria-disabled', 'true'); dl.removeAttribute('href'); $('cert-size').textContent = 'Menyiapkan file PDF…';
    m.hidden = false; document.body.style.overflow = 'hidden'; $('cert-close').focus();
    try {
      const c = await drawCert(r);
      const jpg = await jpegUnder(c, 500 * 1024);
      const pdf = await makePdf(jpg, c.width, c.height, 1012.5, 810);
      if (m.hidden) return;
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      pdfUrl = URL.createObjectURL(pdf);
      // Pratinjau = kanvasnya langsung (tanpa blob:/data: URL, jadi aman dari pemblokiran gambar)
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', 'E-sertifikat 10K finisher atas nama ' + r.name + ', finish time ' + r.time);
      pv.innerHTML = ''; pv.appendChild(c);
      pdfBlob = pdf; dl.href = pdfUrl; dl.download = certFile(r); dl.removeAttribute('aria-disabled');
      $('cert-size').textContent = 'PDF ' + Math.round(pdf.size / 1024).toLocaleString('id-ID') + ' KB, siap dicetak atau dibagikan.';
    } catch (e) {
      pv.innerHTML = '<span class="loading">Sertifikat gagal dibuat. Coba lagi ya.</span>';
    }
  }
  function closeCert(){
    $('cert-modal').hidden = true; document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('.cert-btn'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); openCert(b.dataset.bib);
  }, true);
  $('cert-close').addEventListener('click', closeCert);
  $('cert-modal').addEventListener('click', e => { if (e.target.id === 'cert-modal') closeCert(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('cert-modal').hidden) closeCert(); });
  $('cert-dl').addEventListener('click', () => {
    const a = $('cert-dl'); if (!a.href || !pdfBlob) return;
    setTimeout(() => toast('Sertifikat diunduh. Cek folder Download kamu.'), 300);
  });
  const zig = c => '<svg class="deco" aria-hidden="true" width="90" height="60" viewBox="0 0 90 60"><path d="M6 10 L40 26 L34 34 L84 52" fill="none" stroke="'+c+'" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const nameHtml = r => r.name ? esc(r.name) : 'Nama belum terdaftar';

  let DATA = [], byBib = new Map(), totals = {}, winner = {};
  const FILTERS = [
    {id:'all', label:'Semua', test:()=>true},
    {id:'sub60', label:'Sub 1 jam', test:r=>r.s<3600},
    {id:'60', label:'1:00–1:15', test:r=>r.s>=3600&&r.s<4500},
    {id:'75', label:'1:15–1:30', test:r=>r.s>=4500&&r.s<5400},
    {id:'90', label:'1:30–1:45', test:r=>r.s>=5400&&r.s<6300},
    {id:'105', label:'1:45–2:00', test:r=>r.s>=6300&&r.s<7200},
    {id:'120', label:'2 jam+', test:r=>r.s>=7200}
  ];
  let fState = {f:'all', q:'', page:1, list:[]};

  fetch(DATA_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(init).catch(() => {
    $('helper').textContent = 'Data hasil gagal dimuat. Coba muat ulang halaman.';
    $('helper').classList.add('err');
  });

  function init(rows){
    DATA = rows.map(a => {
      const cat = a[4] || '10K', km = parseFloat(cat) || 10, s = toS(a[3]);
      return {pos:a[0], bib:a[1], name:a[2], time:a[3], cat, km, status:a[5]||'Finished', s, pace:paceStr(s, km), key:norm((a[2]||'') + ' ' + a[1])};
    }).filter(r => r.status === 'Finished').sort((a,b) => a.pos - b.pos);
    DATA.forEach(r => {
      byBib.set(String(r.bib), r);
      totals[r.cat] = (totals[r.cat]||0) + 1;
      if (!winner[r.cat] || r.s < winner[r.cat].s) winner[r.cat] = r;
    });
    const cats = Object.keys(totals);
    $('pill-cat').textContent = cats.join(' & ');
    $('helper').textContent = nf(DATA.length) + ' finisher ' + cats.join(' & ') + ' sudah tercatat. BIB 10K ada di bagian depan jersey kamu.';
    $('foot-meta').textContent = 'Hasil resmi kategori ' + cats.join(' & ') + ' · ' + nf(DATA.length) + ' finisher';
    renderStats(); renderFilters(); applyTable();
    route();
  }

  /* ---------- stats ---------- */
  function renderStats(){
    const ss = DATA.map(r => r.s).sort((a,b)=>a-b);
    const med = ss.length % 2 ? ss[(ss.length-1)/2] : Math.round((ss[ss.length/2-1] + ss[ss.length/2]) / 2);
    const w = DATA[0], km = w.km;
    const tiles = [
      ['Finisher', nf(DATA.length), 'Kategori ' + Object.keys(totals).join(' & ')],
      ['Gun time tercepat', hms(w.s), nameHtml(w)],
      ['Gun time tengah (median)', hms(med), 'Pace ' + paceStr(med, km) + ' /km']
    ];
    $('stats').innerHTML = tiles.map(t => '<div class="stat"><div class="k">'+t[0]+'</div><div class="v">'+t[1]+'</div><div class="s">'+t[2]+'</div></div>').join('');
    $('ringkas-sub').textContent = 'Gun time terakhir ' + hms(ss[ss.length-1]);
  }

  /* ---------- table ---------- */
  function renderFilters(){
    const wrap = $('filters'), search = wrap.querySelector('.tsearch');
    FILTERS.forEach(f => {
      const c = DATA.filter(f.test).length;
      if (!c) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'fchip'; b.dataset.f = f.id;
      b.setAttribute('aria-pressed', f.id === 'all');
      b.innerHTML = f.label + '<small>' + nf(c) + '</small>';
      wrap.insertBefore(b, search);
    });
    wrap.addEventListener('click', e => {
      const b = e.target.closest('.fchip'); if (!b) return;
      fState.f = b.dataset.f; fState.page = 1;
      wrap.querySelectorAll('.fchip').forEach(x => x.setAttribute('aria-pressed', x === b));
      applyTable();
    });
    let t; $('tq').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { fState.q = norm(e.target.value); fState.page = 1; applyTable(); }, 120); });
    $('pager').addEventListener('click', e => {
      const b = e.target.closest('.pg'); if (!b || b.disabled || b.hasAttribute('aria-current')) return;
      fState.page = +b.dataset.p; drawTable();
      $('semua').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
    });
    $('tbody').addEventListener('click', e => {
      if (e.target.closest('a,button')) return;
      const row = e.target.closest('.trow.r'); if (row) openBib(row.dataset.bib, true);
    });
    $('tbody').addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('.trow.r'); if (row && e.target === row) { e.preventDefault(); openBib(row.dataset.bib, true); }
    });
  }
  function applyTable(){
    const f = FILTERS.find(x => x.id === fState.f);
    const q = fState.q;
    fState.list = DATA.filter(r => f.test(r) && (!q || r.key.includes(q)));
    drawTable();
  }
  function drawTable(){
    const L = fState.list, pages = Math.max(1, Math.ceil(L.length / PAGE));
    fState.page = Math.min(Math.max(1, fState.page), pages);
    const start = (fState.page - 1) * PAGE, shown = L.slice(start, start + PAGE);
    $('tbody').innerHTML = shown.length ? shown.map(r =>
      '<div class="trow r" role="row" tabindex="0" data-bib="'+r.bib+'" aria-label="Posisi '+r.pos+', '+esc(r.name||'nama belum terdaftar')+', gun time '+r.time+'">'+
        '<span class="pos" role="cell">'+r.pos+'</span>'+
        '<span class="bib" role="cell"><span class="chip">#'+r.bib+'</span></span>'+
        '<span class="nm'+(r.name?'':' unknown')+'" role="cell">'+nameHtml(r)+'</span>'+
        '<span class="tm" role="cell">'+r.time+'</span>'+
        '<span class="pc" role="cell">'+r.pace+' /km</span>'+
        '<span class="ft" role="cell"><a class="icon-btn" href="'+PHOTO+r.bib+'" target="_blank" rel="noopener" aria-label="Foto BIB '+r.bib+'" title="Lihat foto">'+icoCam+'</a>'+certLink(r.bib, 'icon-btn')+'</span>'+
      '</div>').join('') : '<div class="empty">Nggak ada hasil yang cocok. Coba kata kunci lain atau pilih filter "Semua".</div>';
    $('tcount').textContent = nf(L.length) + ' finisher';
    $('shown').textContent = L.length ? 'Menampilkan ' + nf(start + 1) + '–' + nf(start + shown.length) + ' dari ' + nf(L.length) : '';
    drawPager(pages);
  }

  function drawPager(pages){
    const cur = fState.page, el = $('pager');
    if (pages <= 1) { el.innerHTML = ''; return; }
    const set = new Set([1, pages, cur - 1, cur, cur + 1]);
    if (cur <= 3) [2,3,4].forEach(n => set.add(n));
    if (cur >= pages - 2) [pages-1, pages-2, pages-3].forEach(n => set.add(n));
    const nums = [...set].filter(n => n >= 1 && n <= pages).sort((a,b) => a - b);
    let h = '<button type="button" class="pg" data-p="'+(cur-1)+'"'+(cur===1?' disabled':'')+' aria-label="Halaman sebelumnya">‹<span class="pg-txt"> Sebelumnya</span></button>';
    nums.forEach((n,i) => {
      if (i && n - nums[i-1] > 1) h += '<span class="pg-gap" aria-hidden="true">…</span>';
      h += '<button type="button" class="pg'+(n===1||n===pages||n===cur?'':' nb')+'" data-p="'+n+'"'+(n===cur?' aria-current="page"':'')+' aria-label="Halaman '+n+'">'+n+'</button>';
    });
    h += '<button type="button" class="pg" data-p="'+(cur+1)+'"'+(cur===pages?' disabled':'')+' aria-label="Halaman berikutnya"><span class="pg-txt">Berikutnya </span>›</button>';
    el.innerHTML = h;
  }

  /* ---------- result card ---------- */
  function openBib(bib, scroll){
    const r = byBib.get(String(bib));
    if (!r) return false;
    renderResult(r);
    if (location.hash !== '#bib-' + r.bib) { try { history.replaceState(null, '', '#bib-' + r.bib); } catch(e) { location.hash = 'bib-' + r.bib; } }
    if (scroll) $('hasil').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
    return true;
  }
  function renderResult(r){
    const total = totals[r.cat];
    const faster = total - r.pos;
    const pct = total > 1 ? faster/(total-1) : 1;
    const topPct = Math.max(1, Math.ceil(r.pos/total*100));
    const sec = $('hasil');
    sec.innerHTML =
      '<div class="rcard">'+
        '<div>'+
          '<div class="eyebrow"><span class="chip">Finisher '+esc(r.cat)+'</span><span class="chip pink">BIB #'+r.bib+'</span></div>'+
          '<h2 class="rname'+(r.name?'':' unknown')+'" id="rname" tabindex="-1">'+nameHtml(r)+'</h2>'+
          '<div class="rtime-label">Gun time</div>'+
          '<div class="rtime">'+hms(r.s)+'</div>'+
          '<div class="rprog">'+
            '<p class="rprog-text">'+(faster>0 ? 'Kamu finish lebih cepat dari <b>'+nf(faster)+' pelari</b>.' : 'Kamu finish paling akhir, tapi tetap finish. Itu yang penting.')+(r.pos===1?' <b>Juara 1!</b>':'')+'</p>'+
            '<div class="track" aria-hidden="true"><div class="track-fill" style="width:'+(pct*100)+'%"></div><div class="track-dot" style="left:'+(pct*100)+'%"></div></div>'+
            '<div class="track-ends"><span>Finisher terakhir</span><span>Juara</span></div>'+
          '</div>'+
        '</div>'+
        '<div class="rstats">'+
          '<div class="rstat hl"><div class="k">Posisi</div><div class="v">#'+nf(r.pos)+'</div><div class="s">dari '+nf(total)+' finisher</div></div>'+
          '<div class="rstat"><div class="k">Pace rata-rata</div><div class="v">'+r.pace+'</div><div class="s">menit per km</div></div>'+
          '<div class="rstat"><div class="k">Peringkat persen</div><div class="v">Top '+topPct+'%</div><div class="s">dari seluruh finisher</div></div>'+
        '</div>'+
        '<div class="ractions">'+
          '<a class="btn-plum" href="'+PHOTO+r.bib+'" target="_blank" rel="noopener">'+icoCam+' Lihat fotomu</a>'+
          certLink(r.bib, 'btn-ghost', ' E-sertifikat')+
          '<button class="btn-ghost" type="button" id="again">Cari BIB lain</button>'+
        '</div>'+
      '</div>';
    sec.hidden = false;
    $('again').addEventListener('click', () => { closeResult(); const q = $('q'); q.value = ''; q.focus(); $('cari').scrollIntoView({behavior:'smooth'}); });
  }
  function closeResult(){
    $('hasil').hidden = true;
    try { history.replaceState(null, '', location.pathname + location.search); } catch(e) {}
  }

  /* ---------- hero search ---------- */
  const helperDefault = () => nf(DATA.length) + ' finisher ' + Object.keys(totals).join(' & ') + ' sudah tercatat. BIB 10K ada di bagian depan jersey kamu.';
  function setHelper(msg, err){ const h = $('helper'); h.textContent = msg; h.classList.toggle('err', !!err); }
  function renderSuggest(list){
    $('suggest').innerHTML = list.map(r => '<li><button type="button" data-bib="'+r.bib+'"><span class="s-name">'+nameHtml(r)+'</span><span class="chip">#'+r.bib+'</span><span class="s-time">'+r.time+'</span></button></li>').join('');
  }
  $('suggest').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { renderSuggest([]); openBib(b.dataset.bib, true); } });
  $('q').addEventListener('input', e => {
    if (!DATA.length) return;
    const v = e.target.value.trim();
    if (/^\d+$/.test(v) || v.length < 2) { renderSuggest([]); setHelper(helperDefault()); return; }
    const q = norm(v), hits = DATA.filter(r => r.key.includes(q));
    renderSuggest(hits.slice(0, 8));
    setHelper(hits.length ? (hits.length > 8 ? nf(hits.length) + ' nama cocok, 8 teratas ditampilkan. Ketik lebih lengkap untuk mempersempit.' : nf(hits.length) + ' nama cocok. Pilih punyamu.') : 'Nama "' + v + '" belum ketemu. Coba nama depan saja, atau cari pakai BIB.', !hits.length);
  });
  $('search-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!DATA.length) return;
    const v = $('q').value.trim();
    if (!v) { setHelper('Ketik nomor BIB atau nama dulu ya.', true); return; }
    if (/^\d+$/.test(v)) {
      renderSuggest([]);
      if (openBib(v, true)) setHelper(helperDefault());
      else setHelper('BIB ' + v + ' belum ada di hasil ' + Object.keys(totals).join(' & ') + '. Cek lagi nomornya di jersey kamu.', true);
      return;
    }
    const q = norm(v), hits = DATA.filter(r => r.key.includes(q));
    if (hits.length === 1) { renderSuggest([]); openBib(hits[0].bib, true); setHelper(helperDefault()); }
    else if (!hits.length) setHelper('Nama "' + v + '" belum ketemu. Coba nama depan saja, atau cari pakai BIB.', true);
    else { renderSuggest(hits.slice(0, 8)); }
  });

  /* ---------- hash routing ---------- */
  function route(){
    const m = location.hash.match(/^#bib-(\d+)$/);
    if (m) { if (!openBib(m[1], true)) setHelper('BIB ' + m[1] + ' tidak ditemukan.', true); }
  }
  window.addEventListener('hashchange', route);
})();
