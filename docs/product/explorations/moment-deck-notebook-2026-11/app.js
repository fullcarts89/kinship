/* Kinship · Moment Deck × Notebook — clickable prototype.
   Design prototype only: no network, no storage of anything typed, fictional data (data.js). */

/* ───────── helpers ───────── */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const P = (id) => PEOPLE[id];
const I = {
  msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  pen: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>', chevR: '<path d="m9 18 6-6-6-6"/>', chevD: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  sliders: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  card: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  words: '<path d="M4 7h16"/><path d="M4 12h10"/><path d="M4 17h13"/>',
};
const ic = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function dateOf(s) { // "Sun, Nov 15" · "Sun, Dec 14, 2025" → Date
  const m = /([A-Z][a-z]{2}) (\d{1,2})(?:, (\d{4}))?/.exec(s || ''); if (!m) return null;
  return new Date(+(m[3] || 2026), MONTHS[m[1]], +m[2]);
}
const dayDate = () => dateOf(DAYS[S.day].short);
const asList = (a) => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];

/* ───────── state ───────── */
const fresh = () => ({
  day: 'mon', dense: false, annot: false, rm: false,
  stack: [{ s: 'today' }], sheet: null, tell: null, rv: null, handoff: null, toast: null, anim: null,
  j2: null, extra: [], notesExtra: {}, convos: [], intents: [], done: new Set(), dismissed: new Set(),
  edits: {}, gone: new Set(), seen: new Set(), pwhen: {}, rc: null, ideasOpen: false, ptab: {}, pq: '', ring: null,
});
let S = fresh();
let J = null; // active journey id
const cur = () => S.stack[S.stack.length - 1];

/* ───────── memory model (keeps the canonical semantics: source per line, user edit wins, replaces/known) ───────── */
function j2Mem() {
  if (!S.j2) return [];
  return S.j2.items.filter((it) => it.st === 'kept').map((it) => ({ ...it, src: 'n_j2', text: it.text, when: it.when || (it.dateTok ? (it.date === 'exact' ? it.dateAlt : null) : null) }));
}
function allMem() {
  let list = [...S.extra, ...S.intents, ...j2Mem(), ...MEM];
  const superseded = new Map(); const resolved = new Set();
  list.forEach((m) => { if (m.replaces) superseded.set(m.replaces, m.id); if (m.supersedes) superseded.set(m.supersedes, m.id); if (m.resolves) resolved.add(m.resolves); });
  return list.filter((m) => !S.gone.has(m.id) && !superseded.has(m.id)).map((m) => {
    const o = { ...m };
    if (S.edits[m.id]) { o.was = o.text; o.text = S.edits[m.id]; o.edited = true; }
    if (m.replaces) { const old = MEM.find((x) => x.id === m.replaces); if (old) o.was = old.text; }
    if (resolved.has(m.id)) o.resolvedNow = true;
    if (m.kind === 'promise' && S.done.has(m.id)) o.kept = true;
    if (S.pwhen[m.id]) o.whenLabel = S.pwhen[m.id];
    return o;
  });
}
const memOf = (p) => allMem().filter((m) => m.p === p);
const findMem = (id) => allMem().find((m) => m.id === id) || [...MEM, ...j2Mem(), ...S.extra, ...S.intents].find((m) => m.id === id);
function noteOf(id) {
  if (id === 'n_j2') return { date: 'Mon, Nov 2', long: 'Monday, November 2', text: S.j2 ? S.j2.text : J2_TEXT };
  return NOTES[id] || S.notesExtra[id];
}
function srcLabel(m) {
  if (!m) return '';
  if (m.contacts) return 'From Contacts';
  if (m.kind === 'convo') return 'You told Kinship';
  const n = noteOf(m.src); if (!n) return '';
  const base = m.edited ? `Edited by you · from your note, ${n.date.replace(/^[A-Z][a-z]{2}, /, '')}` : (m.saved ? `You saved this · ${n.date.replace(/^[A-Z][a-z]{2}, /, '')}` : `From your note · ${n.date.replace(/^[A-Z][a-z]{2}, /, '')}`);
  return base;
}
function highlight(text, spans, cls = 'k', attr = '') {
  // wraps each exact span; spans: [{span, id, extra}]
  let out = esc(text);
  spans.filter((s) => s.span && text.includes(s.span)).sort((a, b) => b.span.length - a.span.length).forEach((s) => {
    const e = esc(s.span);
    out = out.replace(e, `<span class="${cls}${s.sens ? ' sens' : ''}" data-a="line" data-id="${s.id}" ${attr}>${e}</span>`);
  });
  return out;
}

/* ───────── visuals ───────── */
function face(pid, size = 48, extra = '') {
  const p = P(pid);
  const inner = p.photo ? `<img class="ph" src="img/${p.photo}" alt="">` : `<span class="ini" style="font-size:${Math.round(size * .42)}px">${esc(p.first[0])}</span><img class="fb" src="img/${p.bloom}" alt="">`;
  return `<span class="face ${extra}" style="width:${size}px;height:${size}px;--pc:${p.color};--po:${p.onColor}">${inner}</span>`;
}
const pc = (pid) => `--pc:${P(pid).color};--po:${P(pid).onColor}`;

/* ───────── Today model (rules from today-eligibility.md, unchanged) ───────── */
const HERO = {
  ben_follow: { p: 'ben', style: 'photo', photo: 'p-ben-lake.jpg', when: 'Yesterday · Sun, Nov 1', headline: 'How did it go for Ben?', mem: 'Ben ran the New York Marathon on Sun, Nov 1.', quote: '“He’s hoping to break four hours.”', src: 'n_ben_oct8', why: 'It was yesterday.', primary: 'Ask how it went', about: 'the marathon', mentions: ['ben_chicago', 'ben_theo'], ideas: 'ben', kindTag: 'built · event follow-up' },
  josh_up: { p: 'josh', style: 'photo', photo: 'p-josh.jpg', when: 'Tomorrow · Tue, Nov 3', headline: 'Josh’s interview is tomorrow.', mem: 'Josh has a final-round interview at Figma on Tue, Nov 3 at 10:00.', quote: '“He’s weirdly calm about it.”', src: 'n_josh_oct20', why: 'It’s tomorrow.', primary: 'Wish him luck', about: 'the interview', mentions: ['josh_wb'], ideas: 'josh', kindTag: 'built · upcoming event' },
  elena_prom: { p: 'elena', style: 'tender', when: 'Today · Wed, Nov 4', headline: 'You said you’d check in on Elena after her surgery.', mem: 'Elena’s knee surgery was on Tue, Nov 3.', quote: '“I want to check in after — maybe bring dinner Thursday.”', src: 'n_elena_oct26', why: 'Her surgery was yesterday.', primary: 'Message Elena', about: 'checking in after her surgery', mentions: ['elena_drive'], ideas: 'elena', sens: true, kindTag: 'alpha · promise moment · decision: hard-time styling' },
  sam_prom: { p: 'sam', style: 'photo', photo: 'p-sam-bowl.jpg', when: 'Tonight · Fri, Nov 6', headline: 'You said you’d take Sam out to celebrate.', mem: 'Sam got the promotion.', quote: '“Maybe the Thai place she loves.”', src: 'n_j2', why: 'You said Friday.', primary: 'Message Sam', did: true, about: 'celebrating the promotion', mentions: ['j_sam_thai', 'sam_over'], ideas: 'sam', kindTag: 'alpha · promise moment' },
  maya_bday: { p: 'maya', style: 'photo', photo: 'p-maya-birthday.jpg', when: 'Saturday · Sat, Nov 7', headline: 'Maya’s birthday is Saturday.', mem: 'Maya’s birthday.', src: 'contacts', why: 'It’s on Saturday.', primary: 'Message Maya', about: 'her birthday', mentions: ['maya_book', 'maya_soup'], ideas: 'maya' },
  rosa_rav: { p: 'rosa', style: 'photo', photo: 'p-rosa.jpg', when: 'Sunday · Sun, Nov 8', headline: 'Ravioli with Rosa on Sunday.', mem: 'Rosa is teaching you to make ravioli on Sun, Nov 8.', src: 'n_rosa_oct4', why: 'It’s on Sunday.', primary: 'Call Rosa', call: true, about: 'Sunday', mentions: ['rosa_flour'], ideas: 'rosa' },
  josh_thu: { p: 'josh', style: 'photo', photo: 'p-josh.jpg', when: 'Thursday · Thu, Nov 5', headline: 'Josh’s interview is Thursday.', mem: 'Josh’s interview moved to Thu, Nov 5 at 10:00.', src: 'n_j2', why: 'It’s on Thursday.', primary: 'Wish him luck', about: 'the interview', mentions: ['josh_wb'], ideas: 'josh' },
  leo_move: { p: 'leo', style: 'photo', photo: 'p-leo.jpg', when: 'Sunday · Sun, Nov 15', headline: 'Leo moves to Pilsen on Sunday.', mem: 'Leo signed the lease on a place in Pilsen and moves in on Sun, Nov 15.', src: 'n_leo_oct30', why: 'It’s on Sunday.', primary: 'Message Leo', about: 'the move', mentions: ['leo_practice', 'leo_speak'], ideas: 'leo' },
};
const CARD_WHEN = {
  maya_bday: { mon: 'Saturday', wed: 'Saturday', fri: 'Tomorrow' }, rosa_rav: { mon: 'Sunday', wed: 'Sunday', fri: 'Sunday' },
  josh_up: { mon: 'Tomorrow' }, josh_thu: { mon: 'Thursday', wed: 'Tomorrow' }, leo_move: { quiet: 'Sunday' },
};
const CARD_LINE = { maya_bday: 'Maya’s birthday', rosa_rav: 'Ravioli with Rosa', josh_up: 'Josh’s interview, 10:00', josh_thu: 'Josh’s interview, 10:00', leo_move: 'Leo moves to Pilsen' };

function todayModel() {
  const d = S.day;
  let heroes = [], cards = [];
  if (d === 'mon') { heroes = ['ben_follow', S.j2 ? null : 'josh_up'].filter(Boolean); cards = [S.j2 ? 'josh_thu' : 'josh_up', 'maya_bday', 'rosa_rav']; }
  if (d === 'wed') { heroes = ['elena_prom']; cards = ['josh_thu', 'maya_bday', 'rosa_rav']; }
  if (d === 'fri') { heroes = S.done.has('j_sam_promise') ? [] : ['sam_prom']; cards = ['maya_bday', 'rosa_rav']; }
  if (d === 'quiet') { cards = ['leo_move']; }
  const hero = heroes.find((h) => !S.dismissed.has(h)) || null;
  cards = cards.filter((c) => c !== hero);
  return { hero, cards };
}
function intentLines() {
  return S.intents.filter((i) => !S.done.has(i.id));
}

