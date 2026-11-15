/* Dram core: pure logic, no DOM. Tested with plain node (tests/core.test.js). */
(function (root) {
  'use strict';

  /* ---------- CSV ---------- */
  // RFC 4180 style: quoted fields, doubled quotes, CRLF or LF, a BOM at the start.
  function parseCSV(text) {
    const s = String(text || '').replace(/^﻿/, '');
    const rows = [], n = s.length;
    let row = [], i = 0;
    while (i <= n) {
      if (i === n) { if (row.length) rows.push(row); break; }
      let f;
      if (s.charCodeAt(i) === 34) {            // quoted field
        let j = i + 1, out = '';
        for (;;) {
          const k = s.indexOf('"', j);
          if (k < 0) { out += s.slice(j); j = n; break; }
          out += s.slice(j, k);
          if (s.charCodeAt(k + 1) === 34) { out += '"'; j = k + 2; continue; }
          j = k + 1; break;
        }
        f = out; i = j;
      } else {
        let j = i;
        while (j < n) { const c = s.charCodeAt(j); if (c === 44 || c === 10 || c === 13) break; j++; }
        f = s.slice(i, j); i = j;
      }
      row.push(f);
      const c = s.charCodeAt(i);
      if (c === 44) { i++; if (i === n) { row.push(''); rows.push(row); break; } continue; }
      if (c === 13) i++;
      if (s.charCodeAt(i) === 10) i++;
      rows.push(row); row = [];
      if (i >= n) break;
    }
    return rows.filter((r) => r.length > 1 || (r[0] || '').trim() !== '');
  }

  function toRecords(rows) {
    if (!rows.length) return [];
    const head = rows[0].map((h) => h.trim());
    const out = [];
    for (let r = 1; r < rows.length; r++) {
      const o = {};
      for (let c = 0; c < head.length; c++) o[head[c]] = (rows[r][c] || '').trim();
      out.push(o);
    }
    return out;
  }

  /* ---------- Words ---------- */
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const words = (s) => fold(s).replace(/['’]/g, '').split(/[^a-z0-9.]+/).map((w) => w.replace(/^\.+|\.+$/g, '')).filter(Boolean);
  const NUMWORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
    'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty'];
  const hasNumber = (s) => /\d/.test(s) || words(s).some((w) => NUMWORDS.includes(w));

  // Words that describe the category of a whisky rather than name it.
  const STYLE = new Set(('single malt blended blend grain pot still peated peaty heavily lightly richly unpeated smoky straight bourbon rye wheat wheated corn ' +
    'kentucky tennessee indiana pennsylvania maryland texas american japanese irish scotch canadian world whisky whiskey whiskies whiskeys spirit ' +
    'bottled in bond bonded bib cask strength barrel proof full small batch independent bottling non chill filtered natural colour color ' +
    'class tbd multi origin triple double distilled malted mash multigrain of the a and'
  ).split(' '));
  const CASKISH = /\b(cask|casks|barrel|barrels|finish|finished|wood|oak|sherry|port|madeira|rum|wine|sauternes|mizunara|stout|ipa|beer|cognac|armagnac|px|oloroso|tokaji|marsala|calvados)\b/i;
  const EDITIONISH = /\b(release|edition|exclusive|limited|special|anniversary|collection|series|vintage release|batch \d|selection|travel retail|distillery only|festival)\b/i;
  const SMALL = new Set(['of', 'the', 'and', 'by', 'in', 'on', 'at', 'for', 'with', 'de', 'du', 'la', 'le', 'a', 'an', 'to', 'no.', 'no', '&', 'x']);

  const isStyleSeg = (seg) => { const w = words(seg.replace(/[()]/g, ' ')); return w.length > 0 && w.every((x) => STYLE.has(x)); };
  // A name-like segment is in title case; descriptive notes run in sentence case ("Double distilled copper pot").
  function titleish(seg) {
    const ws = seg.split(/\s+/).filter(Boolean);
    if (ws.length > 7 || seg.length > 48) return false;
    return ws.every((w, i) => i === 0 || SMALL.has(w.toLowerCase()) || /^[^a-z]/.test(w) || w.length <= 2);
  }
  const containsWords = (hay, seg) => { const h = words(hay); const s = words(seg); return s.length > 0 && s.every((w) => h.includes(w)); };

  function ageYears(a) {
    const m = /^\s*(\d{1,3})\s*(?:years?|yrs?|year old|years old|yo)\s*$/i.exec(a || '');
    return m ? +m[1] : null;
  }
  const isNAS = (a) => /^\s*(nas|no age statement)\s*$/i.test(a || '');

  const DISTILLERY_TAIL = /\s+(distillery|distilleries|distilling|distillers|distilling co\.?|company|co\.?|spirits|inc\.?|llc|ltd\.?|whiskey co\.?|whisky co\.?)$/i;
  function shortDistillery(d) {
    let s = String(d || '').replace(/\s*\(.*\)\s*$/, '').trim();
    if (/^(undisclosed|multiple|various|unknown)/i.test(s)) return '';
    for (let k = 0; k < 4; k++) s = s.replace(DISTILLERY_TAIL, '').trim();
    return s;
  }

  /* ---------- One whisky ---------- */
  function fnv(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36);
  }
  function httpsUrl(u) {
    const s = String(u || '').split(/\s*[;|]\s*|\s+/).find((x) => /^https?:\/\/[^\s"<>]+$/i.test(x));
    return s ? s.replace(/^http:\/\//i, 'https://') : '';
  }
  const PROPER = /\b(american|spanish|french|european|japanese|scottish|irish|hungarian|portuguese|russian|kentucky|tennessee|pedro|ximenez|ximénez|mizunara|madeira|sauternes|marsala|tokaji|rioja|chardonnay|pinot|cabernet|bordeaux|burgundy|cognac|armagnac|calvados|caribbean|jamaican|mezcal)\b/gi;
  const fixCaps = (s) => String(s).replace(PROPER, (m) => m[0].toUpperCase() + m.slice(1).toLowerCase());
  const COMMON_LEAD = /^(ex|new|first|second|third|refill|re|oloroso|sherry|port|bourbon|virgin|toasted|charred|used|fresh|heavily|lightly|medium|single|double|triple|wine|rum|red|white|oak|casks?|barrels?|hogsheads?|butts?|quarter|seasoned|fino|amontillado|moscatel|tawny|ruby|stout|beer|small|large|standard|traditional|mixed|various|mostly|predominantly|primarily|bourbon-seasoned|sherry-seasoned)\b/i;
  const lowerFirst = (s) => fixCaps(COMMON_LEAD.test(s) && /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
  const usable = (s) => !!s && !/^(null|n\/a|na|unknown|unspecified|not disclosed|undisclosed|incl\b|tbd|varies|various|see )/i.test(String(s).trim());
  const num = (v) => { const x = parseFloat(v); return isFinite(x) ? x : null; };
  const pct = (x) => (Math.round(x * 10) / 10).toString();
  const TYPE_SHORT = { 'Japanese Whisky': 'Japanese', 'Irish Whiskey': 'Irish', 'World Whiskey': 'World', 'American Whiskey': 'American',
    'Tennessee Whiskey': 'Tennessee', 'American Single Malt': 'American single malt' };
  const typeLabel = (t) => TYPE_SHORT[t] || t || 'Other';
  const spelling = (country) => (/^(ireland|united states|usa|us)$/i.test(country || '') ? 'whiskey' : 'whisky');

  function normalise(r) {
    const brandRaw = r.whisky_name || r.distillery || 'Unnamed';
    const segs = String(r.expression_or_style || '').split(';').map((x) => x.trim()).filter(Boolean);
    const style = [], names = [], casks = [], editions = [], notes = [];
    for (let s of segs) {
      const pm0 = /\s*\(([^)]+)\)\s*$/.exec(s);
      if (pm0 && pm0.index > 0) { editions.push(pm0[1]); s = s.slice(0, pm0.index).trim(); }
      if (containsWords(brandRaw, s)) continue;
      if (isStyleSeg(s)) style.push(s);
      else if (!titleish(s)) notes.push(s);
      else if (EDITIONISH.test(s)) editions.push(s);
      else if (CASKISH.test(s) && !/[A-Z][a-z]+ [A-Z]/.test(s.replace(CASKISH, ''))) casks.push(s);
      else names.push(s);
    }
    // A plain category as the name ("Rye Whiskey") takes the distillery in front of it
    let brand = brandRaw;
    if (isStyleSeg(brandRaw)) { const d = shortDistillery(r.distillery); if (d && !containsWords(brandRaw, d)) brand = `${d} ${brandRaw}`; }
    let expr = (names.length ? names : casks.slice(0, 1)).join(' ');
    let paren = '';
    const pm = /\s*\(([^)]+)\)\s*$/.exec(expr);
    if (pm) { paren = pm[1]; expr = expr.slice(0, pm.index).trim(); }
    let title;
    const bw = words(brand);
    if (expr && bw.length && bw.every((w) => words(expr).includes(w))) title = expr;
    else title = [brand, expr].filter(Boolean).join(' ');
    const age = ageYears(r.age_statement);
    if (age && !hasNumber(expr) && !hasNumber(brandRaw)) title += ` ${age} Year Old`;
    const batch = r.batch_lot ? (/^\d+$/.test(r.batch_lot) ? `No. ${r.batch_lot}` : r.batch_lot) : '';
    const edition = [paren, ...editions, r.vintage ? `${r.vintage} vintage` : '', batch].filter(Boolean)
      .filter((x, i, a) => a.findIndex((y) => fold(y) === fold(x)) === i).join(', ');
    const abv = num(r.abv_percent), proof = num(r.us_proof);
    const country = r.origin_country || '';
    const tags = [...style, ...(names.length ? casks : casks.slice(1))].filter((x, i, a) => a.indexOf(x) === i);
    return {
      id: '', title: title.replace(/\s+/g, ' ').trim(), edition, brand: brandRaw, expr,
      type: r.whisky_type || '', typeLabel: typeLabel(r.whisky_type), style: tags, notes,
      owner: r.brand_owner || '', distillery: r.distillery || '', location: r.distillery_location || '', country,
      group: r.origin_group || '', ageText: r.age_statement || '', age, nas: isNAS(r.age_statement),
      vintage: r.vintage || '', batch: r.batch_lot || '', abv, proof, mash: r.grain_or_mash_bill || '',
      cask: r.primary_cask || '', finish: r.cask_finish || '', method: r.production_method || '',
      variable: /^true$/i.test(r.is_variable_programme || ''),
      image: httpsUrl(r.image_url), info: httpsUrl(r.information_url) || httpsUrl(r.all_source_urls),
      price: num(r.price), currency: r.price_currency || '', priceDate: r.price_checked_date || '',
      verified: r.last_source_verified || '', spell: spelling(country),
      key: [r.whisky_name, r.expression_or_style, r.age_statement, r.vintage, r.batch_lot, r.abv_percent, r.distillery].join('|'),
    };
  }

  // Catalogue from CSV text: normalised whiskies with stable ids
  function catalogue(text) {
    const recs = toRecords(parseCSV(text));
    const seen = Object.create(null);
    const out = [];
    for (const r of recs) {
      if (!r.whisky_name && !r.distillery) continue;
      const w = normalise(r);
      let id = 'w' + fnv(w.key);
      if (seen[id]) { let k = 2; while (seen[id + '-' + k]) k++; id = id + '-' + k; }
      seen[id] = 1;
      w.id = id;
      delete w.key;
      out.push(w);
    }
    return out;
  }

  /* ---------- Words for a card ---------- */
  function styleWords(w) {
    const st = w.style.filter((s) => !CASKISH.test(s) || isStyleSeg(s));
    const main = st.find((s) => /malt|grain|blend|bourbon|rye|pot still|whisk|wheat|corn|tennessee/i.test(s)) || '';
    const adj = st.filter((s) => /peat|smok/i.test(s) && s !== main);
    let core = [...adj, main].filter(Boolean).map((s) => s.toLowerCase()).join(' ');
    core = fixCaps(core).replace(/\b(scotch|irish|canadian|indiana|pennsylvania|maryland|texas)\b/g, (m) => m[0].toUpperCase() + m.slice(1));
    const t = w.type;
    const nat = /^Scotch$/.test(t) ? 'Scotch' : /Japanese/.test(t) ? 'Japanese' : /Irish/.test(t) ? 'Irish' : /Canad/i.test(w.country) ? 'Canadian' : '';
    const plain = /^Bourbon$/.test(t) ? 'bourbon' : /^Rye$/.test(t) ? 'rye whiskey' : /Tennessee/.test(t) ? 'Tennessee whiskey'
      : /American Single Malt/.test(t) ? 'American single malt' : /American/.test(t) ? 'American whiskey' : '';
    if (!core) return plain || (nat === 'Scotch' ? 'Scotch whisky' : nat ? `${nat} ${w.spell}` : w.spell);
    if (/whisk|bourbon|\brye\b|scotch/i.test(core)) return core;
    if (plain) return words(plain).every((x) => words(core).includes(x)) ? core : /malt$/.test(core) && /single malt/.test(plain) ? plain : `${core} ${plain}`;
    if (nat === 'Scotch') return `${core} Scotch`;
    if (nat) return `${nat} ${core}`;
    return /malt$|grain$|pot still$/.test(core) ? `${core} ${w.spell}` : core;
  }
  const anArticle = (phrase) => (/^(8|11\b|18\b|8\d\b|[aeiou])/i.test(phrase) ? 'An' : 'A');

  function from(w) {
    const d = w.distillery || '';
    const parts = String(w.location || '').split(',').map((x) => x.trim()).filter(Boolean)
      .filter((x, i, a) => a.findIndex((y) => fold(y) === fold(x)) === i);
    const loc = parts.join(', ');
    if (/^undisclosed/i.test(d)) { const p = /\(([^)]+)\)/.exec(d); return `from an undisclosed distillery${p ? ` (${p[1]})` : ''}`; }
    if (/^(multiple|various)/i.test(d)) return `from several distilleries${loc && !/^various/i.test(loc) ? ` in ${loc.replace(/^various,?\s*/i, '')}` : ''}`;
    if (!d) return loc ? `from ${loc}` : w.country ? `from ${w.country}` : '';
    if (loc && fold(parts[0]) === fold(d)) return `from ${loc}`;
    return `from ${d}${loc ? ` in ${loc}` : w.country ? ` in ${w.country}` : ''}`;
  }

  function story(w) {
    const age = w.age ? `${w.age} year old ` : '';
    const what = age + styleWords(w);
    let s = `${anArticle(what)} ${what} ${from(w)}`.replace(/\s+/g, ' ').trim();
    if (w.vintage && /^\d{4}$/.test(w.vintage)) s += `, distilled in ${w.vintage}`;
    const cask = usable(w.cask) ? w.cask : '', fin = usable(w.finish) ? w.finish : '';
    if (cask) s += `, matured in ${lowerFirst(cask)}`;
    if (fin) s += `${cask ? ' and' : ','} finished in ${lowerFirst(fin).replace(/ finish$/i, '')}`;
    s += '.';
    if (w.abv) s += ` Bottled at ${pct(w.abv)}%${w.proof && /united states/i.test(w.country) ? ` (${pct(w.proof)} proof)` : ''}.`;
    if (w.method === 'sourced') s += ' The spirit is sourced from another distillery.';
    return s;
  }

  function facts(w) {
    const out = [];
    if (w.ageText && !w.age && !w.nas) out.push(`Age: ${w.ageText}`);
    if (w.nas) out.push('No age statement');
    if (usable(w.mash)) out.push(`Mash bill: ${w.mash}`);
    if (w.owner) out.push(`Owned by ${w.owner}`);
    if (w.variable) out.push('Each release differs');
    if (w.price) out.push(priceText(w));
    return out;
  }

  function priceText(w) {
    if (!w.price) return '';
    const sym = { GBP: '£', USD: '$', EUR: '€', JPY: '¥' }[String(w.currency).toUpperCase()] || (w.currency ? w.currency + ' ' : '');
    const amt = w.price >= 100 ? Math.round(w.price).toLocaleString('en-GB') : w.price.toFixed(2).replace(/\.00$/, '');
    let d = '';
    const m = /^(\d{4})-(\d{2})/.exec(w.priceDate || '');
    if (m) d = ` (${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][+m[2] - 1]} ${m[1]})`;
    return `Listed at ${sym}${amt}${d}`;
  }

  /* ---------- Search, deck, filters ---------- */
  function haystack(w) {
    if (!w._t) {
      w._t = words(w.title);
      w._h = words([w.brand, w.distillery, w.location, w.country, w.typeLabel, w.type, w.style.join(' '), w.edition, w.group.replace(/_/g, ' ')].join(' '));
    }
  }
  function search(list, q, n = 30) {
    const qs = words(q);
    if (!qs.length) return [];
    const out = [];
    for (const w of list) {
      haystack(w);
      let score = 0, ok = true;
      for (const t of qs) {
        const inTitle = w._t.some((x) => x.startsWith(t)), exactTitle = w._t.includes(t);
        if (inTitle) score += exactTitle ? 3 : 2;
        else if (w._h.some((x) => x.startsWith(t))) score += 1;
        else { ok = false; break; }
      }
      if (ok) out.push([score - w.title.length / 200, w]);
    }
    out.sort((a, b) => b[0] - a[0] || a[1].title.localeCompare(b[1].title));
    return out.slice(0, n).map((x) => x[1]);
  }

  function shuffle(arr, rand = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function typeCounts(list) {
    const c = {};
    for (const w of list) c[w.typeLabel] = (c[w.typeLabel] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, n }));
  }

  /* ---------- Links ---------- */
  function shopQuery(title, w) {
    let q = String(title || '').trim();
    if (w && !/whisk(e)?y|bourbon|scotch|\brye\b/i.test(q)) q += ' ' + (/^(Bourbon|Rye)$/.test(w.type) ? w.type.toLowerCase() : w.spell || 'whisky');
    else if (!w && !/whisk(e)?y|bourbon|scotch|\brye\b/i.test(q)) q += ' whisky';
    return q;
  }
  const shoppingUrl = (q) => 'https://www.google.com/search?udm=28&gl=gb&hl=en-GB&q=' + encodeURIComponent(q);
  // In the installed Android app, open websites as a Chrome tab rather than inside the app window
  function outLink(url, android, installed) {
    if (!android || !installed) return url;
    const m = /^https:\/\/([^#]+)$/.exec(url);
    if (!m) return url;
    return `intent://${m[1]}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  }

  /* ---------- Finding a picture ---------- */
  const NOT_BOTTLE = /\b(cream|liqueur|sauce|bbq|barbecue|fudge|cake|chocolate|coffee|marinade|mustard|ketchup|crisps|biscuits?|cola|glass(es)?|candle|tumbler|gift ?set|label|logo|map|tour|warehouse|sign)\b/i;
  // Does a picture's title describe this bottle? Brand words must all appear, most of the
  // expression's words too, and no other age. Returns a score, or 0 for no match.
  const numify = (list) => list.map((x) => (NUMWORDS.indexOf(x) > 0 ? String(NUMWORDS.indexOf(x)) : x));
  function imageMatch(w, text) {
    const t = numify(words(text));
    if (!t.length || NOT_BOTTLE.test(fold(text))) return 0;
    const brandW = words(w.brand).filter((x) => !STYLE.has(x) && x.length > 1);
    const base = brandW.length ? brandW : words(shortDistillery(w.distillery)).filter((x) => x.length > 1);
    if (!base.length || !base.every((x) => t.includes(x))) return 0;
    const ew = numify(words(w.expr)).filter((x) => !STYLE.has(x) && !SMALL.has(x) && (x.length > 2 || /^\d+$/.test(x)) && !base.includes(x));
    const hit = ew.filter((x) => t.includes(x)).length;
    if (ew.length && hit < Math.ceil(ew.length * 0.6)) return 0;
    const ages = t.map((x) => (/^\d{1,2}$/.test(x) ? +x : null)).filter((x) => x != null && x >= 3 && x <= 60);
    if (w.age) { if (!ages.includes(w.age)) return 0; }
    else if (ages.length && !hasNumber(w.expr)) return 0;
    const extra = t.filter((x) => !base.includes(x) && !ew.includes(x) && !STYLE.has(x) && !/^\d+$/.test(x) && !SMALL.has(x) && x.length > 2).length;
    return 10 + hit * 3 + (w.age ? 3 : 0) - Math.min(6, extra);
  }
  function bestMatch(w, candidates) {   // candidates: [{ text, url, ... }]
    let best = null, bs = 0;
    for (const c of candidates) { const s = imageMatch(w, c.text); if (s > bs) { bs = s; best = c; } }
    return best;
  }
  const imageQuery = (w) => [w.brand, w.expr, w.age ? `${w.age} year` : ''].filter(Boolean).join(' ').replace(/\s*\([^)]*\)/g, '').slice(0, 90);

  /* ---------- Snapshots kept with meets and the wish list ---------- */
  function sub(w) {
    const bits = [w.typeLabel === 'Other' ? '' : w.typeLabel, w.abv ? `${pct(w.abv)}%` : ''].filter(Boolean);
    return bits.join(', ');
  }
  function snap(w, image) {
    return { title: w.title, edition: w.edition || '', sub: sub(w), image: image || w.image || '', type: w.typeLabel, info: w.info || '', q: shopQuery(w.title, w) };
  }

  /* ---------- Scores ---------- */
  function summarise(list) {
    const v = list.map((s) => +s.score).filter((x) => isFinite(x));
    if (!v.length) return { n: 0, avg: null, min: null, max: null, spread: null };
    const sum = v.reduce((a, b) => a + b, 0);
    const min = Math.min(...v), max = Math.max(...v);
    return { n: v.length, avg: Math.round((sum / v.length) * 10) / 10, min, max, spread: Math.round((max - min) * 10) / 10 };
  }
  // Drams of one meet, best first
  function rankDrams(lineup, scores) {
    return lineup.map((d) => ({ dram: d, ...summarise(scores.filter((s) => s.dramId === d.id)) }))
      .sort((a, b) => (a.avg == null) - (b.avg == null) || (b.avg || 0) - (a.avg || 0) || (a.spread || 0) - (b.spread || 0));
  }
  // Every revealed dram across meets, for the cabinet
  function cabinet(meets, scores) {
    const out = [];
    for (const m of meets) {
      if (!m.revealed) continue;
      for (const d of m.lineup || []) {
        const st = summarise(scores.filter((s) => s.meetId === m.id && s.dramId === d.id));
        if (st.n) out.push({ meet: m, dram: d, ...st });
      }
    }
    return out;
  }
  // How full the glass is: fills over the last four weeks before a meet
  function fill(at, now) {
    const d = (at - now) / 864e5;
    if (d <= 0) return 0.92;
    return Math.max(0.1, Math.min(0.92, 0.92 - (d / 28) * 0.82));
  }
  const clampScore = (x) => { const v = Math.round(parseFloat(x) * 2) / 2; return isFinite(v) ? Math.max(0, Math.min(10, v)) : null; };

  const api = { parseCSV, toRecords, normalise, catalogue, story, facts, priceText, search, shuffle, typeCounts, typeLabel,
    shopQuery, shoppingUrl, outLink, imageMatch, bestMatch, imageQuery, snap, sub, summarise, rankDrams, cabinet, fill, clampScore,
    words, fnv, httpsUrl, ageYears, shortDistillery, styleWords };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Core = api;
})(typeof self !== 'undefined' ? self : this);