/* ───────── render: Today ───────── */
function renderToday() {
  const day = DAYS[S.day];
  if (S.day === 'first') return renderFirst();
  const { hero, cards } = todayModel();
  let h = `<div class="t-head"><div><div class="cap" style="color:var(--ink2)">${day.long}</div><div class="greet">${day.greet}</div></div></div>`;
  h += renderRC('today');
  if (S.j2 && S.j2.unanswered && S.day === 'mon') h += '';
  if (hero) h += `<div class="deck">${posterHTML(hero)}</div>`;
  else if (!S.rc) h += `<div class="quiet stagger"><h2 class="dsp">Nothing needs you today.</h2><div class="ser">Kinship will bring things back when they matter.</div><img class="bud" src="img/g-a-bud.png" alt=""></div>`;
  const quietLines = [];
  if (S.j2 && S.day === 'mon' && S.j2.keptLine) quietLines.push(`<button class="mini" style="${pc('priya')};background:#fff;color:var(--ink)" data-a="push" data-s="source" data-id="n_j2"><span style="display:flex;gap:-8px">${face('priya', 40, 'ring')}${face('sam', 40, 'ring')}${face('josh', 40, 'ring')}</span><span class="when" style="font-size:20px">Kept</span><span class="line">for ${asList(S.j2.keptLine)}</span><span class="src">From your note · today</span></button>`);
  if (S.j2 && S.j2.waiting) quietLines.push(`<button class="mini quietq" data-a="reopen-review"><span class="cap" style="color:var(--held)">A question</span><span class="when" style="font-size:22px">Which Sam?</span><span class="line">From your note this morning.</span></button>`);
  intentLines().forEach((it) => { if (S.day !== 'mon' || it.whenLabel === 'Tomorrow') quietLines.push(intentCard(it)); });
  const all = [...quietLines, ...cards.map(cardHTML)];
  if (all.length) {
    h += `<div class="sect"><span class="cap">${hero ? 'Also coming up' : 'Coming up'}</span></div><div class="row-scroll" data-tag="proposed · quiet lines as a deck">${all.join('')}<div class="mini end"><img src="img/g-a-bud.png" alt="" style="width:46px;margin-bottom:10px"><div class="ser">That’s today.</div><div style="font-size:13.5px;margin-top:6px">Nothing else is waiting.</div></div></div>`;
  }
  return `<div class="scr with-dock">${h}<div style="height:12px"></div></div>${dock('today')}`;
}
function intentCard(it) {
  return `<button class="mini" style="${pc(it.p)};background:#FFF6EE;color:var(--ink);box-shadow:inset 3px 0 0 var(--orange)" data-a="person" data-p="${it.p}">${face(it.p, 44)}<span class="when" style="font-size:20px">${esc(it.whenLabel)}</span><span class="line">${esc(it.text)}</span><span class="src yours">You said you’d</span></button>`;
}
function posterHTML(id) {
  const m = HERO[id]; const p = P(m.p);
  const tag = `data-tag="${m.kindTag || 'built · moment'}"`;
  const acts = `<div class="acts">${m.did ? `<button class="b b-lime b-sm" data-a="did" data-id="${id}">I did this</button><button class="b b-ghost-d b-sm" data-a="handoff" data-p="${m.p}" data-about="${esc(m.about)}">${esc(m.primary)}</button>` : `<button class="b ${m.style === 'tender' ? 'b-ink' : 'b-lime'} b-sm" data-a="handoff" data-p="${m.p}" data-about="${esc(m.about)}" ${m.call ? 'data-call="1"' : ''}>${ic(m.call ? 'phone' : 'msg')}${esc(m.primary)}</button><button class="b ${m.style === 'tender' ? 'b-ghost' : 'b-ghost-d'} b-sm" data-a="notnow" data-id="${id}">Not now</button>`}</div>`;
  const src = `<span class="src ${m.style === 'photo' ? 'on-dark' : ''}">${m.src === 'contacts' ? 'From Contacts' : 'From your note · ' + noteOf(m.src).date.replace(/^[A-Z][a-z]{2}, /, '')}</span>`;
  if (m.style === 'tender') {
    return `<div class="poster tender" data-a="moment" data-id="${id}" id="hero" ${tag}><img class="soft" src="img/${p.bloom}" alt=""><div class="ptop"><span class="chip ghost">${esc(m.when)}</span></div><div class="body"><div class="who">${face(m.p, 44)}<span class="cap" style="color:var(--ink2)">${esc(p.name)}</span></div><h2>${esc(m.headline)}</h2><p class="mem">${esc(m.why)}</p><p class="q">${esc(m.quote)}</p>${src}${acts}</div></div>`;
  }
  const photo = m.photo || p.photo;
  const bg = photo ? `<img class="ph" src="img/${photo}" alt="">` : `<span class="initial">${esc(p.first[0])}</span><img class="bloomxl" src="img/${p.bloom}" alt="">`;
  return `<div class="poster ${photo ? '' : 'type'}" style="${pc(m.p)}" data-a="moment" data-id="${id}" id="hero" ${tag}>${bg}<div class="scrim"></div>${photo ? `<img class="bloom" src="img/${p.bloom}" alt="">` : ''}<div class="ptop"><span class="chip lime">${esc(m.when)}</span></div><div class="body"><h2 class="dsp">${esc(m.headline)}</h2><p class="mem">${esc(m.mem)}</p>${m.quote ? `<p class="q">${esc(m.quote)}</p>` : ''}${src}${acts}</div></div>`;
}
function cardHTML(id) {
  const m = HERO[id]; const p = P(m.p);
  const when = (CARD_WHEN[id] || {})[S.day] || m.when.split(' · ')[0];
  return `<button class="mini" style="${pc(m.p)}" data-a="moment" data-id="${id}" id="card-${id}"><img class="fl" src="img/${p.bloom}" alt="">${face(m.p, 64, 'ring')}<span class="when">${esc(when)}</span><span class="line">${esc(CARD_LINE[id])}</span><span class="src" style="color:inherit">${m.src === 'contacts' ? 'From Contacts' : 'From your note'}</span></button>`;
}
function renderFirst() {
  const day = DAYS.first;
  return `<div class="scr with-dock first"><div class="t-head"><div><div class="cap" style="color:var(--ink2)">${day.long}</div><div class="greet">Welcome, Nora.</div></div></div>
  <div class="card stagger" data-tag="built · first use; proposed · visual"><img class="fb" src="img/b-peony.png" alt=""><h2 class="dsp">This is where Kinship brings things back.</h2><div class="ser">Tell it one thing someone shared with you. It keeps your words, and brings them back when they matter.</div>
  <div class="prompts"><button data-a="tell" data-p="ben">What’s coming up for Ben?</button><button data-a="tell" data-p="josh">Something Josh is into</button><button data-a="tell">Something you said you’d do</button></div></div>
  <div class="sect"><span class="cap">Already worth knowing</span></div><div class="row-scroll"><button class="mini" style="${pc('maya')}" data-a="person" data-p="maya">${face('maya', 64, 'ring')}<span class="when">Saturday</span><span class="line">Maya’s birthday</span><span class="src" style="color:inherit">From Contacts</span></button><div class="mini end"><div class="ser">That’s everything so far.</div><div style="font-size:13.5px;margin-top:6px">The more you tell, the more comes back.</div></div></div></div>${dock('today')}`;
}
function dock(tab) {
  return `<div class="dock"><button class="tellpill" data-a="tell" id="tellpill" data-tag="built · Tell, always one tap">${ic('pen')}Tell Kinship something…</button><div class="bar" role="tablist"><button class="${tab === 'today' ? 'on' : ''}" data-a="tab" data-s="today">Today</button><button class="${tab === 'people' ? 'on' : ''}" data-a="tab" data-s="people" id="tab-people">People</button></div></div>`;
}

/* return check, on Today or on the person's page */
function renderRC(where, pid) {
  const r = S.rc; if (!r) return '';
  if (where === 'person' && r.p !== pid) return '';
  const p = P(r.p);
  if (r.step === 'ask') return `<div class="panel" id="rc" data-tag="built · return check">${faceRow(r.p)}<div class="ser">Did you reach ${esc(p.first)} about ${esc(r.about)}?</div><div class="row"><button class="b b-ink b-sm" data-a="rc-yes">Yes</button><button class="b b-ghost b-sm" data-a="rc-no">Not yet</button></div></div>`;
  if (r.step === 'plan') return `<div class="panel" id="rc" data-tag="alpha · SUA-1 outcome question (content-free)">${faceRow(r.p)}<div class="ser">${esc(r.planAsk)}</div><div class="row"><button class="b b-ink b-sm" data-a="rc-plan" data-v="yes">Yes</button><button class="b b-ghost b-sm" data-a="rc-plan" data-v="no">Not yet</button></div><div class="fine" style="margin-top:10px">Kinship records only the kind of thing you did, never what you wrote.</div></div>`;
  if (r.step === 'remember') return `<div class="panel" id="rc" data-tag="built · anything worth remembering">${faceRow(r.p)}<div class="ser">${r.kept ? 'Nice. ' : ''}Anything worth remembering from ${esc(r.withWhat || 'talking with ' + p.first)}?</div><div class="row"><button class="b b-ink b-sm" data-a="rc-tell" id="rc-tell">${ic('pen')}Tell Kinship</button><button class="b b-ghost b-sm" data-a="rc-nothing">Nothing</button></div><div class="ack">${ic('sprout')}<span>In ${esc(p.first)}’s notebook: ${esc(r.trail)}</span></div></div>`;
  return '';
}
const faceRow = (pid) => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">${face(pid, 34)}<span class="cap" style="color:var(--ink2)">${esc(P(pid).name)}</span></div>`;

/* ───────── render: Moment (expanded) ───────── */
function renderMoment(t) {
  const m = HERO[t.id]; const p = P(m.p);
  const photo = m.style === 'tender' ? null : (m.photo || p.photo);
  const media = m.style === 'tender' ? `<div class="m-media tender"><img class="bloomxl" src="img/${p.bloom}" alt=""></div>` :
    photo ? `<div class="m-media"><img class="ph" src="img/${photo}" alt=""></div>` : `<div class="m-media" style="${pc(m.p)}"><span class="initial">${esc(p.first[0])}</span><img class="bloomxl" src="img/${p.bloom}" alt=""></div>`;
  const ideas = (IDEAS[m.ideas] || []).filter((i) => i.ground.every((g) => findMem(g) || g === 'maya_bday'));
  const grounds = new Set(ideas.flatMap((i) => i.ground));
  const mentions = (m.mentions || []).filter((id) => !grounds.has(id)).map(findMem).filter(Boolean).slice(0, 2);
  const srcBtn = m.src === 'contacts' ? `<div class="srcrow" style="cursor:default"><span class="src contacts">From Contacts</span></div>` :
    `<button class="srcrow" data-a="push" data-s="source" data-id="${m.src}" data-focus="${t.id}" id="m-src" data-tag="built · source, one tap"><span class="src">From your note · ${esc(noteOf(m.src).date)}</span>${ic('chevR')}</button>`;
  let h = `<div class="scr" id="mscr">${media}<button class="iconbtn solid m-close" data-a="back" aria-label="Close">${ic('x')}</button>
  <div class="m-body stagger"><div><div class="cap" style="color:var(--ink2)">${esc(m.when)}</div><h1 class="${m.style === 'tender' ? 'serh' : 'dsp'}">${esc(m.headline)}</h1></div>
  <div><p class="m-mem">${esc(m.mem)}</p>${m.quote ? `<p class="m-q">${esc(m.quote)}</p>` : ''}<p class="why">${esc(m.why)}${m.sens ? ' · Private. You said yes to keeping this.' : ''}</p>${srcBtn}</div>
  ${mentions.length ? `<div><div class="lbl"><span class="dot" style="background:var(--lav)"></span>You could mention</div>${mentions.map((x) => `<div class="mention"><div class="ser">${esc(x.text)}</div><button class="src" data-a="line" data-id="${x.id}">${esc(srcLabel(x))}</button></div>`).join('')}</div>` : ''}
  <div class="acts2">${m.did ? `<button class="b b-lime" data-a="did" data-id="${t.id}" style="flex:1">${ic('check')}I did this</button>` : ''}<button class="b ${m.did ? 'b-ghost' : 'b-ink'}" data-a="handoff" data-p="${m.p}" data-about="${esc(m.about)}" ${m.call ? 'data-call="1"' : ''} id="m-primary" data-tag="built · hand-off, never sends">${ic(m.call ? 'phone' : 'msg')}${esc(m.did ? 'Message' : m.primary)}</button>${m.call ? '' : `<button class="b b-ghost" data-a="handoff" data-p="${m.p}" data-about="${esc(m.about)}" data-call="1" aria-label="Call">${ic('phone')}</button>`}</div>
  ${ideas.length ? `<div><button class="ideas-tog" data-a="ideas-tog" id="ideas-tog" data-tag="proposed · explicit, never on the card" aria-expanded="${S.ideasOpen}"><span class="leaf">${ic('sprout')}</span><span class="t"><b>Ideas for showing up</b><small>From what you’ve told Kinship about ${esc(p.first)}</small></span>${ic(S.ideasOpen ? 'chevD' : 'chevR')}</button>
  ${S.ideasOpen ? `<div class="ideas">${ideas.map((i, n) => ideaHTML(m.p, i, n)).join('')}</div>` : ''}</div>` : ''}
  <div class="foot-links"><button class="lnk" data-a="person" data-p="${m.p}" id="m-person">Open ${esc(p.first)}’s notebook ${ic('chevR')}</button><button class="lnk" data-a="notnow" data-id="${t.id}">Not now</button></div></div></div>`;
  return h;
}
const CAT_COLOR = { 'A gesture': '#FFD6EA', 'Celebrate': '#FFD6EA', 'Time together': '#DCEBFF', 'Practical help': '#FFE9DA', 'Follow through': '#FFF2B8', 'Message': '#E9F7CF', 'Check in': '#E9F7CF', 'Call': '#E9F7CF' };
function ideaHTML(pid, i, n) {
  const g = i.ground.map(findMem).filter(Boolean)[0];
  const because = g ? (g.contacts ? 'Her birthday is in Contacts.' : `“${noteSpan(g)}”`) : 'No reason needed.';
  return `<button class="idea" style="--cc:${CAT_COLOR[i.cat] || '#E9F7CF'};animation-delay:${n * 60}ms" data-a="assist" data-p="${pid}" data-id="${i.id}" id="idea-${i.id}"><span class="catc">${esc(i.cat)}</span><span class="chev">${ic('chevR')}</span><h4>${esc(i.title)}</h4><div class="because">${esc(because)}</div>${g && !g.contacts ? `<div class="src">${esc(srcLabel(g))}</div>` : ''}</button>`;
}
function noteSpan(m) { // the user's own words behind a memory, for grounding
  if (!m) return '';
  const n = noteOf(m.src); if (!n || !m.span) return m.text;
  const s = m.span; return s.charAt(0).toUpperCase() + s.slice(1) + (/[.!?]$/.test(s) ? '' : '.');
}

/* ───────── render: People ───────── */
function peopleIds() {
  let ids = Object.keys(PEOPLE).filter((id) => !P(id).filler || P(id).typical || S.dense);
  if (S.day === 'first') ids = ['ben', 'josh', 'maya'];
  return ids.sort((a, b) => P(a).first.localeCompare(P(b).first));
}
function comingFor(pid) { // soonest dated thing in the next 14 days (time only)
  const d0 = dayDate(); let best = null;
  const cands = memOf(pid).filter((m) => m.when && (m.now === 'coming')).map((m) => ({ d: dateOf(m.when), label: m.when.split(' · ')[0], sens: m.sens }));
  if (P(pid).birthday) cands.push({ d: dateOf(P(pid).birthday), label: P(pid).birthday });
  cands.forEach((c) => { if (!c.d || c.sens) return; const diff = (c.d - d0) / 864e5; if (diff >= 0 && diff <= 14 && (!best || c.d < best.d)) best = c; });
  return best;
}
function renderPeople() {
  const q = S.pq.trim().toLowerCase();
  let h = `<div class="p-head"><h1 class="dsp">People</h1><button class="iconbtn" aria-label="Add someone">${ic('plus')}</button><button class="iconbtn" aria-label="Settings">${ic('sliders')}</button></div>
  <label class="search" data-tag="alpha · Ask v1 word match; proposed · one field">${ic('search')}<input id="pq" placeholder="Find someone, or something you told Kinship" value="${esc(S.pq)}" autocomplete="off"></label>`;
  const ids = peopleIds();
  if (q) {
    const ppl = ids.filter((id) => P(id).name.toLowerCase().includes(q));
    const hits = allMem().filter((m) => ids.includes(m.p) && m.kind !== 'convo' && (m.text.toLowerCase().includes(q) || (noteOf(m.src)?.text || '').toLowerCase().includes(q)) && !P(m.p).name.toLowerCase().includes(q));
    const disp = (m) => { const n = noteOf(m.src); return !m.text.toLowerCase().includes(q) && n ? clip(n.text, q) : m.text; };
    const seen = new Set(); const uniq = hits.filter((m) => { const k = disp(m); if (seen.has(k)) return false; seen.add(k); return true; });
    h += `<div class="hits">`;
    if (ppl.length) h += `<div class="lbl">People</div><div class="grid" style="padding:0">${ppl.map(tileHTML).join('')}</div>`;
    if (uniq.length) h += `<div class="lbl">In what you told Kinship</div>${uniq.slice(0, 8).map((m) => { const n = noteOf(m.src); const inNote = !m.text.toLowerCase().includes(q) && n; const show = inNote ? n.text : m.text; return `<button class="hit" data-a="hit" data-p="${m.p}" data-id="${m.id}" id="hit-${m.id}">${face(m.p, 40)}<span><span class="ser">${markQ(inNote ? clip(show, q) : show, q)}</span><span class="src" style="display:flex">${esc(P(m.p).first)} · ${esc(inNote ? 'Your words, ' + n.date : srcLabel(m))}</span></span></button>`; }).join('')}`;
    if (!ppl.length && !uniq.length) h += `<div class="ser" style="font-size:19px;color:var(--ink2);padding:20px 6px">Nothing you’ve told Kinship mentions “${esc(S.pq)}”.</div>`;
    h += `</div>`;
    return `<div class="scr with-dock">${h}</div>${dock('people')}`;
  }
  const band = ids.map((id) => ({ id, c: comingFor(id) })).filter((x) => x.c).sort((a, b) => a.c.d - b.c.d);
  if (band.length) h += `<div class="sect"><span class="cap">Coming up for them</span></div><div class="band" data-tag="proposed · ordered by date only (T4)">${band.map(({ id, c }) => `<button class="bandp" data-a="person" data-p="${id}">${face(id, 84, 'blob')}<b>${esc(P(id).first)}</b><small>${esc(relDay(c.d, c.label))}</small></button>`).join('')}</div>`;
  h += `<div class="sect"><span class="cap" style="">Everyone</span></div><div class="grid" data-tag="proposed · equal tiles, A–Z, no upkeep (T4)">`;
  let last = '';
  ids.forEach((id) => { const L = P(id).first[0]; if (S.dense && L !== last) { h += `<div class="letter">${L}</div>`; last = L; } h += tileHTML(id); });
  h += `</div>`;
  if (S.dense) h += `<div class="az">${'ABCDEFGHIJKLMNOPRSTWYZ'.split('').map((l) => `<span>${l}</span>`).join('')}</div>`;
  return `<div class="scr with-dock">${h}<div style="height:20px"></div></div>${dock('people')}`;
}
function relDay(d, label) {
  const diff = Math.round((d - dayDate()) / 864e5);
  if (diff === 0) return 'Today'; if (diff === 1) return 'Tomorrow';
  if (diff < 7) return label.split(',')[0];
  return label.replace(/^[A-Z][a-z]{2}, /, '');
}
const clip = (t, q) => { const i = t.toLowerCase().indexOf(q); const s = Math.max(0, t.lastIndexOf('.', i) + 1); let e = t.indexOf('.', i + q.length); if (e < 0) e = t.length; return t.slice(s, e + 1).trim(); };
const markQ = (t, q) => esc(t).replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
function tileHTML(id) {
  const p = P(id);
  const line = p.rel || (p.birthday ? 'Birthday ' + p.birthday.replace(/^[A-Z][a-z]{2}, /, '') : 'Added from Contacts');
  const art = p.photo ? `<img class="ph" src="img/${p.photo}" alt="">` : `<span class="ini">${esc(p.first[0])}</span><img class="fb" src="img/${p.bloom}" alt="">`;
  return `<button class="tile" data-a="person" data-p="${id}" id="tile-${id}"><span class="art" style="${pc(id)}">${art}</span><b>${esc(p.first === 'Sam' ? p.name : p.first)}</b><small>${esc(line)}</small></button>`;
}

/* ───────── render: Person (living notebook) ───────── */
function renderPerson(t) {
  const pid = t.p; const p = P(pid);
  const tab = S.ptab[pid] || t.tab || 'now';
  const mems = memOf(pid);
  const sparse = p.sparse || S.day === 'first' || (!mems.some((m) => !m.contacts) && !p.birthday);
  const media = p.photo && S.day !== 'first' ? `<div class="pp-media"><img class="ph" src="img/${p.photo}" alt=""><img class="fb2" src="img/${p.bloom}" alt=""><div class="fade"></div></div>`
    : `<div class="pp-media" style="${pc(pid)}"><span class="initial">${esc(p.first[0])}</span><img class="bloomxl" src="img/${p.bloom}" alt=""><div class="fade"></div></div>`;
  let h = `<div class="scr with-dock" id="pscr">${media}<button class="iconbtn solid pp-back" data-a="back" aria-label="Back">${ic('chevL')}</button>
  <div class="pp-name"><h1 class="dsp">${esc(p.name.split(' ')[0])}<br>${esc(p.name.split(' ').slice(1).join(' '))}</h1>${p.rel && S.day !== 'first' ? `<button class="pp-rel" data-a="${p.relSrc ? 'push' : ''}" data-s="source" data-id="${p.relSrc || ''}">${esc(p.rel)}</button>` : ''}</div>
  <div class="pp-acts"><button class="b b-ink b-sm" data-a="handoff" data-p="${pid}" data-about="" data-page="1">${ic('msg')}Message</button><button class="b b-ghost b-sm" data-a="handoff" data-p="${pid}" data-call="1" data-page="1">${ic('phone')}Call</button><button class="b b-ghost b-sm" data-a="tell" data-p="${pid}">${ic('pen')}Tell</button></div>`;
  h += renderRC('person', pid).replace('class="panel"', 'class="panel" style="margin-top:18px"');
  if (sparse) {
    h += `<div class="empty-inv stagger" data-tag="built · empty page invites a first Tell" style="margin-top:22px"><div class="ser">What you tell Kinship about ${esc(p.first)} will be here: what’s going on with ${p.pron}, what’s coming up, what you said you’d do.</div>
    ${p.birthday ? `<div class="cu" style="margin-top:12px;cursor:default"><span class="d"><b>${p.birthday.slice(5, 8).toUpperCase()}</b><span>${p.birthday.split(' ')[2]}</span></span><span><span class="ser">${esc(p.first)}’s birthday</span><br><span class="src contacts">From Contacts</span></span></div>` : ''}
    <button class="b b-ink" style="margin-top:18px" data-a="tell" data-p="${pid}">${ic('pen')}Tell Kinship about ${esc(p.first)}</button>
    <p class="fine">For example: what ${p.pron === 'him' ? 'he’s' : p.pron === 'her' ? 'she’s' : 'they’re'} looking forward to, something ${p.pron === 'him' ? 'he' : p.pron === 'her' ? 'she' : 'they'} told you, or something you said you’d do. Ideas for showing up appear once there’s something to go on.</p></div>`;
    return h + `</div>${dock('people')}`;
  }
  h += `<div class="segc" role="tablist" data-tag="proposed · three lenses, no repeated sections"><button class="${tab === 'now' ? 'on' : ''}" data-a="ptab" data-p="${pid}" data-v="now">Now</button><button class="${tab === 'pages' ? 'on' : ''}" data-a="ptab" data-p="${pid}" data-v="pages" id="ptab-pages">Pages</button><button class="${tab === 'knows' ? 'on' : ''}" data-a="ptab" data-p="${pid}" data-v="knows">Knows</button></div>`;
  if (tab === 'now') h += personNow(pid, mems);
  if (tab === 'pages') h += personPages(pid, t);
  if (tab === 'knows') h += personKnows(pid, mems);
  return h + `<div style="height:20px"></div></div>${dock('people')}`;
}
function personNow(pid, mems) {
  const p = P(pid); const d0 = dayDate();
  const future = (m) => { const d = dateOf(m.when); return !d || d >= d0; };
  let coming = mems.filter((m) => m.now === 'coming' && m.when && future(m));
  if (p.birthday && (dateOf(p.birthday) - d0) / 864e5 <= 30 && dateOf(p.birthday) >= d0) coming = [{ id: '_bd', text: `${p.first}’s birthday`, when: p.birthday, contacts: true }, ...coming.filter((m) => !m.contacts)];
  coming = coming.sort((a, b) => dateOf(a.when) - dateOf(b.when)).slice(0, 3);
  const yours = mems.filter((m) => m.kind === 'promise' && !m.kept).slice(0, 3);
  const pastEvents = mems.filter((m) => m.now === 'coming' && m.when && !future(m));
  const lately = [...mems.filter((m) => m.now === 'lately' && !m.resolvedNow), ...pastEvents].slice(0, 3);
  const kept = mems.filter((m) => m.kind === 'promise' && m.kept);
  const between = [...S.convos.filter((c) => c.p === pid).slice().reverse(), ...kept.map((k) => ({ text: 'You kept it · ' + (k.keptOn || DAYS[S.day].short), about: k.text.replace(/^You said you’d /, ''), fresh: true })), ...mems.filter((m) => m.now === 'between' && m.kind !== 'convo').map((m) => ({ text: m.text, about: srcLabel(m), mem: m.id })), ...mems.filter((m) => m.kind === 'convo').map((m) => ({ text: m.text, about: m.about }))].slice(0, 4);
  let h = `<div class="nb stagger">`;
  if (coming.length) h += `<div><div class="lbl"><span class="dot"></span>Coming up</div>${coming.map((m) => { const d = dateOf(m.when); return `<button class="cu" data-a="${m.id === '_bd' ? '' : 'line'}" data-id="${m.id}"><span class="d"><b>${m.when.slice(0, 3).toUpperCase()}</b><span>${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}</span></span><span><span class="ser">${esc(m.text)}</span>${m.sens ? `<br><span class="src" style="margin-top:4px">${ic('lock', 'ic')}Private · you said yes</span>` : `<br><span class="src ${m.contacts ? 'contacts' : ''}" style="margin-top:4px">${esc(m.contacts ? 'From Contacts' : srcLabel(m))}</span>`}</span></button>`; }).join('')}</div>`;
  if (yours.length) h += `<div><div class="lbl"><span class="dot" style="background:var(--orange)"></span>You said you’d</div>${yours.map((m) => `<button class="ln yours" data-a="line" data-id="${m.id}" id="ln-${m.id}"><span class="ser">${esc(m.text)}</span><br><span class="src yours">${esc(m.whenLabel ? 'Kinship brings it back ' + m.whenLabel : srcLabel(m))}</span></button>`).join('')}</div>`;
  if (lately.length) h += `<div><div class="lbl"><span class="dot" style="background:var(--pink)"></span>Lately</div>${lately.map((m) => `<button class="ln" data-a="line" data-id="${m.id}" id="ln-${m.id}"><span class="ser">${esc(m.text)}</span>${m.was ? `<div class="was">was: <s>${esc(m.was)}</s></div>` : ''}<br><span class="src">${esc(srcLabel(m))}</span></button>`).join('')}</div>`;
  if (between.length) h += `<div data-tag="built · Between you trail"><div class="lbl"><span class="dot" style="background:var(--green)"></span>Between you</div>${between.map((c) => `<div class="trail ${c.fresh ? 'new' : ''}"><span class="lf">${ic('sprout', 'ic')}</span><span><b>${esc(c.text)}</b><small>${esc(c.about || '')}</small></span></div>`).join('')}</div>`;
  const ideas = (IDEAS[pid] || []).filter((i) => i.ground.every((g) => findMem(g)));
  if (ideas.length) h += `<button class="ideas-tog" data-a="ideas-sheet" data-p="${pid}" id="p-ideas" data-tag="proposed · user-initiated ideas"><span class="leaf">${ic('sprout')}</span><span class="t"><b>Ideas for showing up</b><small>From what you’ve told Kinship about ${esc(p.first)}</small></span>${ic('chevR')}</button>`;
  h += `<button class="lnk knows-link" data-a="ptab" data-p="${pid}" data-v="knows">What Kinship knows about ${esc(p.first)} ${ic('chevR')}</button></div>`;
  return h;
}
function personPages(pid, t) {
  // the notebook: your notes (exact words) interleaved with what you did
  const entries = [];
  const mems = memOf(pid);
  const notes = new Set(mems.filter((m) => m.src).map((m) => m.src));
  if (P(pid).relSrc) notes.add(P(pid).relSrc);
  notes.forEach((nid) => { const n = noteOf(nid); if (n) entries.push({ type: 'note', id: nid, d: dateOf(n.date), n }); });
  if (pid === 'leo' && S.dense) LEO_DENSE.forEach(([date, text], i) => entries.push({ type: 'note', id: 'leo_d' + i, d: dateOf(date), n: { date, text }, whole: true }));
  S.convos.filter((c) => c.p === pid).forEach((c) => entries.push({ type: 'show', d: dateOf(c.on), text: c.text, about: c.about, fresh: c.fresh }));
  mems.filter((m) => m.kind === 'promise' && m.kept).forEach((k) => entries.push({ type: 'show', d: dateOf(k.keptOn || DAYS[S.day].short), text: 'You kept it: ' + k.text.replace(/^You said you’d /, ''), about: '', fresh: true, rank: 1 }));
  mems.filter((m) => m.kind === 'convo').forEach((c) => entries.push({ type: 'show', d: dateOf(c.text.split(' · ')[1]), text: c.text.split(' · ')[0], about: c.about + ' · ' + c.text.split(' · ')[1] }));
  entries.sort((a, b) => (b.d - a.d) || ((b.rank || 0) - (a.rank || 0)));
  const q = (t.pq || '').toLowerCase();
  let h = `<label class="search" style="margin:16px 18px 6px">${ic('search')}<input id="pageq" placeholder="Find in ${esc(P(pid).first)}’s pages" value="${esc(t.pq || '')}" autocomplete="off"></label><div class="pages" data-tag="proposed · Pages: your words over time">`;
  let lastYear = 2026;
  entries.forEach((e) => {
    if (q && e.type === 'note' && !e.n.text.toLowerCase().includes(q)) return;
    if (q && e.type === 'show') return;
    const y = e.d ? e.d.getFullYear() : 2026; if (y !== lastYear) { h += `<div class="yeardiv">${y}</div>`; lastYear = y; }
    if (e.type === 'show') { h += `<div class="np show ${e.fresh ? 'fresh' : ''}"><b>${esc(e.text)}</b><small>${esc(e.about)}</small></div>`; return; }
    const spans = e.whole ? [{ span: e.n.text, id: e.id }] : allMem().filter((m) => m.src === e.id && m.p === pid).map((m) => ({ span: m.span, id: m.id, sens: m.sens }));
    let body = highlight(e.n.text, spans);
    if (q) body = body.replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![^<]*>)', 'ig'), '<mark class="find">$1</mark>');
    const isTarget = t.focusNote === e.id;
    h += `<div class="np ${isTarget ? 'target' : ''} ${e.fresh || (S.freshNote === e.id) ? 'fresh' : ''}" id="np-${e.id}"><div class="cap">${esc(e.n.date)} · ${e.n.saved ? 'You saved this' : 'You told Kinship'}</div><div class="w">${body}</div></div>`;
  });
  return h + `</div>`;
}
const SECS = ['Background', 'Into', 'Hoping to', 'Plans', 'Their people', 'Between you'];
function personKnows(pid, mems) {
  let h = `<div class="nb" data-tag="built · What Kinship knows, in sections">`;
  SECS.forEach((sec) => {
    const ls = mems.filter((m) => m.sec === sec && m.kind !== 'convo');
    if (!ls.length) return;
    h += `<div class="lbl">${sec}</div>${ls.map((m) => `<button class="ln" data-a="line" data-id="${m.id}"><span class="ser">${esc(m.text)}</span>${m.was ? `<div class="was">${m.edited ? 'Edited by you · ' : 'Replaces · '}was: <s>${esc(m.was)}</s></div>` : ''}${m.resolved ? `<div class="was">${esc(m.resolved)}</div>` : ''}<br><span class="src ${m.sens ? 'held' : m.contacts ? 'contacts' : ''}">${m.sens ? 'Private · you said yes · ' : ''}${esc(srcLabel(m))}</span></button>`).join('')}`;
  });
  return h + `<p class="fine">Everything here has a source you can open. Edit any line; your edit wins.</p></div>`;
}

/* ───────── render: Source (your words) ───────── */
function renderSource(t) {
  const n = noteOf(t.id); if (!n) return '<div class="scr"></div>';
  const kept = allMem().filter((m) => m.src === t.id);
  const pal = (m) => P(m.p).color;
  let body = esc(n.text);
  kept.filter((m) => m.span && n.text.includes(m.span)).sort((a, b) => b.span.length - a.span.length).forEach((m) => {
    const e = esc(m.span); const focus = t.focusMem === m.id || (t.focus && HERO[t.focus] && HERO[t.focus].mentions && false);
    body = body.replace(e, `<span class="k ${focus ? 'hl' : ''}" style="background:linear-gradient(transparent 58%, ${pal(m)}99 58%, ${pal(m)}99 92%, transparent 92%)">${e}</span>`);
  });
  return `<div class="scr"><button class="iconbtn solid" style="position:absolute;top:54px;left:14px;z-index:5" data-a="back" aria-label="Back">${ic('chevL')}</button><div class="src-page stagger" data-tag="built · Source view">
  <div><div class="cap" style="color:var(--ink2)">${n.saved ? 'Saved from an idea' : 'Your note'}</div><h1 class="dsp">${esc(n.long || n.date)}</h1></div>
  <div class="paper"><div class="w">${body}</div></div>
  <div class="kept-from"><div class="lbl"><span class="dot"></span>What Kinship kept from this</div>${kept.map((m) => `<button class="ln" data-a="line" data-id="${m.id}" style="display:flex;gap:12px;align-items:flex-start">${face(m.p, 32)}<span><span class="ser" style="font-size:17px">${esc(m.text)}</span>${m.sens ? `<br><span class="src held">Private · you said yes</span>` : ''}</span></button>`).join('') || '<p class="fine">Nothing from this note is kept as a line.</p>'}</div>
  <p class="fine">Kinship keeps your words exactly as you wrote them. Every line it understood points back here.</p></div></div>`;
}

/* ───────── sheets ───────── */
function renderSheet() {
  const sh = S.sheet; if (!sh) return '';
  let inner = '';
  if (sh.k === 'line') inner = lineSheet(sh);
  if (sh.k === 'ideas') inner = `<div class="cap" style="color:var(--ink2)">${esc(P(sh.p).name)}</div><h2 class="dsp">Ideas for showing up</h2><p class="fine" style="margin-top:-4px;margin-bottom:12px">Only from what you’ve told Kinship. Nothing here is a task.</p><div class="ideas">${(IDEAS[sh.p] || []).filter((i) => i.ground.every((g) => findMem(g))).map((i, n) => ideaHTML(sh.p, i, n)).join('')}</div>`;
  if (sh.k === 'assist') inner = assistSheet(sh);
  return `<div class="scrim-all" data-a="close-sheet"></div><div class="sheet ${sh.k === 'line' ? 'lsheet' : ''}" role="dialog" aria-modal="true"><div class="grab"></div>${inner}</div>`;
}
const KIND_LABEL = { fact: 'Something true', event: 'Something happening', plan: 'A plan', promise: 'Something you said you’d do', thread: 'Something ongoing', context: 'Something that matters to them', convo: 'Between you' };
function lineSheet(sh) {
  const m = findMem(sh.id); if (!m) return '';
  const n = noteOf(m.src);
  if (sh.editing) return `<div class="cap" style="color:var(--ink2)">Edit the words</div><div class="edit"><div class="from">From your words: “${esc(noteSpan(m))}”</div><textarea id="lineedit" rows="3">${esc(m.text)}</textarea><div class="row"><button class="b b-ink b-sm" data-a="line-save" data-id="${m.id}">Save</button><button class="b b-ghost b-sm" data-a="line-cancel">Cancel</button></div></div><p class="fine">Your edit wins. Kinship never changes it back, and your note stays as you wrote it.</p>`;
  return `<div class="cap" style="color:${m.kind === 'promise' ? 'var(--orangeT)' : 'var(--ink2)'}">${esc(KIND_LABEL[m.kind] || '')} · ${esc(P(m.p).first)}</div><div class="ser big">${esc(m.text)}</div>${m.was ? `<div class="was" style="margin:-6px 0 12px">${m.edited ? 'Edited by you · ' : ''}was: <s>${esc(m.was)}</s></div>` : ''}
  ${n ? `<div class="quote" data-tag="built · provenance">${highlight(clip(n.text, m.span ? m.span.toLowerCase().slice(0, 12) : '') || n.text, [{ span: m.span, id: m.id }])}</div><button class="srcrow" data-a="push" data-s="source" data-id="${m.src}" data-mem="${m.id}" style="margin-top:12px" id="open-note"><span class="src">${esc(srcLabel(m))} · open the note</span>${ic('chevR')}</button>` : `<div class="src contacts">From Contacts</div>`}
  <div class="acts3"><button class="b b-ghost b-sm" data-a="line-edit" data-id="${m.id}">${ic('pen')}Edit words</button><button class="b b-ghost b-sm" data-a="toast" data-msg="Opens the date picker (built: Pickers.tsx).">${ic('clock')}Change date</button><button class="b b-ghost b-sm" data-a="toast" data-msg="Opens “Who is this about?” (built).">Someone else</button><button class="b b-ghost b-sm" data-a="line-gone" data-id="${m.id}">Not this</button></div>${sh.confirmGone ? `<div class="keepbox" style="margin-top:12px;box-shadow:inset 3px 0 0 var(--held);background:#fff"><div class="ser" style="font-size:17px">Forget this line? Your note stays exactly as you wrote it.</div><div style="display:flex;gap:8px;margin-top:10px"><button class="b b-ink b-sm" data-a="line-gone" data-id="${m.id}">Forget it</button><button class="b b-ghost b-sm" data-a="line-cancel-gone">Cancel</button></div></div>` : ''}
  ${m.kind === 'promise' && !m.kept ? `<button class="b b-lime b-full" style="margin-top:12px" data-a="kept" data-id="${m.id}">${ic('check')}I did this</button>` : ''}`;
}
const OPENERS = {
  josh_luck: ['Good luck tomorrow! Go easy on the whiteboard.', 'Thinking of you for the interview. You’ve got this.'],
  elena_dinner: ['How are you feeling? I’d love to bring you dinner Thursday, if you’re up for it.', 'Thinking of you today. Could I drop off dinner on Thursday?'],
};
function assistSheet(sh) {
  const p = P(sh.p); const idea = (IDEAS[sh.p] || []).find((i) => i.id === sh.id);
  const grounds = idea.ground.map(findMem).filter(Boolean);
  let h = `<span class="catc" style="display:inline-block;font:700 10.5px/1 'Instrument Sans';letter-spacing:.12em;text-transform:uppercase;padding:5px 8px;border-radius:6px;background:${CAT_COLOR[idea.cat]}">${esc(idea.cat)}</span><h2 class="dsp">${esc(idea.title)}</h2>`;
  grounds.forEach((g) => { h += `<div class="ground">${g.contacts ? `<div class="ser">${esc(p.first)}’s birthday is ${esc(p.birthday)}.</div><div class="src contacts">From Contacts</div>` : `<div class="ser it">“${esc(noteSpan(g))}”</div><button class="src" data-a="push" data-s="source" data-id="${g.src}" data-mem="${g.id}">${esc(srcLabel(g))}</button>`}</div>`; });
  if (idea.detail) h += `<p class="fine" style="margin-top:4px">In your note: ${esc(idea.detail)}</p>`;
  h += `<div class="lbl" style="margin-top:20px">Ways to do it</div><div class="ways">`;
  const row = (a, icon, title, sub, tag, id = '') => `<button class="way" data-a="${a}" data-p="${sh.p}" data-id="${idea.id}" ${id ? `id="${id}"` : ''} data-tag="${tag}"><span class="wi">${ic(icon)}</span><span class="wt"><b>${title}</b><small>${sub}</small></span>${ic('chevR')}</button>`;
  idea.ways.forEach((w) => {
    if (w === 'message') h += row('handoff', 'msg', `Message ${esc(p.first)}`, 'Opens Messages. Nothing is written or sent for you.', 'built · hand-off');
    if (w === 'call') h += row('handoff-call', 'phone', `Call ${esc(p.first)}`, 'Opens Phone.', 'built · hand-off');
    if (w === 'help') { h += row('help-open', 'words', 'Help me start', 'Two openers from what you told Kinship. Only when you ask.', 'proposed · D9 “openers later, on request”', 'way-help'); if (sh.help) h += `<div style="padding:10px 0 4px">${OPENERS[idea.id].map((o, i) => `<button class="opener ${sh.opener === i ? 'on' : ''}" data-a="opener" data-v="${i}" id="opener-${i}">${esc(o)}</button>`).join('')}<button class="b b-ink b-full" data-a="handoff" data-p="${sh.p}" data-id="${idea.id}" data-opener="1" ${sh.opener == null ? 'disabled style="opacity:.4"' : ''} id="open-with">${ic('msg')}Open Messages with it</button><p class="fine">Copied for you to paste and make your own. Kinship never sends.</p></div>`; }
    if (w === 'find') h += row('toast', 'ext', 'Find the book', 'Opens a bookshop search for “Ottolenghi Comfort”. Nothing about Maya leaves Kinship.', 'future · plain web hand-off, no partner').replace('data-a="toast"', 'data-a="toast" data-msg="Future: opens a web search for the title only. No partner, no personal data, no commission."');
    if (w === 'card') { h += row('card-open', 'card', 'Write a card', 'Things you could mention, then your own words.', 'proposed'); if (sh.card) h += `<div style="padding:10px 0">${memOf(sh.p).filter((m) => ['maya_job', 'maya_otto', 'maya_soup'].includes(m.id)).map((m) => `<div class="mention"><div class="ser" style="font-size:16px">${esc(m.text)}</div></div>`).join('')}<div class="keepbox" style="box-shadow:inset 3px 0 0 var(--pink);background:#fff"><textarea rows="3" placeholder="Happy birthday, Maya…"></textarea></div></div>`; }
    if (w === 'keep') { h += row('keep-open', 'bookmark', 'Keep it in mind', `Kinship brings it back on the day you pick.`, 'proposed · an intention is a Tell in your words', 'way-keep'); if (sh.keep) h += keepBox(sh, idea); }
    if (w === 'onday') h += `<div class="way" style="cursor:default" data-tag="built"><span class="wi">${ic('clock')}</span><span class="wt"><b>Nothing to set</b><small>${idea.cat === 'Follow through' ? `Kinship asks “How did it go?” the day after, on its own.` : `Kinship brings ${esc(p.first)} back on the day itself.`}</small></span></div>`;
  });
  h += `</div><p class="fine">Kinship never sends, buys, books or invites anyone for you. Doing nothing is always fine.</p>`;
  return h;
}
function keepBox(sh, idea) {
  const whens = ['Tomorrow', 'Thursday', 'Saturday', 'Pick a day'];
  const w = sh.when || idea.keepWhen || 'Tomorrow';
  const own = idea.ground.map(findMem).find((g) => g && g.kind === 'promise');
  if (own) return `<div style="padding:10px 0 4px"><div class="whenchips">${whens.map((x) => `<button class="${x === w ? 'on' : ''}" data-a="keep-when" data-v="${x}">${x}</button>`).join('')}</div><div class="keepbox"><div class="cap" style="color:var(--orangeT);margin-bottom:6px">You already said you’d do this</div><div class="ser" style="font-size:18px">${esc(own.text)}</div></div><button class="b b-ink b-full" style="margin-top:12px" data-a="keep-save" data-p="${sh.p}" data-id="${idea.id}" id="keep-save">${ic('bookmark')}Bring it back ${w === 'Pick a day' ? 'on a day' : w === 'Tomorrow' ? 'tomorrow' : 'on ' + esc(w)}</button><p class="fine">Adds a day to your own words. Nothing new is added, nothing repeats, nothing goes overdue.</p></div>`;
  return `<div style="padding:10px 0 4px"><div class="whenchips">${whens.map((x) => `<button class="${x === w ? 'on' : ''}" data-a="keep-when" data-v="${x}">${x}</button>`).join('')}</div><div class="keepbox"><div class="cap" style="color:var(--orangeT);margin-bottom:6px">In your words · you can change them</div><textarea id="keeptext" rows="2">${esc(sh.text ?? idea.keep)}</textarea></div><button class="b b-ink b-full" style="margin-top:12px" data-a="keep-save" data-p="${sh.p}" data-id="${idea.id}" id="keep-save">${ic('bookmark')}Keep it for ${esc(w)}</button><p class="fine">Saved on ${esc(P(sh.p).first)}’s page under “You said you’d”, with this as its source. No reminder repeats, nothing goes overdue.</p></div>`;
}

/* ───────── Tell + review ───────── */
function renderTell() {
  const t = S.tell; if (!t) return '';
  const about = t.p ? `About ${P(t.p).first}. In your own words.` : 'About anyone. In your own words.';
  if (t.phase === 'understanding') {
    const items = t.items;
    let body = esc(t.text);
    items.filter((it) => t.text.includes(it.span)).sort((a, b) => b.span.length - a.span.length).forEach((it, n) => { const e = esc(it.span); body = body.replace(e, `<span class="u" style="--uc:${P(it.p).color};animation-delay:${n * 110}ms">${e}</span>`); });
    return `<div class="tell"><div class="tell-h"><h1 class="dsp">Tell Kinship</h1></div><div class="tell-sub">${about}</div><div class="tell-paper"><div class="w">${body}</div></div><div class="tell-f"><div class="understanding"><i></i>Understanding…</div></div></div>`;
  }
  return `<div class="tell" data-tag="built · Tell; proposed · page treatment"><div class="tell-h"><h1 class="dsp">Tell Kinship</h1><button class="iconbtn" data-a="tell-close" aria-label="Close">${ic('x')}</button></div><div class="tell-sub">${about}</div><div class="tell-paper"><textarea id="telltext" placeholder="Long or short, messy is fine. Several people at once is fine.">${esc(t.text || '')}</textarea></div><div class="tell-f"><div class="hint">Kinship keeps your words and shows you what it understood.</div><button class="b b-ink" data-a="tell-keep" id="tell-keep">Keep</button></div></div>`;
}
function startReview(set, p, text) {
  const src = set === 'j2' ? J2_ITEMS : AFTER[p].items;
  S.rv = { set, p, text, open: false, which: set === 'j2' ? null : 'n/a', editing: null, pop: null,
    items: src.map((it) => ({ ...it, st: it.known ? 'known' : it.held ? 'held' : 'kept', date: it.dateTok ? 'vague' : null })) };
}
function rvVisible(it) { return !(S.rv.set === 'j2' && it.p === 'sam' && !S.rv.which); }
function renderReview() {
  const r = S.rv; if (!r) return '';
  const people = [...new Set(r.items.map((i) => i.p))];
  // your words, with each understood phrase underlined in that person's color
  let body = esc(r.text);
  r.items.filter((it) => r.text.includes(it.span)).sort((a, b) => b.span.length - a.span.length).forEach((it) => { const e = esc(it.span); body = body.replace(e, `<span data-span="${it.id}" data-a="span" class="${it.st === 'removed' || it.st === 'dropped' ? 'gone' : ''}" style="--uc:${P(it.p).color}">${e}</span>`); });
  let h = `<div class="rv" id="rv"><div class="rv-h"><div class="cap" style="color:var(--ink2)">Kept for ${asList(people.filter((x) => x !== 'sam' || r.which !== null).map((x) => P(x).first))}${r.set === 'j2' && !r.which ? ' · one question' : ''}</div><h1 class="dsp">Here’s what I’ll remember.</h1></div>
  <div class="words ${r.open ? 'open' : ''}" data-tag="proposed · tap a phrase ↔ its line"><div class="cap" style="color:var(--quiet);margin-bottom:4px">Your words · ${esc(DAYS[S.day].short)}</div><div class="w">${body}</div>${r.text.length > 220 ? `<button class="more" data-a="rv-open">${r.open ? 'Show less' : 'Show all of it'}</button>` : ''}</div>`;
  // needs you: identity and sensitive readings, only when consequential
  const needs = [];
  if (r.set === 'j2') {
    needs.push(r.which ? `<div class="qcard answered"><div class="cap" style="color:var(--green)">Answered</div><div class="ser">“Sam called” is ${esc(P(r.which).name)}.</div></div>`
      : `<div class="qcard" id="q-sam" data-tag="built · two candidates → one question"><div class="cap">Who is this about?</div><div class="ser">Which Sam called?</div><div class="quote">“Then Sam called — she got the promotion!!!”</div><div class="opts"><button class="opt" data-a="which" data-v="sam" id="which-sam">${face('sam', 36)}<span><b>Sam Delgado</b><small>From the pottery studio</small></span></button><button class="opt" data-a="which" data-v="samo">${face('samo', 36)}<span><b>Sam Okafor</b><small>Josh’s friend from work</small></span></button><button class="opt" data-a="toast" data-msg="Opens Add by name (built).">${ic('plus')}<span><b>Someone new</b></span></button></div></div>`);
  }
  r.items.filter((it) => it.held).forEach((it) => {
    if (it.st === 'held') needs.push(`<div class="qcard" id="held-${it.id}" data-tag="built · sensitive needs a yes"><div class="cap">Needs your yes</div><div class="ser">${esc(it.text)}</div><div class="quote">This is about ${esc(it.sens)}. Kinship keeps it only if you say so, and never brings it up on its own.</div><div class="row"><button class="b b-ink b-sm" data-a="held" data-id="${it.id}" data-v="kept" id="held-yes-${it.id}">Keep it</button><button class="b b-ghost b-sm" data-a="held" data-id="${it.id}" data-v="dropped">Don’t keep</button></div></div>`);
    else needs.push(`<div class="qcard answered"><div class="cap" style="color:var(--green)">${it.st === 'kept' ? 'Kept, privately' : 'Not kept'}</div><div class="ser" style="font-size:16px">${esc(it.text)}</div></div>`);
  });
  if (needs.length) h += `<div class="needs">${needs.join('')}</div>`;
  people.forEach((pid) => {
    const items = r.items.filter((it) => it.p === pid && !it.held);
    if (!items.length) return;
    const waiting = !rvVisible(items[0]);
    const pp = pid === 'sam' && r.which === 'samo' ? 'samo' : pid;
    h += `<div class="grp"><div class="grp-h">${face(pp, 40)}<span><b>${esc(P(pp).name)}</b><small>${waiting ? 'Waits for your answer above' : esc(P(pp).rel || '')}</small></span></div>${items.map((it) => itemRow(it, waiting)).join('')}</div>`;
  });
  h += `<div style="height:20px"></div></div><div class="rv-f"><button class="b b-ink" data-a="rv-done" id="rv-done">Done</button><button class="lnk" data-a="rv-undo">Undo this note</button></div>`;
  return h;
}
function itemRow(it, waiting) {
  const p = P(it.p);
  if (S.rv.editing === it.id) return `<div class="it-row" style="--uc:${p.color}" id="row-${it.id}"><div class="edit"><div class="from">From your words: “${esc(it.span)}”</div><textarea id="rvedit" rows="3">${esc(it.fix && !it.edited ? it.fix : it.text)}</textarea><div class="row"><button class="b b-ink b-sm" data-a="rv-save" data-id="${it.id}" id="rv-save">Save</button><button class="b b-ghost b-sm" data-a="rv-cancel">Cancel</button></div></div></div>`;
  let text = esc(it.text);
  if (it.dateTok) text += ` <button class="tok" data-a="date-pop" data-id="${it.id}" id="tok-${it.id}">${esc(it.date === 'exact' ? 'on ' + it.dateAlt : it.dateTok)}</button>.`;
  const tags = [];
  if (it.st === 'known') tags.push(`<span class="tag kn">${ic('check', 'ic')}Already known · nothing added twice</span>`);
  if (it.kind === 'promise') tags.push(`<span class="tag or">You said you’d</span>`);
  if (it.tag) tags.push(`<span class="tag gn">${esc(it.tag)}</span>`);
  if (it.replaces) { const old = MEM.find((m) => m.id === it.replaces); tags.push(`<span class="tag rp">Replaces: ${esc(old.text)} <button data-a="toast" data-msg="Keeps both lines; nothing is replaced (built: told-again question).">Keep both</button></span>`); }
  if (it.resolves) tags.push(`<span class="tag rp">Answers: ${esc(MEM.find((m) => m.id === it.resolves).text)}</span>`);
  if (it.supersedes) tags.push(`<span class="tag rp">Settles your earlier “maybe dinner Thursday”</span>`);
  if (it.newPerson) tags.push(`<span class="tag kn">${esc(it.newPerson)} isn’t in your People. She stays on Priya’s page.</span>`);
  if (it.edited) tags.push(`<span class="tag">Edited by you</span>`);
  if (it.dateTok && it.date === 'vague') tags.push(`<span class="tag kn">Kept as you said it</span>`);
  const pop = S.rv.pop === it.id ? `<div class="pop" data-tag="built · date picker"><button class="${it.date === 'vague' ? 'on' : ''}" data-a="date-set" data-id="${it.id}" data-v="vague">Mid-November<small>As you said it. Kinship won’t guess a day.</small></button><button class="${it.date === 'exact' ? 'on' : ''}" data-a="date-set" data-id="${it.id}" data-v="exact" id="date-exact">Sun, Nov 15<small>You wrote “the 15th I think”. A day lets Kinship bring it back.</small></button><button data-a="toast" data-msg="Opens the calendar picker (built).">Another day…</button></div>` : '';
  const sentence = it.st === 'known' ? `<span class="ser">${text}</span>` : `<span class="ser" data-a="rv-edit" data-id="${it.id}" id="sent-${it.id}">${text}</span>`;
  return `<div class="it-row ${it.st === 'removed' ? 'removed' : ''} ${it.st === 'known' ? 'known' : ''} ${waiting ? 'wait' : ''}" style="--uc:${p.color}" id="row-${it.id}" data-a="row" data-id="${it.id}">${sentence}${tags.length ? `<div class="tags">${tags.join('')}</div>` : ''}${pop}${it.st === 'known' ? '' : `<button class="x" data-a="rv-x" data-id="${it.id}" aria-label="${it.st === 'removed' ? 'Bring back' : 'Not this'}">${it.st === 'removed' ? ic('check') : ic('x')}</button>`}</div>`;
}
function commitReview() {
  const r = S.rv;
  if (r.set === 'j2') {
    const items = r.items.map((it) => ({ ...it }));
    if (r.which === 'samo') items.forEach((it) => { if (it.p === 'sam') it.p = 'samo'; });
    const keptPeople = [...new Set(items.filter((i) => i.st === 'kept').map((i) => P(i.p).first))];
    S.j2 = { items, text: r.text, keptLine: keptPeople, waiting: !r.which };
    S.toast = { msg: `Kept for ${asList(keptPeople)}.`, undo: 'j2' };
  } else {
    const nid = 'n_after_' + r.p;
    S.notesExtra[nid] = { date: DAYS[S.day].short, long: DAYS[S.day].long.charAt(0) + DAYS[S.day].long.slice(1).toLowerCase(), text: r.text };
    const added = r.items.filter((i) => i.st === 'kept').map((i) => ({ ...i, src: nid }));
    S.extra.push(...added);
    if (r.p === 'elena') S.done.add('elena_promise');
    S.freshNote = nid; S.rc = null;
    S.toast = { msg: `Added to ${P(r.p).first}’s notebook.`, undo: 'after:' + r.p };
    S.rv = null; S.tell = null;
    if (r.p !== 'ben') { S.stack = [{ s: 'today' }, { s: 'person', p: r.p }]; S.ptab[r.p] = 'pages'; S.anim = 'push'; }
    return;
  }
  S.rv = null; S.tell = null; S.stack = [{ s: 'today' }]; S.anim = 'fade';
}

/* ───────── hand-off (another app) ───────── */
function renderHandoff() {
  const h = S.handoff; if (!h) return '';
  const p = P(h.p);
  return `<div class="handoff" data-tag="built · Kinship only opens the app"><button class="back2" data-a="return" id="return">◀ Kinship</button><div class="hdr">${face(h.p, 54)}<div style="font-weight:600;font-size:15px">${esc(p.name)}</div><div style="font-size:12px;color:#888">${h.call ? 'Phone' : 'Messages'}</div></div>
  <div class="note"><b>You’re in ${h.call ? 'Phone' : 'Messages'} now.</b> Kinship opened it and stepped aside. It can’t see what you write and never sends anything.${h.opener ? '<br><br>The opener you chose was copied. Paste it and make it yours.' : ''}</div>
  <div class="compose ${h.opener ? 'filled' : ''}">${h.call ? 'Calling…' : esc(h.opener || 'iMessage')}</div><div class="ret"><button class="b b-ink b-full" data-a="return" id="return2">Come back to Kinship</button></div></div>`;
}

/* ───────── master render ───────── */
const SCREENS = { today: renderToday, people: renderPeople, person: renderPerson, moment: renderMoment, source: renderSource };
function render() {
  const dev = $('#device');
  const t = cur();
  const dark = (t.s === 'moment' && HERO[t.id]?.style === 'photo') || (t.s === 'person' && P(t.p).photo && S.day !== 'first');
  let html = `<div class="island"></div><div class="sbar ${dark && !S.sheet && !S.tell && !S.rv ? 'light' : ''}"><span>9:41</span><span class="ind">●●● <i></i></span></div>`;
  html += `<div id="screen-host">${SCREENS[t.s](t)}</div>`;
  html += renderSheet() + renderTell() + renderReview() + renderHandoff();
  if (S.toast) html += `<div class="toast" role="status"><span class="grow">${esc(S.toast.msg)}</span>${S.toast.undo ? `<button data-a="undo">Undo</button>` : ''}</div>`;
  html += `<div class="topfade"></div><div class="grain"></div><div class="home-ind"></div>`;
  const keepScroll = !S.anim && $('#screen-host .scr') ? $('#screen-host .scr').scrollTop : 0;
  const rvScroll = !S.anim && $('#rv') ? $('#rv').scrollTop : 0;
  const shScroll = $('.sheet') ? $('.sheet').scrollTop : 0;
  dev.innerHTML = html; dev.classList.remove('scrolled');
  const host = $('#screen-host > .scr', dev);
  if (host) {
    if (S.anim === 'push') host.classList.add('enter-push');
    else if (S.anim === 'pop') host.classList.add('enter-pop');
    else if (S.anim === 'fade') host.classList.add('enter-fade');
    else if (S.anim === 'expand' && S.expandRect) { const r = S.expandRect; host.style.setProperty('--ct', r.t + 'px'); host.style.setProperty('--cr', r.r + 'px'); host.style.setProperty('--cb', r.b + 'px'); host.style.setProperty('--cl', r.l + 'px'); host.classList.add('enter-expand'); }
    else host.scrollTop = keepScroll;
  }
  if ($('#rv')) $('#rv').scrollTop = rvScroll;
  if ($('.sheet') && shScroll) $('.sheet').scrollTop = shScroll;
  if (S.scrollTo) { const el = $(S.scrollTo, dev); if (el) el.scrollIntoView({ block: 'center' }); S.scrollTo = null; const sc = $('#screen-host > .scr', dev); if (sc) dev.classList.toggle('scrolled', sc.scrollTop > 120); }
  S.anim = null;
  $('#phone').classList.toggle('annot', S.annot);
  document.body.classList.toggle('rm', S.rm);
  bindInputs();
  renderRail();
  if (window.renderNotes) window.renderNotes();
  placeRing();
}
function bindInputs() {
  const pq = $('#pq'); if (pq) { pq.oninput = () => { S.pq = pq.value; const pos = pq.selectionStart; render(); const n = $('#pq'); n.focus(); n.setSelectionRange(pos, pos); }; }
  const pg = $('#pageq'); if (pg) { pg.oninput = () => { cur().pq = pg.value; const pos = pg.selectionStart; render(); const n = $('#pageq'); n.focus(); n.setSelectionRange(pos, pos); }; }
  const tt = $('#telltext'); if (tt) tt.oninput = () => { S.tell.text = tt.value; };
  const kt = $('#keeptext'); if (kt) kt.oninput = () => { S.sheet.text = kt.value; };
}
let toastTimer = null;
function toast(msg, undo) { S.toast = { msg, undo }; clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = null; render(); }, 5200); }

/* ───────── actions ───────── */
function rectOf(el) {
  const d = $('#device').getBoundingClientRect(); const r = el.getBoundingClientRect(); const k = d.width / 368 || 1;
  return { t: Math.max(0, r.top - d.top) / k, l: Math.max(0, r.left - d.left) / k, r: Math.max(0, d.right - r.right) / k, b: Math.max(0, d.bottom - r.bottom) / k };
}
const A = {
  tab(d) { S.seen.add('tab:' + d.s); S.stack = [{ s: d.s }]; S.sheet = null; S.anim = 'fade'; },
  push(d) { if (!d.id) return; S.seen.add(d.s + ':' + d.id); S.sheet = null; S.stack.push({ s: d.s, id: d.id, focus: d.focus, focusMem: d.mem }); S.anim = 'push'; },
  back() { if (S.stack.length > 1) { S.stack.pop(); S.anim = 'pop'; } },
  moment(d, el) { S.seen.add('moment:' + d.id); S.ideasOpen = false; S.expandRect = rectOf(el); S.stack.push({ s: 'moment', id: d.id }); S.anim = 'expand'; },
  notnow(d) { S.dismissed.add(d.id); if (cur().s === 'moment') S.stack.pop(); S.anim = 'fade'; toast('Okay. It won’t come back today.'); },
  'ideas-tog'() { S.ideasOpen = !S.ideasOpen; },
  'ideas-sheet'(d) { S.sheet = { k: 'ideas', p: d.p }; },
  assist(d) { S.seen.add('assist:' + d.id); S.sheet = { k: 'assist', p: d.p, id: d.id }; },
  'close-sheet'() { S.sheet = null; },
  person(d) { S.seen.add('person:' + d.p); S.sheet = null; S.stack.push({ s: 'person', p: d.p }); S.anim = 'push'; },
  ptab(d) { S.ptab[d.p] = d.v; const t = cur(); t.focusNote = null; },
  line(d) { if (!d.id || !findMem(d.id) || d.id.startsWith('leo_d')) return; S.seen.add('line:' + d.id); S.sheet = { k: 'line', id: d.id }; },
  'line-edit'(d) { S.sheet.editing = true; },
  'line-cancel'() { S.sheet.editing = false; },
  'line-cancel-gone'() { S.sheet.confirmGone = false; },
  'line-save'(d) { const v = $('#lineedit').value.trim(); const base = [...MEM, ...j2Mem(), ...S.extra, ...S.intents].find((m) => m.id === d.id); if (v && base && v !== base.text) S.edits[d.id] = v; else delete S.edits[d.id]; S.sheet = null; toast('Saved. Your edit wins.'); },
  'line-gone'(d) { if (!S.sheet.confirmGone) { S.sheet.confirmGone = true; return; } S.gone.add(d.id); S.sheet = null; toast('Forgotten. Your note is unchanged.', 'gone:' + d.id); },
  kept(d) { S.done.add(d.id); const m = findMem(d.id); S.sheet = null; S.rc = { p: m.p, step: 'remember', kept: true, about: '', withWhat: 'it', trail: 'You kept it · ' + DAYS[S.day].short }; },
  toast(d) { toast(d.msg); },
  hit(d) { S.seen.add('person:' + d.p); const m = findMem(d.id); S.pq = S.pq; S.stack.push({ s: 'person', p: d.p, focusNote: m.src, pq: '' }); S.ptab[d.p] = 'pages'; S.anim = 'push'; S.scrollTo = '#np-' + m.src; },
  handoff(d) {
    const idea = d.id ? (IDEAS[d.p] || []).find((i) => i.id === d.id) : null;
    const opener = d.opener && S.sheet && S.sheet.opener != null ? OPENERS[d.id][S.sheet.opener] : null;
    const about = d.about || (idea ? ({ elena_dinner: 'bringing dinner Thursday', elena_ride: 'a ride to her follow-up', ben_bagels: 'the bagels', ben_chicago: 'Chicago', josh_luck: 'the interview', maya_soup: 'her birthday', leo_practice: 'the toast', leo_move: 'the move', priya_move: 'the move', priya_back: 'being back', sam_kin: 'celebrating' }[idea.id] || '') : '');
    S.seen.add('handoff:' + d.p); S.handoff = { p: d.p, about, call: !!d.call, idea: idea ? idea.cat : null, opener, page: !!d.page }; S.sheet = null;
  },
  'handoff-call'(d) { A.handoff({ ...d, call: 1 }); },
  'help-open'() { S.sheet.help = !S.sheet.help; },
  opener(d) { S.sheet.opener = +d.v; },
  'card-open'() { S.sheet.card = !S.sheet.card; },
  'keep-open'() { S.sheet.keep = !S.sheet.keep; },
  'keep-when'(d) { S.sheet.when = d.v; },
  'keep-save'(d) {
    const idea = IDEAS[d.p].find((i) => i.id === d.id);
    const own = idea.ground.map(findMem).find((g) => g && g.kind === 'promise');
    if (own) { const w0 = S.sheet.when || idea.keepWhen || 'Tomorrow'; S.pwhen[own.id] = w0; S.sheet = null; toast(`Kinship brings it back ${w0 === 'Tomorrow' ? 'tomorrow' : 'on ' + w0}. Nothing new added.`, 'pwhen:' + own.id); return; } const text = ($('#keeptext').value || idea.keep).trim(); const w = S.sheet.when || idea.keepWhen || 'Tomorrow';
    const id = 'int_' + Date.now(); const nid = 'n_' + id;
    S.notesExtra[nid] = { date: DAYS[S.day].short, long: DAYS[S.day].long.charAt(0) + DAYS[S.day].long.slice(1).toLowerCase(), text, saved: true };
    S.intents.push({ id, p: d.p, kind: 'promise', text, src: nid, span: text, sec: 'Plans', now: 'yours', whenLabel: w, saved: true });
    S.sheet = null; toast(`On ${P(d.p).first}’s page. You’ll see it ${w === 'Pick a day' ? 'on the day you pick' : w === 'Tomorrow' ? 'tomorrow' : 'on ' + w}.`, 'intent:' + id);
  },
  return() {
    const h = S.handoff; S.handoff = null; S.seen.add('return:' + h.p);
    const PLAN = { 'Practical help': 'Did you offer to help?', 'Time together': 'Did you make a plan?', 'A gesture': 'Did you make a plan?', 'Celebrate': 'Did you make a plan?' };
    const verb = h.call ? 'You called' : 'You messaged';
    if (h.page && !h.about) { S.rc = { p: h.p, step: 'ask', about: 'anything', trail: '' }; }
    S.rc = { p: h.p, step: 'ask', about: h.about || 'anything', planAsk: h.idea ? PLAN[h.idea] : null, trail: `${verb} · ${DAYS[S.day].short}`, verb };
    if (!h.page) { S.stack = [{ s: 'today' }]; S.anim = 'fade'; }
  },
  'rc-yes'() {
    const r = S.rc; S.convos.push({ p: r.p, text: `${r.verb} · ${DAYS[S.day].short.replace(/^[A-Z][a-z]{2}, /, '')}`, about: r.about !== 'anything' ? 'About ' + r.about : '', on: DAYS[S.day].short, fresh: true });
    r.step = r.planAsk ? 'plan' : 'remember';
    Object.keys(HERO).forEach((k) => { if (HERO[k].p === r.p) S.dismissed.add(k); });
  },
  'rc-no'() { S.rc = null; toast('Okay. It stays while it’s still timely.'); },
  'rc-plan'(d) { S.rc.step = 'remember'; S.rc.planned = d.v === 'yes'; if (d.v === 'yes') toast('Noted: you offered to help. Only the kind is kept.'); },
  'rc-tell'() { const r = S.rc; S.tell = { p: r.p, text: '', phase: 'write', after: true }; },
  'rc-nothing'() { S.rc = null; toast('Nothing changes. The conversation still counts.'); },
  did(d) { const m = HERO[d.id]; S.done.add('j_sam_promise'); if (cur().s === 'moment') S.stack.pop(); S.rc = { p: m.p, step: 'remember', kept: true, withWhat: 'dinner with Sam', trail: 'You took Sam out to celebrate · Nov 6' }; S.anim = 'fade'; },
  tell(d) { S.tell = { p: d.p || null, text: '', phase: 'write' }; S.sheet = null; },
  'tell-close'() { S.tell = null; },
  'tell-keep'() {
    const t = S.tell; const txt = (t.text || '').trim(); if (!txt) return;
    let set = null;
    if (txt === J2_TEXT.trim()) set = 'j2';
    else if (t.p && AFTER[t.p] && txt === AFTER[t.p].text) set = 'after';
    if (!set) { S.tell = null; toast('Kept. (This prototype understands only the journey stories.)'); return; }
    t.phase = 'understanding'; t.items = set === 'j2' ? J2_ITEMS : AFTER[t.p].items;
    render();
    setTimeout(() => { startReview(set, t.p, txt); render(); }, S.rm ? 300 : 1700);
    return 'norender';
  },
  which(d) { S.rv.which = d.v; },
  held(d) { S.rv.items.find((i) => i.id === d.id).st = d.v; },
  'rv-open'() { S.rv.open = !S.rv.open; },
  span(d) { const el = $('#row-' + d.span); if (el) { el.scrollIntoView({ block: 'center', behavior: S.rm ? 'auto' : 'smooth' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } return 'norender'; },
  row(d, el, ev) { if (ev.target.closest('button')) return 'norender'; const sp = $(`[data-span="${d.id}"]`); if (sp) { sp.classList.add('flash'); setTimeout(() => sp.classList.remove('flash'), 1100); } return 'norender'; },
  'rv-x'(d) { const it = S.rv.items.find((i) => i.id === d.id); it.st = it.st === 'removed' ? 'kept' : 'removed'; },
  'rv-edit'(d) { if (!rvVisible(S.rv.items.find((i) => i.id === d.id))) return; S.rv.editing = d.id; S.rv.pop = null; },
  'rv-cancel'() { S.rv.editing = null; },
  'rv-save'(d) { const it = S.rv.items.find((i) => i.id === d.id); const v = $('#rvedit').value.trim(); if (v && v !== it.text) { it.text = v; it.edited = true; } S.rv.editing = null; },
  'date-pop'(d) { S.rv.pop = S.rv.pop === d.id ? null : d.id; },
  'date-set'(d) { S.rv.items.find((i) => i.id === d.id).date = d.v; S.rv.pop = null; },
  'rv-done'() { commitReview(); },
  'rv-undo'() { S.rv = null; S.tell = null; toast('Undone. Nothing from this note was kept.'); },
  'reopen-review'() { startReview('j2', null, J2_TEXT); S.rv.items = S.j2.items.map((i) => ({ ...i })); },
  undo() {
    const u = S.toast && S.toast.undo; S.toast = null; if (!u) return;
    if (u === 'j2') S.j2 = null;
    if (u.startsWith('intent:')) S.intents = S.intents.filter((i) => i.id !== u.slice(7));
    if (u.startsWith('gone:')) S.gone.delete(u.slice(5));
    if (u.startsWith('pwhen:')) delete S.pwhen[u.slice(6)];
    if (u.startsWith('after:')) { const p = u.slice(6); S.extra = S.extra.filter((m) => m.src !== 'n_after_' + p); delete S.notesExtra['n_after_' + p]; }
  },
};
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-a]'); if (!el || !el.closest('#device')) return;
  const a = el.dataset.a; if (!a || !A[a]) return;
  if (el.tagName === 'SPAN' && a === 'line' && el.closest('.words')) return;
  ev.stopPropagation();
  const r = A[a](el.dataset, el, ev);
  if (r !== 'norender') render();
});

/* ───────── presenter: journeys, states, ring ───────── */
const has = (sel) => !!$(sel, $('#device'));
const JOURNEYS = [
  { id: 'j1', n: 1, title: 'Remember to connect', sub: 'A timely moment, why it matters, its source, reaching out.', day: 'mon', steps: [
    { say: 'Tap Ben’s moment to open it.', sel: '#hero', done: () => S.seen.has('moment:ben_follow') },
    { say: 'See why it matters, then tap the source line to read your own words from Oct 8.', sel: '#m-src', done: () => S.seen.has('source:n_ben_oct8') },
    { say: 'Go back, then choose “Ask how it went”.', sel: () => cur().s === 'source' ? '.iconbtn[data-a="back"]' : '#m-primary', done: () => S.seen.has('handoff:ben') },
    { say: 'You’re in Messages. Kinship only opened it. Come back to Kinship.', sel: '#return2', done: () => S.seen.has('return:ben') },
    { say: 'Answer the return check: did you reach Ben?', sel: '#rc', done: () => S.convos.some((c) => c.p === 'ben') },
    { say: 'Optional: tell Kinship how it went (try it: a sensitive line will ask first), or tap Nothing.', sel: '#rc', done: () => S.convos.some((c) => c.p === 'ben') && !S.rc && !S.tell && !S.rv },
  ] },
  { id: 'j2', n: 2, title: 'Tell something meaningful', sub: 'A messy story: several people, a change, a vague date, a sensitive line.', day: 'mon', steps: [
    { say: 'Tap “Tell Kinship something…”.', sel: '#tellpill', done: () => !!S.tell || !!S.rv || !!S.j2 },
    { say: 'Paste the example story (button below), then tap Keep.', sel: '#tell-keep', act: 'Paste the story', run: () => { if (!S.tell) S.tell = { text: '', phase: 'write' }; S.tell.text = J2_TEXT; render(); }, done: () => !!S.rv || !!S.j2 },
    { say: 'Which Sam? Choose Sam Delgado.', sel: '#which-sam', done: () => (S.rv && S.rv.which) || !!S.j2 },
    { say: 'Priya’s mom’s surgery is sensitive. Decide whether to keep it.', sel: '[id^="held-yes-j_mom"]', done: () => (S.rv && S.rv.items.find((i) => i.id === 'j_mom').st !== 'held') || !!S.j2 },
    { say: 'Kinship kept the move date vague, as you said it. Tap “mid-November” and choose Sun, Nov 15.', sel: () => S.rv?.pop ? '#date-exact' : '#tok-j_priya_move', done: () => (S.rv && S.rv.items.find((i) => i.id === 'j_priya_move').date === 'exact') || !!S.j2 },
    { say: '“Sam loves Thai food” over-reads your words. Tap the sentence and correct it (the suggested fix is pre-filled), then Save.', sel: () => S.rv?.editing ? '#rv-save' : '#sent-j_sam_thai', done: () => (S.rv && S.rv.items.find((i) => i.id === 'j_sam_thai').edited) || !!S.j2 },
    { say: 'Tap a colored phrase in your words to see its line. Then Done.', sel: '#rv-done', done: () => !!S.j2 },
    { say: 'Kept, with Undo. Josh’s card now says Thursday.', sel: '.toast', done: () => !!S.j2 && !S.toast },
  ] },
  { id: 'j3', n: 3, title: 'Revisit someone’s life', sub: 'Find a detail, see where it came from, use it.', day: 'mon', steps: [
    { say: 'Open People.', sel: '#tab-people', done: () => S.seen.has('tab:people') || S.seen.has('person:rosa') },
    { say: 'Search for “flour”: which flour did Nonna want?', sel: '#pq', act: 'Type “flour”', run: () => { S.pq = 'flour'; render(); }, done: () => S.pq.includes('flour') || S.seen.has('person:rosa') },
    { say: 'Tap the result. Rosa’s notebook opens on that page.', sel: '[id^="hit-rosa"]', done: () => S.seen.has('person:rosa') },
    { say: 'Tap the highlighted words about the flour.', sel: '#device .np [data-id="rosa_flour"]', done: () => S.seen.has('line:rosa_flour') },
    { say: 'The line keeps your words and their source: “the 00 one”. Close it, open Now, then “Ideas for showing up”.', sel: () => S.sheet ? '.scrim-all' : (S.ptab.rosa === 'now' ? '#p-ideas' : '[data-v="now"]'), done: () => S.sheet?.k === 'ideas' || S.seen.has('assist:rosa_flour') },
    { say: 'Choose “Bring the 00 flour on Sunday”, then “Keep it in mind”: it adds Saturday to your own promise.', sel: () => S.sheet?.k === 'ideas' ? '#idea-rosa_flour' : S.sheet?.keep ? '#keep-save' : '#way-keep', done: () => !!S.pwhen.rosa_flour },
  ] },
  { id: 'j4', n: 4, title: 'A thoughtful gesture', sub: 'Beyond a message: grounded in what she said.', day: 'mon', steps: [
    { say: 'Swipe “Also coming up” and tap Maya’s birthday.', sel: '#card-maya_bday', done: () => S.seen.has('moment:maya_bday') },
    { say: 'Open “Ideas for showing up”. Ideas appear only when you ask.', sel: '#ideas-tog', done: () => S.ideasOpen || S.seen.has('assist:maya_book') },
    { say: 'Choose “Get her the book she keeps mentioning”.', sel: '#idea-maya_book', done: () => S.seen.has('assist:maya_book') },
    { say: 'See the help on offer (Find it is a future hand-off). Tap “Keep it in mind” and keep it for Thursday.', sel: () => S.sheet?.keep ? '#keep-save' : '#way-keep', done: () => S.intents.some((i) => i.p === 'maya') },
  ] },
  { id: 'j5', n: 5, title: 'Follow-through', sub: 'Your own intention comes back after the surgery.', day: 'wed', steps: [
    { say: 'Wednesday. Your promise to check in on Elena is back, quietly. Open it.', sel: '#hero', done: () => S.seen.has('moment:elena_prom') },
    { say: 'Open “Ideas for showing up” and choose “Bring dinner Thursday”.', sel: () => S.ideasOpen ? '#idea-elena_dinner' : '#ideas-tog', done: () => S.seen.has('assist:elena_dinner') || S.seen.has('handoff:elena') },
    { say: 'Tap “Help me start”, pick an opener, then “Open Messages with it”.', sel: () => S.sheet?.opener != null ? '#open-with' : S.sheet?.help ? '#opener-0' : '#way-help', done: () => S.seen.has('handoff:elena') },
    { say: 'Come back to Kinship.', sel: '#return2', done: () => S.seen.has('return:elena') },
    { say: 'Yes, you reached her. Then: did you offer to help?', sel: '#rc', done: () => S.rc?.step === 'remember' || S.extra.some((m) => m.p === 'elena') },
    { say: 'Tell Kinship what you arranged (paste below), Keep, answer the private line, Done.', sel: () => S.rv ? '#rv-done' : S.tell ? '#tell-keep' : '#rc-tell', act: 'Paste what happened', run: () => { if (!S.tell) S.tell = { p: 'elena', text: '', phase: 'write', after: true }; S.tell.text = AFTER.elena.text; render(); }, done: () => S.extra.some((m) => m.p === 'elena') },
  ] },
  { id: 'j6', n: 6, title: 'Connection becomes memory', sub: 'Dinner happened. What you tell enriches Sam’s notebook.', day: 'fri', steps: [
    { say: 'Friday evening. You took Sam out. Tap “I did this”.', sel: '[data-a="did"]', done: () => S.done.has('j_sam_promise') },
    { say: 'Tell Kinship how it went.', sel: '#rc-tell', done: () => !!S.tell || !!S.rv || S.extra.some((m) => m.p === 'sam') },
    { say: 'Paste what happened, then Keep.', sel: '#tell-keep', act: 'Paste what happened', run: () => { if (!S.tell) S.tell = { p: 'sam', text: '', phase: 'write', after: true }; S.tell.text = AFTER.sam.text; render(); }, done: () => !!S.rv || S.extra.some((m) => m.p === 'sam') },
    { say: 'Kin Khao is already known, so nothing is added twice. Tap Done.', sel: '#rv-done', done: () => S.extra.some((m) => m.p === 'sam') },
    { say: 'Sam’s notebook: the new page, what you did, and her new start date under Now.', sel: '[data-v="now"]', done: () => S.ptab.sam === 'now' && S.extra.some((m) => m.p === 'sam') },
  ] },
];
function startJourney(id) {
  const j = JOURNEYS.find((x) => x.id === id); J = id;
  const keepDense = S.dense, keepAnnot = S.annot, keepRm = S.rm;
  S = fresh(); S.dense = keepDense; S.annot = keepAnnot; S.rm = keepRm; S.day = j.day;
  if (j.day === 'wed' || j.day === 'fri') applyJ2Silently();
  render();
}
function applyJ2Silently() {
  startReview('j2', null, J2_TEXT); const r = S.rv; r.which = 'sam';
  r.items.forEach((it) => { if (it.id === 'j_mom') it.st = 'kept'; if (it.id === 'j_priya_move') it.date = 'exact'; if (it.id === 'j_sam_thai') { it.text = it.fix; it.edited = true; } });
  const items = r.items.map((i) => ({ ...i }));
  S.j2 = { items, text: J2_TEXT, keptLine: null, waiting: false }; S.rv = null;
}
function setDay(d) { J = null; const keep = { dense: S.dense, annot: S.annot, rm: S.rm }; S = fresh(); Object.assign(S, keep); S.day = d; if (d === 'wed' || d === 'fri' || d === 'quiet') applyJ2Silently(); render(); }
function curStep() { const j = JOURNEYS.find((x) => x.id === J); if (!j) return null; const i = j.steps.findIndex((s) => !s.done()); return { j, i }; }
function placeRing() {
  const dev = $('#device'); const old = $('.hint-ring', dev); if (old) old.remove();
  const c = curStep(); if (!c || c.i < 0) return;
  const step = c.j.steps[c.i]; let sel = typeof step.sel === 'function' ? step.sel() : step.sel; if (!sel) return;
  const el = $(sel, dev); if (!el) return;
  const d = dev.getBoundingClientRect(); const r = el.getBoundingClientRect();
  if (r.bottom < d.top || r.top > d.bottom) return;
  const ring = document.createElement('div'); ring.className = 'hint-ring'; const k = d.width / 368 || 1;
  const t = Math.max((r.top - d.top) / k - 4, 2), l = Math.max((r.left - d.left) / k - 4, 2);
  Object.assign(ring.style, { top: t + 'px', left: l + 'px', width: Math.min(r.width / k + 8, 368 - l - 2) + 'px', height: Math.min(r.height / k + 8, (d.bottom - r.top) / k) + 'px' });
  dev.appendChild(ring);
}
document.addEventListener('scroll', (e) => { placeRing(); const sc = e.target; if (sc && sc.classList && sc.classList.contains('scr')) $('#device').classList.toggle('scrolled', sc.scrollTop > 120); }, true);

function renderRail() {
  const rail = $('#rail'); if (!rail) return;
  const c = curStep();
  let h = `<h3>Journeys</h3><div class="jlist">`;
  JOURNEYS.forEach((j) => {
    h += `<button class="jbtn ${J === j.id ? 'on' : ''}" data-r="journey" data-v="${j.id}"><b>${j.n}</b><span>${esc(j.title)}</span><small>${esc(j.sub)}</small></button>`;
    if (J === j.id && c) {
      h += `<ol class="steps">${j.steps.map((s, i) => `<li class="${i < c.i || c.i < 0 ? 'done' : i === c.i ? 'now' : ''}">${esc(s.say)}${i === c.i && s.act ? `<br><button class="b b-xs b-ghost" style="margin-top:6px;box-shadow:inset 0 0 0 1.5px var(--line);color:var(--fg)" data-r="act" data-v="${i}">${esc(s.act)}</button>` : ''}</li>`).join('')}</ol>`;
      if (c.i < 0) h += `<div class="jdone">Journey complete. Try another, or keep exploring from here.</div>`;
    }
  });
  h += `</div><h3>Day</h3><div class="seg">${[['first', 'First run'], ['mon', 'Mon 2'], ['wed', 'Wed 4'], ['fri', 'Fri 6'], ['quiet', 'Quiet day']].map(([k, l]) => `<button class="${S.day === k ? 'on' : ''}" data-r="day" data-v="${k}">${l}</button>`).join('')}</div>
  <h3>Density</h3><div class="seg"><button class="${!S.dense ? 'on' : ''}" data-r="dense" data-v="0">Typical · 14 people</button><button class="${S.dense ? 'on' : ''}" data-r="dense" data-v="1">Dense · 35 people, Leo’s 2 years</button></div>
  <h3>Jump to a state</h3><div class="seg"><button data-r="go" data-v="aiko">Sparse person</button><button data-r="go" data-v="elena">No photo</button><button data-r="go" data-v="leo">Dense notebook</button><button data-r="go" data-v="source">A source</button></div>
  <h3>Overlay</h3><label class="toggle">Show what’s built vs proposed<input type="checkbox" data-r="annot" ${S.annot ? 'checked' : ''}></label><label class="toggle">Reduce motion<input type="checkbox" data-r="rm" ${S.rm ? 'checked' : ''}></label>
  <div class="legend"><span><i class="t-built">BUILT</i>on main</span><span><i class="t-alpha">ALPHA</i>PR #74/#75, unmerged</span><span><i class="t-proposed">PROPOSED</i>this design</span><span><i class="t-future">FUTURE</i>integration, later</span></div>
  <p class="fine">Fictional people and notes. Browser prototype: design evidence only, not native evidence. Readiness: NOT READY.</p>`;
  rail.innerHTML = h;
}
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-r]'); if (!el) return;
  const r = el.dataset.r, v = el.dataset.v;
  if (r === 'journey') startJourney(v);
  if (r === 'act') { const c = curStep(); c.j.steps[+v].run(); }
  if (r === 'day') setDay(v);
  if (r === 'dense') { S.dense = v === '1'; render(); }
  if (r === 'go') {
    J = null;
    if (v === 'aiko') { S.stack = [{ s: 'people' }, { s: 'person', p: 'aiko' }]; }
    if (v === 'elena') { S.stack = [{ s: 'people' }, { s: 'person', p: 'elena' }]; S.ptab.elena = 'now'; }
    if (v === 'leo') { S.dense = true; S.stack = [{ s: 'people' }, { s: 'person', p: 'leo' }]; S.ptab.leo = 'pages'; }
    if (v === 'source') { S.stack = [{ s: 'today' }, { s: 'source', id: 'n_rosa_oct4' }]; }
    S.sheet = null; S.tell = null; S.rv = null; S.handoff = null; S.anim = 'push'; render();
  }
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-r]'); if (!el) return;
  if (el.dataset.r === 'annot') { S.annot = el.checked; render(); }
  if (el.dataset.r === 'rm') { S.rm = el.checked; render(); }
});

/* ───────── screenshot states (#shot=name) ───────── */
const SHOTS = {
  'today-mon': () => {},
  'moment-ben': () => { S.stack.push({ s: 'moment', id: 'ben_follow' }); S.ideasOpen = true; },
  'moment-maya-ideas': () => { S.stack.push({ s: 'moment', id: 'maya_bday' }); S.ideasOpen = true; S.scrollTo = '#ideas-tog'; },
  'assist-maya': () => { S.stack.push({ s: 'moment', id: 'maya_bday' }); S.ideasOpen = true; S.sheet = { k: 'assist', p: 'maya', id: 'maya_book', keep: true, when: 'Thursday' }; },
  'people': () => { S.stack = [{ s: 'people' }]; },
  'people-search': () => { S.stack = [{ s: 'people' }]; S.pq = 'flour'; },
  'people-dense': () => { S.dense = true; S.stack = [{ s: 'people' }]; },
  'person-ben': () => { S.stack = [{ s: 'people' }, { s: 'person', p: 'ben' }]; S.scrollTo = '.segc'; },
  'person-rosa-pages': () => { S.stack = [{ s: 'people' }, { s: 'person', p: 'rosa', focusNote: 'n_rosa_oct4' }]; S.ptab.rosa = 'pages'; S.scrollTo = '#np-n_rosa_oct4'; },
  'person-leo-knows': () => { S.stack = [{ s: 'people' }, { s: 'person', p: 'leo' }]; S.ptab.leo = 'knows'; S.scrollTo = '.segc'; },
  'person-leo-dense': () => { S.dense = true; S.stack = [{ s: 'people' }, { s: 'person', p: 'leo' }]; S.ptab.leo = 'pages'; S.scrollTo = '.segc'; },
  'person-aiko': () => { S.stack = [{ s: 'people' }, { s: 'person', p: 'aiko' }]; },
  'person-elena': () => { S.day = 'wed'; applyJ2Silently(); S.stack = [{ s: 'people' }, { s: 'person', p: 'elena' }]; },
  'line-rosa': () => { S.stack = [{ s: 'people' }, { s: 'person', p: 'rosa' }]; S.sheet = { k: 'line', id: 'rosa_flour' }; },
  'source-rosa': () => { S.stack = [{ s: 'today' }, { s: 'source', id: 'n_rosa_oct4', focusMem: 'rosa_flour' }]; },
  'tell': () => { S.tell = { text: J2_TEXT, phase: 'write' }; },
  'review-j2': () => { startReview('j2', null, J2_TEXT); },
  'review-j2-fixing': () => { startReview('j2', null, J2_TEXT); S.rv.which = 'sam'; S.rv.items.find((i) => i.id === 'j_mom').st = 'kept'; S.rv.pop = 'j_priya_move'; S.scrollTo = '#row-j_priya_move'; },
  'review-j2-edit': () => { startReview('j2', null, J2_TEXT); S.rv.which = 'sam'; S.rv.items.find((i) => i.id === 'j_mom').st = 'kept'; S.rv.editing = 'j_sam_thai'; S.scrollTo = '#row-j_sam_thai'; },
  'rc-ben': () => { S.rc = { p: 'ben', step: 'ask', about: 'the marathon', trail: 'You messaged · Mon, Nov 2', verb: 'You messaged' }; },
  'rc-elena-plan': () => { S.day = 'wed'; applyJ2Silently(); S.convos.push({ p: 'elena', text: 'You messaged · Nov 4', about: 'About bringing dinner Thursday', on: 'Wed, Nov 4' }); S.rc = { p: 'elena', step: 'plan', planAsk: 'Did you offer to help?', about: 'bringing dinner Thursday', trail: 'You messaged · Wed, Nov 4' }; S.dismissed.add('elena_prom'); },
  'handoff': () => { S.day = 'wed'; applyJ2Silently(); S.handoff = { p: 'elena', opener: OPENERS.elena_dinner[0], about: 'bringing dinner Thursday' }; },
  'today-wed': () => { S.day = 'wed'; applyJ2Silently(); },
  'moment-elena': () => { S.day = 'wed'; applyJ2Silently(); S.stack.push({ s: 'moment', id: 'elena_prom' }); S.ideasOpen = true; },
  'today-fri': () => { S.day = 'fri'; applyJ2Silently(); },
  'today-quiet': () => { S.day = 'quiet'; applyJ2Silently(); },
  'today-first': () => { S.day = 'first'; },
  'review-sam-after': () => { S.day = 'fri'; applyJ2Silently(); startReview('after', 'sam', AFTER.sam.text); },
  'person-sam-after': () => { S.day = 'fri'; applyJ2Silently(); S.done.add('j_sam_promise'); S.rv = null; startReview('after', 'sam', AFTER.sam.text); const r = S.rv; S.notesExtra.n_after_sam = { date: 'Fri, Nov 6', long: 'Friday, November 6', text: r.text }; S.extra.push(...r.items.filter((i) => i.st === 'kept').map((i) => ({ ...i, src: 'n_after_sam' }))); S.rv = null; S.stack = [{ s: 'today' }, { s: 'person', p: 'sam' }]; S.ptab.sam = 'pages'; S.scrollTo = '.segc'; },
  'person-sam-now': () => { SHOTS['person-sam-after'](); S.ptab.sam = 'now'; },
};

/* ───────── shell ───────── */
function boot() {
  const shot = /#shot=([\w-]+)/.exec(location.hash);
  if (shot && SHOTS[shot[1]]) {
    document.body.classList.add('shot');
    S.annot = /annot/.test(location.hash);
    SHOTS[shot[1]]();
    render();
    if (S.scrollTo) render();
    return;
  }
  render();
}
function fitPhone() {
  const wrap = document.querySelector('.phone-wrap'), ph = document.getElementById('phone'); if (!wrap || !ph || document.body.classList.contains('shot')) return;
  const avail = wrap.clientWidth || 390; const k = Math.min(1, avail / 390);
  wrap.classList.toggle('fit', k < 1); ph.style.transform = k < 1 ? `scale(${k})` : ''; wrap.style.height = k < 1 ? `${844 * k}px` : '';
}
window.addEventListener('resize', fitPhone);
window.addEventListener('DOMContentLoaded', () => { boot(); fitPhone(); });
