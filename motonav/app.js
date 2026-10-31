/* MotoNav: multi-stop route planner, motorcycle first. Everything is stored on
 * the device (localStorage). Text from imports and searches is always put into
 * the page with textContent, never as HTML. */
(function () {
  'use strict';
  var Opt = window.MotoOpt, Routing = window.MotoRouting, Geo = window.MotoGeo;
  var KEY = 'motonav.v1';
  var MAX_STOPS = 300;
  var DEMO_SERVER = 'https://valhalla1.openstreetmap.de';

  var TEXT = {
    tr: {
      home: 'Ana sayfa', routes: 'Rotalar', book: 'Adres defteri', more: 'Diğer',
      newRoute: 'Yeni rota oluştur', addHere: 'Bulunduğum konumu durak ekle', favorites: 'Favori duraklar',
      reports: 'Raporlar', importStops: 'Durakları içe aktar', backup: 'Yedekle ve geri yükle', settings: 'Ayarlar',
      help: 'Yardım', share: 'Uygulamayı paylaş', noRoutes: 'Henüz rota yok. Bir rota oluşturun.',
      routeName: 'Rota adı', stops: 'DURAK', search: 'Adres ara (Enter ile)', add: 'Ekle', optimise: 'Optimize et',
      navigate: 'Yol tarifi', done: 'Tamam', fail: 'Olmadı', remove: 'Sil', note: 'Not', save: 'Kaydet', cancel: 'Vazgeç',
      list: 'Liste', map: 'Harita', start: 'Başlangıç', end: 'Bitiş', myLocation: 'Konumum', auto: 'Otomatik',
      backToStart: 'Başlangıç durağına dön', method: 'Optimizasyon yöntemi', byDuration: 'En kısa süre',
      byDistance: 'En kısa mesafe', mode: 'Araç', motorcycle: 'Motosiklet', car: 'Araba', bicycle: 'Bisiklet',
      walking: 'Yaya', useFerry: 'Feribot kullan', useTolls: 'Ücretli yollar', useHighways: 'Otoyol kullan',
      startTime: 'Rota başlangıç saati', service: 'Durakta bekleme (dk)', addFromBook: 'Adres defterinden ekle',
      pasteCoords: 'Koordinat yapıştır (enlem,boylam)', createStop: 'Yeni durak oluştur', needTwo: 'En az 2 durak gerekir.',
      planning: 'Planlanıyor...', planned: 'Rota hazır.', approx: 'Tahmini: yol verisine ulaşılamadı, kuş uçuşu hesap kullanıldı.',
      maxStops: 'Bir rotada en fazla 300 durak olabilir.', notFound: 'Adres bulunamadı.', added: 'Durak eklendi.',
      locDenied: 'Konum izni yok. İlk durak başlangıç olarak kullanıldı.', copy: 'Kopyala', deleteRoute: 'Rotayı sil',
      sure: 'Emin misiniz?', name: 'Ad', address: 'Adres', phone: 'Telefon', favorite: 'Favori', fav: 'Favori',
      template: 'Şablondan not ekle', templates: 'Not şablonları (her satır bir şablon)', from: 'Başlangıç', to: 'Bitiş',
      filter: 'Filtrele', date: 'Tarih', distance: 'Mesafe', server: 'Rota sunucusu adresi', language: 'Dil',
      theme: 'Tema', navApp: 'Navigasyon uygulaması', export: 'Yedeği indir', import: 'Yedeği yükle', clear: 'Tüm verileri sil',
      importDone: 'içe aktarıldı', skipped: 'atlandı', geocoding: 'Adresler konuma çevriliyor', demoWarn: 'Demo sunucu yalnızca deneme içindir; yayın için kendi sunucunuzu girin.',
      noMap: 'Harita yüklenemedi (internet yok olabilir). Liste görünümü kullanılıyor.', waiting: 'Bekliyor',
      nothing: 'Kayıt yok.', addToRoute: 'Rotaya ekle', open: 'Aç', voice: 'Sesle yaz', noVoice: 'Bu tarayıcı sesli girişi desteklemiyor.',
      pickRoute: 'Hangi rotaya eklensin?', navPrep: 'En kısa mesafe rotası hazırlanıyor...', navNoLoc: 'Konum alınamadı. Navigasyon uygulaması kendi rotasını seçecek.', navNoRoute: 'Yol verisi alınamadı. Navigasyon uygulaması kendi rotasını seçecek.', navShortest: 'En kısa mesafe:', navVia: 'ara nokta', navNote: 'En kısa mesafe seçiliyse navigasyona geçerken rota, ara noktalarla Google Haritalar veya Yandex\'a aktarılır. Diğer uygulamalar kendi rotasını seçer.', dark: 'Koyu', light: 'Açık', autoTheme: 'Otomatik', pending: 'bekleyen'
    },
    en: {
      home: 'Home', routes: 'Routes', book: 'Address book', more: 'More',
      newRoute: 'Create a new route', addHere: 'Add current location as stop', favorites: 'Favorite stops',
      reports: 'Reports', importStops: 'Import stops', backup: 'Backup and restore', settings: 'Settings',
      help: 'Help', share: 'Share this app', noRoutes: 'No routes yet. Create one.',
      routeName: 'Route name', stops: 'STOPS', search: 'Search address (press Enter)', add: 'Add', optimise: 'Optimise',
      navigate: 'Navigate', done: 'Done', fail: 'Failed', remove: 'Remove', note: 'Note', save: 'Save', cancel: 'Cancel',
      list: 'List', map: 'Map', start: 'Start', end: 'End', myLocation: 'My location', auto: 'Auto select',
      backToStart: 'Back to the starting stop', method: 'Optimisation method', byDuration: 'Shortest time',
      byDistance: 'Shortest distance', mode: 'Vehicle', motorcycle: 'Motorcycle', car: 'Car', bicycle: 'Bicycle',
      walking: 'Walking', useFerry: 'Use ferry', useTolls: 'Use tolls', useHighways: 'Use highways',
      startTime: 'Route start time', service: 'Time at stop (min)', addFromBook: 'Add from address book',
      pasteCoords: 'Paste coordinates (lat,lng)', createStop: 'Create a new stop', needTwo: 'At least 2 stops are needed.',
      planning: 'Planning...', planned: 'Route ready.', approx: 'Estimate: road data was not reachable, straight-line figures were used.',
      maxStops: 'A route can have at most 300 stops.', notFound: 'Address not found.', added: 'Stop added.',
      locDenied: 'No location permission. The first stop was used as the start.', copy: 'Copy', deleteRoute: 'Delete route',
      sure: 'Are you sure?', name: 'Name', address: 'Address', phone: 'Phone', favorite: 'Favorite', fav: 'Favorite',
      template: 'Add note from template', templates: 'Note templates (one per line)', from: 'From', to: 'To',
      filter: 'Filter', date: 'Date', distance: 'Distance', server: 'Routing server address', language: 'Language',
      theme: 'Theme', navApp: 'Navigation app', export: 'Download backup', import: 'Load backup', clear: 'Delete all data',
      importDone: 'imported', skipped: 'skipped', geocoding: 'Looking up addresses', demoWarn: 'The demo server is for testing only; enter your own server for real use.',
      noMap: 'The map could not load (you may be offline). Using the list view.', waiting: 'Waiting',
      nothing: 'Nothing here.', addToRoute: 'Add to route', open: 'Open', voice: 'Speak', noVoice: 'This browser has no voice input.',
      pickRoute: 'Add to which route?', navPrep: 'Preparing the shortest-distance route...', navNoLoc: 'No location. The navigation app will pick its own route.', navNoRoute: 'No road data. The navigation app will pick its own route.', navShortest: 'Shortest distance:', navVia: 'via points', navNote: 'With shortest distance, MotoNav hands the route to Google Maps or Yandex with via points. Other apps pick their own route.', dark: 'Dark', light: 'Light', autoTheme: 'Auto', pending: 'pending'
    }
  };
  var ICON = { motorcycle: '🏍️', car: '🚗', bicycle: '🚲', walking: '🚶' };

  // ---------- state
  function fresh() {
    return { routes: [], book: [], templates: [], settings: { lang: 'tr', theme: 'auto', server: DEMO_SERVER, navApp: 'google', mode: 'motorcycle' }, ui: {} };
  }
  var S = fresh();
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) { var d = JSON.parse(raw); S = Object.assign(fresh(), d); S.settings = Object.assign(fresh().settings, d.settings); } } catch (e) { /* private mode */ }
    S.ui = { view: 'home', tab: 'list' };
  }
  function save() { try { var c = Object.assign({}, S); delete c.ui; localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* storage full or blocked */ } }
  function t(k) { return (TEXT[S.settings.lang] || TEXT.tr)[k] || k; }
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function route() { return S.routes.filter(function (r) { return r.id === S.ui.routeId; })[0]; }

  // ---------- tiny DOM helper
  function h(tag, attrs) {
    var el = document.createElement(tag), kids = Array.prototype.slice.call(arguments, 2);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (k.indexOf('aria-') === 0 && typeof v === 'boolean') { el.setAttribute(k, String(v)); return; }
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    kids.forEach(function (c) { (Array.isArray(c) ? c : [c]).forEach(function (x) { if (x != null && x !== false) el.appendChild(typeof x === 'string' || typeof x === 'number' ? document.createTextNode(String(x)) : x); }); });
    return el;
  }
  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast'); el.textContent = msg; el.className = 'show';
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.className = ''; }, 4000);
  }
  function applyTheme() {
    var th = S.settings.theme;
    if (th === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', th);
    document.documentElement.lang = S.settings.lang;
  }

  // ---------- sheets
  function sheet(title, body) {
    var ov = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': title,
      onclick: function (e) { if (e.target === ov) close(); } });
    function close() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.appendChild(h('div', { class: 'sheet' }, h('h2', null, title), body(close)));
    document.body.appendChild(ov);
    var first = ov.querySelector('input, button, select'); if (first) first.focus();
    return close;
  }
  function confirmSheet(msg, ok) {
    sheet(msg, function (close) {
      return h('div', { class: 'row' }, h('button', { onclick: close }, t('cancel')),
        h('button', { class: 'primary', onclick: function () { close(); ok(); } }, 'OK'));
    });
  }

  // ---------- views
  function render() {
    applyTheme();
    var app = document.getElementById('app'); app.textContent = '';
    var v = S.ui.view;
    if (v === 'route') app.appendChild(routeView());
    else app.appendChild(shell(v));
    if (v === 'route') afterRouteRender();
  }

  function shell(v) {
    var body = v === 'home' ? homeView() : v === 'routes' ? routesView() : v === 'book' ? bookView() :
      v === 'reports' ? reportsView() : v === 'settings' ? settingsView() : v === 'backup' ? backupView() : homeView();
    var tab = { home: 'home', routes: 'routes', book: 'book', reports: 'more', settings: 'more', backup: 'more' }[v] || 'home';
    function tb(view, ico, label, key) {
      return h('button', { 'aria-current': tab === key ? 'page' : null, onclick: function () { S.ui.view = view; render(); } },
        h('span', { class: 'ico', 'aria-hidden': 'true' }, ico), label);
    }
    return h('div', { class: 'screen' }, body,
      h('nav', { class: 'tabs' }, tb('home', '⌂', t('home'), 'home'), tb('routes', '⤓', t('routes'), 'routes'),
        tb('book', '⌖', t('book'), 'book'), tb('settings', '⋯', t('more'), 'more')));
  }

  function barOnly(title) { return h('div', { class: 'bar' }, h('h1', null, title)); }

  function homeView() {
    function card(ico, label, fn) { return h('button', { onclick: fn }, h('span', { class: 'ico', 'aria-hidden': 'true' }, ico), label); }
    return h('div', { class: 'screen' }, barOnly('MotoNav'),
      h('div', { class: 'scroll' }, h('div', { class: 'menu' },
        card('➕', t('newRoute'), newRoute),
        card('📍', t('addHere'), addHere),
        card('⭐', t('favorites'), function () { S.ui.view = 'book'; S.ui.onlyFav = true; render(); }),
        card('📊', t('reports'), function () { S.ui.view = 'reports'; render(); }),
        card('⬇', t('importStops'), importSheet),
        card('🔄', t('backup'), function () { S.ui.view = 'backup'; render(); }),
        card('⚙', t('settings'), function () { S.ui.view = 'settings'; render(); }),
        card('❓', t('help'), helpSheet),
        card('🔗', t('share'), shareApp))));
  }

  function helpSheet() {
    sheet(t('help'), function (close) {
      var lines = S.settings.lang === 'tr' ?
        ['1. Yeni rota oluşturun, adres arayın ve durak ekleyin.', '2. "Optimize et" ile araç türünü (motosiklet varsayılan) ve en kısa süre ya da en kısa mesafeyi seçin.',
          '3. "Yol tarifi" ile sıradaki durağı Google Maps, Waze, Yandex ya da Apple Haritalar\'da açın.', '4. Her durağı Tamam ya da Olmadı olarak işaretleyin.',
          'Veriler yalnızca bu cihazda saklanır. Hesap gerekmez.'] :
        ['1. Create a route, search addresses and add stops.', '2. Tap Optimise and pick the vehicle (motorcycle by default) and shortest time or distance.',
          '3. Tap Navigate to open the next stop in Google Maps, Waze, Yandex or Apple Maps.', '4. Mark each stop Done or Failed.',
          'Data stays on this device. No account needed.'];
      return h('div', null, lines.map(function (l) { return h('p', null, l); }), h('button', { class: 'primary', onclick: close }, 'OK'));
    });
  }
  function shareApp() {
    var data = { title: 'MotoNav', url: location.href.split('#')[0] };
    if (navigator.share) navigator.share(data).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(data.url).then(function () { toast(t('copy') + ' OK'); });
  }

  function newRoute() {
    var r = { id: uid(), name: (S.settings.lang === 'tr' ? 'Rota ' : 'Route ') + (S.routes.length + 1), mode: S.settings.mode || 'motorcycle',
      method: 'duration', useHighways: true, useTolls: true, useFerry: true, startTime: '08:00', start: 'me', end: 'auto',
      stops: [], plan: null, createdAt: new Date().toISOString() };
    S.routes.unshift(r); S.ui.routeId = r.id; S.ui.view = 'route'; S.ui.tab = 'list'; save(); render();
    return r;
  }
  function openRoute(id) { S.ui.routeId = id; S.ui.view = 'route'; S.ui.tab = 'list'; render(); }

  function routesView() {
    var list = S.routes.map(function (r) {
      var pending = r.stops.filter(function (s) { return s.status === 'waiting'; }).length;
      return h('button', { class: 'card', style: 'width:100%;text-align:left;display:block;height:auto;padding:12px', onclick: function () { openRoute(r.id); } },
        h('strong', null, r.name), h('div', { class: 'muted' },
          ICON[r.mode] + ' ' + r.stops.length + ' ' + t('stops').toLowerCase() + ' · ' + pending + ' ' + t('pending') +
          (r.plan ? ' · ' + Geo.fmtDistance(r.plan.distance) + ' · ' + Geo.fmtDuration(r.plan.duration) : '')));
    });
    return h('div', { class: 'screen' }, barOnly(t('routes')),
      h('div', { class: 'scroll' }, h('button', { class: 'primary', style: 'width:100%;margin-bottom:12px', onclick: newRoute }, '➕ ' + t('newRoute')),
        list.length ? list : h('p', { class: 'muted' }, t('noRoutes'))));
  }

  // ---------- route view
  var map, layer, mapReady = false;
  function routeView() {
    var r = route();
    if (!r) { S.ui.view = 'routes'; return shell('routes'); }
    var search = h('input', { type: 'search', placeholder: t('search'), 'aria-label': t('search'), autocomplete: 'off', id: 'q',
      value: S.ui.query || '', oninput: function (e) { S.ui.query = e.target.value; localResults(); },
      onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); onlineSearch(); } } });
    var mic = h('button', { class: 'fit', 'aria-label': t('voice'), onclick: function () { voice(function (txt) { search.value = txt; S.ui.query = txt; onlineSearch(); }); } }, '🎙');
    var results = h('div', { class: 'results', id: 'results', hidden: true });
    var pendingStops = r.stops.filter(function (s) { return s.status === 'waiting'; });
    var banner = h('div', { class: 'banner' }, h('span', null, ICON[r.mode]),
      r.plan ? h('span', null, Geo.fmtDistance(r.plan.distance) + ' / ' + Geo.fmtDuration(r.plan.duration)) : h('span', { class: 'muted' }, r.stops.length + ' ' + t('stops').toLowerCase()),
      r.plan && r.plan.approx ? h('span', { class: 'warn' }, t('approx') + (r.plan.reason ? ' (' + r.plan.reason + ')' : '')) : null);
    var seg = h('div', { class: 'seg', role: 'group' },
      h('button', { 'aria-pressed': S.ui.tab === 'list', onclick: function () { S.ui.tab = 'list'; render(); } }, '☰ ' + t('list')),
      h('button', { 'aria-pressed': S.ui.tab === 'map', onclick: function () { S.ui.tab = 'map'; render(); } }, '🗺 ' + t('map')));
    var main = S.ui.tab === 'map' ? h('div', { id: 'map', role: 'application', 'aria-label': t('map') }) :
      h('div', { class: 'scroll', id: 'stoplist' }, r.stops.length ? r.stops.map(function (s, i) { return stopCard(r, s, i); }) : h('p', { class: 'muted' }, t('nothing')));
    return h('div', { class: 'screen' },
      h('div', { class: 'bar' },
        h('button', { class: 'ghost fit', 'aria-label': t('routes'), onclick: function () { S.ui.view = 'routes'; teardownMap(); render(); } }, '←'),
        h('input', { 'aria-label': t('routeName'), value: r.name, style: 'flex:1;border:0;background:transparent;font-size:21px;font-weight:650',
          onchange: function (e) { r.name = e.target.value.trim() || r.name; save(); } }),
        h('button', { class: 'ghost fit danger', 'aria-label': t('deleteRoute'), onclick: function () {
          confirmSheet(t('deleteRoute') + '? ' + t('sure'), function () { S.routes = S.routes.filter(function (x) { return x !== r; }); S.ui.view = 'routes'; teardownMap(); save(); render(); }); } }, '🗑')),
      h('div', { class: 'search' }, h('div', { class: 'row' }, search, mic), results),
      banner, h('div', { style: 'padding:8px 12px' }, seg), main,
      h('div', { class: 'row', style: 'padding:8px 12px calc(8px + env(safe-area-inset-bottom));background:var(--surface);border-top:1px solid var(--border)' },
        h('button', { class: 'primary', onclick: function () { optimiseSheet(r); } }, '⚡ ' + t('optimise')),
        h('button', { class: 'fit', disabled: !pendingStops.length, 'aria-label': t('navigate'), onclick: function () { navigateTo(r, pendingStops[0]); } }, '➤ ' + t('navigate')),
        h('button', { class: 'fit', 'aria-label': t('add'), onclick: function () { addSheet(r); } }, '➕')));
  }

  function stopCard(r, s, i) {
    var time = r.plan && r.plan.times && r.plan.times[s.id] != null ? Geo.fmtClock(r.plan.times[s.id]) : '';
    return h('div', { class: 'card stop ' + (s.status === 'waiting' ? '' : s.status) },
      h('div', { class: 'num', 'aria-label': (i + 1) }, i + 1),
      h('div', null, h('div', { class: 'label' }, s.label || s.address), s.address && s.label ? h('div', { class: 'muted' }, s.address) : null,
        s.note ? h('span', { class: 'chip' }, s.note) : null, s.service ? h('span', { class: 'chip' }, '⏱ ' + s.service) : null,
        s.phone ? h('span', { class: 'chip' }, '☎ ' + s.phone) : null),
      h('div', { class: 'time' }, time),
      h('div', { class: 'acts' },
        h('button', { 'aria-label': t('navigate'), onclick: function () { navigateTo(r, s); } }, '➤'),
        h('button', { 'aria-label': t('done'), onclick: function () { s.status = s.status === 'done' ? 'waiting' : 'done'; save(); render(); } }, '✔'),
        h('button', { 'aria-label': t('fail'), onclick: function () { s.status = s.status === 'failed' ? 'waiting' : 'failed'; save(); render(); } }, '✖'),
        s.phone ? h('a', { href: 'tel:' + s.phone.replace(/[^\d+]/g, ''), 'aria-label': t('phone'), style: 'display:grid;place-items:center;min-height:48px;min-width:56px;flex:1;border:1px solid var(--border);border-radius:14px;background:var(--surface-2);color:inherit;text-decoration:none' }, '☎') : null,
        h('button', { 'aria-label': t('note'), onclick: function () { noteSheet(r, s); } }, '✎'),
        h('button', { class: 'danger', 'aria-label': t('remove'), onclick: function () { r.stops = r.stops.filter(function (x) { return x !== s; }); r.plan = null; save(); render(); } }, '🗑')));
  }

  function noteSheet(r, s) {
    sheet(t('note') + ': ' + (s.label || s.address), function (close) {
      var ta = h('textarea', { 'aria-label': t('note') }, ''); ta.value = s.note || '';
      var svc = h('input', { type: 'number', min: '0', max: '600', value: String(s.service || 0), 'aria-label': t('service') });
      var tpl = S.templates.map(function (x) { return h('button', { onclick: function () { ta.value = (ta.value ? ta.value + '\n' : '') + x.text; } }, x.text); });
      return h('div', null, h('label', null, t('note')), ta,
        h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { onclick: function () { voice(function (txt) { ta.value = (ta.value ? ta.value + ' ' : '') + txt; }); } }, '🎙 ' + t('voice'))),
        S.templates.length ? h('div', null, h('label', null, t('template')), tpl) : null,
        h('label', null, t('service')), svc,
        h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { onclick: close }, t('cancel')),
          h('button', { class: 'primary', onclick: function () { s.note = ta.value.trim(); s.service = Math.max(0, parseInt(svc.value, 10) || 0); save(); close(); render(); } }, t('save'))));
    });
  }

  function openNav(url) {
    var launcher = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AppLauncher;
    if (launcher) { launcher.openUrl({ url: url }).catch(function () { window.open(url, '_blank', 'noopener'); }); return; }
    window.open(url, '_blank', 'noopener');
  }
  /* With "shortest distance" the navigation app would pick its own fastest route, so MotoNav
   * works out the shortest road from where you are, and gives the app points along it. */
  function navigateTo(r, s) {
    if (!s) return;
    var app = S.settings.navApp;
    if (r.method !== 'distance' || !Geo.supportsVia(app) || !S.settings.server) { openNav(Geo.navLink(app, s, r.mode)); return; }
    toast(t('navPrep'));
    locate().then(function (me) {
      if (!me) { toast(t('navNoLoc')); openNav(Geo.navLink(app, s, r.mode)); return; }
      var opts = { mode: r.mode, method: 'distance', useHighways: r.useHighways, useTolls: r.useTolls, useFerry: r.useFerry, server: S.settings.server };
      return Routing.geometry([{ lat: me.lat, lng: me.lng }, s], opts, window.fetch.bind(window)).then(function (g) {
        if (!g) { toast(t('navNoRoute')); openNav(Geo.navLink(app, s, r.mode)); return; }
        var via = Routing.sampleVia(g.line, 8);
        toast(t('navShortest') + ' ' + Geo.fmtDistance(g.distance) + (via.length ? ' (' + via.length + ' ' + t('navVia') + ')' : ''));
        openNav(Geo.navLink(app, s, r.mode, via));
      });
    });
  }

  // ---------- adding stops
  function addStop(r, p) {
    if (r.stops.length >= MAX_STOPS) { toast(t('maxStops')); return false; }
    r.stops.push({ id: uid(), label: p.label || '', address: p.address || '', lat: p.lat, lng: p.lng, phone: p.phone || '', note: p.note || '', service: 0, status: 'waiting' });
    r.plan = null; save(); return true;
  }
  function addSheet(r) {
    sheet(t('add'), function (close) {
      function item(ico, label, fn) { return h('button', { style: 'width:100%;text-align:left;margin-bottom:8px;justify-content:flex-start', onclick: function () { close(); fn(); } }, ico + '  ' + label); }
      return h('div', null,
        item('☰', t('addFromBook'), function () { pickFromBook(r); }),
        item('📍', t('addHere'), function () { addHere(r); }),
        item('📋', t('pasteCoords'), function () { coordsSheet(r); }),
        item('➕', t('createStop'), function () { createStopSheet(r); }),
        item('⬇', t('importStops'), function () { importSheet(r); }),
        h('button', { onclick: close }, t('cancel')));
    });
  }
  function addHere(r) {
    r = r && r.stops ? r : null;
    locate().then(function (p) {
      if (!p) { toast(t('locDenied')); return; }
      var target = r || (route() || newRoute());
      addStop(target, { label: t('myLocation'), lat: p.lat, lng: p.lng }); toast(t('added')); render();
    });
  }
  function coordsSheet(r) {
    sheet(t('pasteCoords'), function (close) {
      var inp = h('input', { placeholder: '41.0082, 28.9784' });
      return h('div', null, inp, h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { onclick: close }, t('cancel')),
        h('button', { class: 'primary', onclick: function () {
          var c = Geo.parseCoords(inp.value); if (!c) { toast(t('notFound')); return; }
          close(); addStop(r, { label: c.lat.toFixed(5) + ', ' + c.lng.toFixed(5), lat: c.lat, lng: c.lng }); render();
        } }, t('add'))));
    });
  }
  function createStopSheet(r) {
    sheet(t('createStop'), function (close) {
      var name = h('input'), addr = h('input'), phone = h('input', { type: 'tel' });
      return h('div', null, h('label', null, t('name')), name, h('label', null, t('address')), addr, h('label', null, t('phone')), phone,
        h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { onclick: close }, t('cancel')),
          h('button', { class: 'primary', onclick: function () {
            var q = addr.value.trim(); if (!q) return;
            var c = Geo.parseCoords(q);
            (c ? Promise.resolve([{ lat: c.lat, lng: c.lng, display_name: q }]) : geocode(q)).then(function (res) {
              if (!res.length) { toast(t('notFound')); return; }
              close(); addStop(r, { label: name.value.trim(), address: res[0].display_name, lat: +res[0].lat, lng: +res[0].lon || +res[0].lng, phone: phone.value.trim() }); render();
            });
          } }, t('add'))));
    });
  }
  function pickFromBook(r) {
    sheet(t('addFromBook'), function (close) {
      if (!S.book.length) return h('p', { class: 'muted' }, t('nothing'));
      return h('div', null, S.book.map(function (b) {
        return h('button', { style: 'width:100%;text-align:left;margin-bottom:6px;height:auto;padding:8px 12px', onclick: function () {
          addStop(r, { label: b.name, address: b.address, lat: b.lat, lng: b.lng, phone: b.phone, note: b.note }); toast(t('added')); render(); } },
        b.name || b.address);
      }));
    });
  }

  // ---------- search (address book offline, places online)
  function localResults() {
    var q = (S.ui.query || '').trim().toLowerCase(), box = document.getElementById('results');
    if (!box) return;
    box.textContent = '';
    if (q.length < 2) { box.hidden = true; return; }
    var hits = S.book.filter(function (b) { return (b.name + ' ' + b.address).toLowerCase().indexOf(q) >= 0; }).slice(0, 5);
    hits.forEach(function (b) { box.appendChild(resultButton('⭐ ' + (b.name || b.address), b.address, function () { chooseResult({ label: b.name, address: b.address, lat: b.lat, lng: b.lng, phone: b.phone }); })); });
    box.hidden = !hits.length;
  }
  function resultButton(title, sub, fn) { return h('button', { onclick: fn }, h('div', null, title), sub ? h('div', { class: 'muted' }, sub) : null); }
  function chooseResult(p) {
    var r = route(); if (!r) return;
    if (addStop(r, p)) { S.ui.query = ''; toast(t('added')); render(); }
  }
  var lastSearch = 0;
  function geocode(q) {
    var wait = Math.max(0, 1100 - (Date.now() - lastSearch)); // the search service allows one request per second
    return new Promise(function (res) { setTimeout(res, wait); }).then(function () {
      lastSearch = Date.now();
      return fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=0&accept-language=' + S.settings.lang + '&q=' + encodeURIComponent(q));
    }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
  }
  function onlineSearch() {
    var q = (S.ui.query || '').trim(), box = document.getElementById('results');
    if (!q) return;
    var c = Geo.parseCoords(q);
    if (c) { chooseResult({ label: c.lat.toFixed(5) + ', ' + c.lng.toFixed(5), lat: c.lat, lng: c.lng }); return; }
    box.hidden = false; box.textContent = ''; box.appendChild(h('div', { class: 'muted', style: 'padding:12px' }, t('planning')));
    geocode(q).then(function (list) {
      box.textContent = '';
      if (!list.length) { box.appendChild(h('div', { class: 'muted', style: 'padding:12px' }, t('notFound'))); return; }
      list.forEach(function (p) { box.appendChild(resultButton(p.display_name.split(',')[0], p.display_name, function () { chooseResult({ label: '', address: p.display_name, lat: +p.lat, lng: +p.lon }); })); });
    });
  }

  function voice(cb) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast(t('noVoice')); return; }
    var rec = new SR(); rec.lang = S.settings.lang === 'tr' ? 'tr-TR' : 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = function (e) { cb(e.results[0][0].transcript); };
    rec.onerror = function () { toast(t('noVoice')); };
    try { rec.start(); } catch (e) { toast(t('noVoice')); }
  }
  function locate() {
    return new Promise(function (res) {
      if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(function (p) { res({ lat: p.coords.latitude, lng: p.coords.longitude }); }, function () { res(null); }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
    });
  }

  // ---------- optimise
  function optimiseSheet(r) {
    if (r.stops.length < 2) { toast(t('needTwo')); return; }
    sheet(t('optimise'), function (close) {
      var draft = { mode: r.mode, method: r.method, useHighways: r.useHighways, useTolls: r.useTolls, useFerry: r.useFerry, start: r.start, end: r.end, startTime: r.startTime };
      var stopOpts = function (extra) { return extra.concat(r.stops.map(function (s, i) { return h('option', { value: s.id }, (i + 1) + '. ' + (s.label || s.address)); })); };
      var start = h('select', { 'aria-label': t('start') }, stopOpts([h('option', { value: 'me' }, t('myLocation'))]));
      start.value = draft.start;
      var end = h('select', { 'aria-label': t('end') }, stopOpts([h('option', { value: 'auto' }, t('auto')), h('option', { value: 'start' }, t('backToStart'))]));
      end.value = draft.end;
      var modeBox = h('div', { class: 'modes', role: 'group', 'aria-label': t('mode') });
      function drawModes() {
        modeBox.textContent = '';
        ['motorcycle', 'car', 'bicycle', 'walking'].forEach(function (m) {
          modeBox.appendChild(h('button', { 'aria-pressed': draft.mode === m, onclick: function () { draft.mode = m; drawModes(); } }, h('span', { class: 'ico', 'aria-hidden': 'true' }, ICON[m]), t(m)));
        });
      }
      drawModes();
      function radio(val, label) { return h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'method', value: val, checked: draft.method === val, onchange: function () { draft.method = val; } }), label); }
      function check(key, label) { return h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: draft[key], onchange: function (e) { draft[key] = e.target.checked; } }), label); }
      var time = h('input', { type: 'time', value: draft.startTime, 'aria-label': t('startTime') });
      var go = h('button', { class: 'primary', onclick: function () {
        draft.start = start.value; draft.end = end.value; draft.startTime = time.value || '08:00';
        Object.assign(r, draft); S.settings.mode = r.mode; save(); close(); plan(r);
      } }, '⚡ ' + t('optimise'));
      return h('div', null, h('label', null, t('start')), start, h('label', null, t('end')), end,
        h('label', null, t('method')), radio('duration', t('byDuration')), radio('distance', t('byDistance')),
        h('label', null, t('mode')), modeBox, h('div', { style: 'height:8px' }),
        check('useHighways', t('useHighways')), check('useTolls', t('useTolls')), check('useFerry', t('useFerry')),
        h('label', null, t('startTime')), time,
        h('p', { class: 'muted' }, t('navNote')),
        S.settings.server === DEMO_SERVER ? h('p', { class: 'muted' }, t('demoWarn')) : null,
        h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { onclick: close }, t('cancel')), go));
    });
  }

  function plan(r) {
    toast(t('planning'));
    var fromMe = r.start === 'me';
    (fromMe ? locate() : Promise.resolve(null)).then(function (me) {
      if (fromMe && !me) { toast(t('locDenied')); fromMe = false; r.start = r.stops[0].id; }
      var stops = r.stops.slice();
      var pts = (fromMe ? [{ lat: me.lat, lng: me.lng, me: true }] : []).concat(stops.map(function (s) { return { lat: s.lat, lng: s.lng, id: s.id }; }));
      var opts = { mode: r.mode, method: r.method, useHighways: r.useHighways, useTolls: r.useTolls, useFerry: r.useFerry, server: S.settings.server };
      return Routing.matrix(pts, opts, window.fetch.bind(window)).then(function (m) {
        var cost = r.method === 'distance' ? m.dist : m.dur;
        var idOf = function (id) { for (var i = 0; i < pts.length; i++) if (pts[i].id === id) return i; return 0; };
        var startIdx = fromMe ? 0 : idOf(r.start);
        var endOpt = r.end === 'auto' ? 'auto' : r.end === 'start' ? 'start' : idOf(r.end);
        if (typeof endOpt === 'number' && endOpt === startIdx) endOpt = 'auto';
        var order = Opt.optimise({ cost: cost, start: startIdx, end: endOpt, budgetMs: 1500 });
        var ordered = order.map(function (i) { return pts[i]; });
        var minutes = parseInt(r.startTime.slice(0, 2), 10) * 60 + parseInt(r.startTime.slice(3), 10);
        var service = pts.map(function (p) { var s = stops.filter(function (x) { return x.id === p.id; })[0]; return s ? s.service || 0 : 0; });
        var sched = Opt.schedule(order, m.dur, minutes, service);
        var times = {}; order.forEach(function (idx, k) { if (pts[idx].id) times[pts[idx].id] = sched[k]; });
        var dist = 0, dur = 0; for (var k = 0; k + 1 < order.length; k++) { dist += m.dist[order[k]][order[k + 1]]; dur += m.dur[order[k]][order[k + 1]]; }
        return Routing.geometry(ordered, opts, window.fetch.bind(window)).then(function (g) {
          var byId = {}; stops.forEach(function (s) { byId[s.id] = s; });
          r.stops = order.filter(function (i) { return pts[i].id; }).map(function (i) { return byId[pts[i].id]; });
          r.plan = { distance: g ? g.distance : dist, duration: g ? g.duration : dur, approx: !!m.approx || !g, reason: m.reason || (g ? '' : 'no road geometry'),
            line: g ? g.line : null, times: times, me: fromMe ? { lat: me.lat, lng: me.lng } : null, at: new Date().toISOString() };
          save(); render(); toast(r.plan.approx ? t('approx') : t('planned'));
        });
      });
    });
  }

  // ---------- map
  function teardownMap() { if (map) { map.remove(); map = null; layer = null; } mapReady = false; }
  function afterRouteRender() {
    var r = route(); if (!r) return;
    if (S.ui.tab !== 'map') { teardownMap(); return; }
    var el = document.getElementById('map');
    if (!window.L) { el.appendChild(h('div', { class: 'nomap' }, t('noMap'))); return; }
    teardownMap();
    map = L.map(el, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    layer = L.layerGroup().addTo(map);
    var bounds = [];
    if (r.plan && r.plan.line) {
      L.polyline(r.plan.line, { color: '#ffffff', weight: 9, opacity: 0.95 }).addTo(layer); // casing, so the line reads on any tile colour
      L.polyline(r.plan.line, { color: '#2f4700', weight: 5, opacity: 1 }).addTo(layer);
    }
    else if (r.plan) { L.polyline(r.stops.map(function (s) { return [s.lat, s.lng]; }), { color: '#8a5200', weight: 3, dashArray: '6 8' }).addTo(layer); }
    r.stops.forEach(function (s, i) {
      var cls = 'pin ' + (s.status === 'waiting' ? '' : s.status);
      var icon = L.divIcon({ className: '', html: '<div class="' + cls + '">' + (i + 1) + '</div>', iconSize: [30, 30], iconAnchor: [15, 15] });
      L.marker([s.lat, s.lng], { icon: icon, title: s.label || s.address }).addTo(layer).bindPopup(textNode(s.label || s.address));
      bounds.push([s.lat, s.lng]);
    });
    if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 }); else map.setView([41.01, 28.97], 11);
    map.on('contextmenu', function (e) { // long press on a phone
      reverse(e.latlng.lat, e.latlng.lng).then(function (name) { addStop(r, { label: '', address: name, lat: e.latlng.lat, lng: e.latlng.lng }); toast(t('added')); render(); });
    });
    mapReady = true;
  }
  function textNode(s) { var d = document.createElement('div'); d.textContent = s; return d; }
  function reverse(lat, lng) {
    return fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=' + S.settings.lang + '&lat=' + lat + '&lon=' + lng)
      .then(function (r) { return r.json(); }).then(function (j) { return j.display_name || (lat.toFixed(5) + ', ' + lng.toFixed(5)); })
      .catch(function () { return lat.toFixed(5) + ', ' + lng.toFixed(5); });
  }

  // ---------- address book
  function bookView() {
    var q = S.ui.bookQuery || '', onlyFav = S.ui.onlyFav;
    var rows = S.book.filter(function (b) { return (!onlyFav || b.fav) && (b.name + ' ' + b.address + ' ' + b.phone).toLowerCase().indexOf(q.toLowerCase()) >= 0; })
      .sort(function (a, b) { return (a.name || a.address).localeCompare(b.name || b.address); });
    var inp = h('input', { type: 'search', placeholder: t('filter'), value: q, 'aria-label': t('filter'), oninput: function (e) { S.ui.bookQuery = e.target.value; render(); var n = document.querySelector('input[type=search]'); if (n) { n.focus(); n.setSelectionRange(99, 99); } } });
    return h('div', { class: 'screen' }, barOnly(onlyFav ? t('favorites') : t('book')),
      h('div', { class: 'scroll' }, h('div', { class: 'row', style: 'margin-bottom:12px' }, inp,
        h('button', { class: 'fit', onclick: function () { S.ui.onlyFav = !onlyFav; render(); } }, '⭐'),
        h('button', { class: 'fit', 'aria-label': t('importStops'), onclick: function () { importSheet(); } }, '⬇'),
        h('button', { class: 'fit primary', 'aria-label': t('add'), onclick: function () { editBook(); } }, '➕')),
        rows.length ? rows.map(function (b) {
          return h('div', { class: 'card' }, h('strong', null, b.name || b.address), b.name ? h('div', { class: 'muted' }, b.address) : null,
            b.phone ? h('div', { class: 'muted' }, '☎ ' + b.phone) : null,
            h('div', { class: 'row', style: 'margin-top:8px' },
              h('button', { 'aria-label': t('fav'), 'aria-pressed': !!b.fav, onclick: function () { b.fav = !b.fav; save(); render(); } }, b.fav ? '★' : '☆'),
              h('button', { onclick: function () { addBookToRoute(b); } }, t('addToRoute')),
              h('button', { onclick: function () { editBook(b); } }, '✎'),
              h('button', { class: 'danger', 'aria-label': t('remove'), onclick: function () { S.book = S.book.filter(function (x) { return x !== b; }); save(); render(); } }, '🗑')));
        }) : h('p', { class: 'muted' }, t('nothing'))));
  }
  function addBookToRoute(b) {
    if (!S.routes.length) { newRoute(); S.ui.view = 'book'; }
    sheet(t('pickRoute'), function (close) {
      return h('div', null, S.routes.map(function (r) {
        return h('button', { style: 'width:100%;text-align:left;margin-bottom:6px', onclick: function () { close(); if (addStop(r, { label: b.name, address: b.address, lat: b.lat, lng: b.lng, phone: b.phone, note: b.note })) toast(t('added')); } }, r.name);
      }));
    });
  }
  function editBook(b) {
    sheet(b ? t('name') : t('add'), function (close) {
      var d = b || { id: uid(), name: '', address: '', phone: '', note: '' };
      var name = h('input', { value: d.name }), addr = h('input', { value: d.address }), phone = h('input', { type: 'tel', value: d.phone });
      return h('div', null, h('label', null, t('name')), name, h('label', null, t('address') + ' / lat,lng'), addr, h('label', null, t('phone')), phone,
        h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { onclick: close }, t('cancel')),
          h('button', { class: 'primary', onclick: function () {
            var q = addr.value.trim(); if (!q) return;
            var c = Geo.parseCoords(q);
            (c ? Promise.resolve([{ lat: c.lat, lon: c.lng, display_name: q }]) : (b && b.address === q ? Promise.resolve([{ lat: b.lat, lon: b.lng, display_name: q }]) : geocode(q))).then(function (res) {
              if (!res.length) { toast(t('notFound')); return; }
              Object.assign(d, { name: name.value.trim(), address: res[0].display_name, lat: +res[0].lat, lng: +res[0].lon, phone: phone.value.trim() });
              if (!b) S.book.push(d); save(); close(); render();
            });
          } }, t('save'))));
    });
  }

  // ---------- import
  function importSheet(r) {
    r = r && r.stops ? r : null;
    sheet(t('importStops'), function (close) {
      var file = h('input', { type: 'file', accept: '.csv,.txt,.gpx,.kml', 'aria-label': t('importStops') });
      var info = h('p', { class: 'muted' }, 'CSV, GPX, KML' + (S.settings.lang === 'tr' ? ' (Excel dosyasını CSV olarak kaydedin).' : ' (save Excel as CSV).'));
      file.addEventListener('change', function () {
        var f = file.files[0]; if (!f) return;
        var rd = new FileReader();
        rd.onload = function () {
          var res = Geo.parseFile(f.name, String(rd.result));
          if (res.error) { info.textContent = res.error; return; }
          var need = res.rows.filter(function (x) { return x.needsGeocode; }), ready = res.rows.filter(function (x) { return !x.needsGeocode; });
          var done = 0;
          function finish() {
            var target = r;
            var rows = ready;
            var added = 0;
            rows.forEach(function (x) {
              S.book.push({ id: uid(), name: x.name, address: x.address || (x.lat.toFixed(5) + ', ' + x.lng.toFixed(5)), lat: x.lat, lng: x.lng, phone: x.phone || '', note: x.note || '' });
              if (target && addStop(target, { label: x.name, address: x.address, lat: x.lat, lng: x.lng, phone: x.phone, note: x.note })) added++;
            });
            save(); close(); toast(rows.length + ' ' + t('importDone') + (res.skipped ? ', ' + res.skipped + ' ' + t('skipped') : '')); render();
          }
          if (!need.length) return finish();
          info.textContent = t('geocoding') + ' (0/' + need.length + ')';
          need.reduce(function (p, x) {
            return p.then(function () { return geocode(x.address); }).then(function (list) {
              done++; info.textContent = t('geocoding') + ' (' + done + '/' + need.length + ')';
              if (list.length) { x.lat = +list[0].lat; x.lng = +list[0].lon; ready.push(x); } else res.skipped++;
            });
          }, Promise.resolve()).then(finish);
        };
        rd.readAsText(f);
      });
      return h('div', null, file, info, h('button', { onclick: close }, t('cancel')));
    });
  }

  // ---------- reports, settings, backup
  function reportsView() {
    var from = h('input', { type: 'date', 'aria-label': t('from'), value: S.ui.from || '' }), to = h('input', { type: 'date', 'aria-label': t('to'), value: S.ui.to || '' });
    var rows = S.routes.filter(function (r) { var d = r.createdAt.slice(0, 10); return (!S.ui.from || d >= S.ui.from) && (!S.ui.to || d <= S.ui.to); });
    return h('div', { class: 'screen' }, barOnly(t('reports')),
      h('div', { class: 'scroll' }, h('div', { class: 'row' }, from, to,
        h('button', { class: 'fit primary', onclick: function () { S.ui.from = from.value; S.ui.to = to.value; render(); } }, t('filter'))),
        h('table', { style: 'margin-top:12px' }, h('thead', null, h('tr', null, [t('routeName'), t('date'), t('stops'), t('distance')].map(function (x) { return h('th', null, x); }))),
          h('tbody', null, rows.map(function (r) {
            return h('tr', null, h('td', null, r.name), h('td', null, r.createdAt.slice(0, 10)), h('td', null, r.stops.filter(function (s) { return s.status === 'done'; }).length + '/' + r.stops.length), h('td', null, r.plan ? Geo.fmtDistance(r.plan.distance) : '-'));
          }))),
        rows.length ? null : h('p', { class: 'muted' }, t('nothing'))));
  }
  function settingsView() {
    function sel(label, value, opts, fn) {
      var s = h('select', { 'aria-label': label, onchange: function (e) { fn(e.target.value); save(); render(); } }, opts.map(function (o) { return h('option', { value: o[0] }, o[1]); }));
      s.value = value; return h('div', null, h('label', null, label), s);
    }
    var server = h('input', { value: S.settings.server, 'aria-label': t('server'), placeholder: 'https://...', onchange: function (e) { S.settings.server = e.target.value.trim(); save(); render(); } });
    var tpl = h('textarea', { 'aria-label': t('templates'), onchange: function (e) { S.templates = e.target.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { return { id: uid(), text: x }; }); save(); } });
    tpl.value = S.templates.map(function (x) { return x.text; }).join('\n');
    return h('div', { class: 'screen' }, barOnly(t('settings')),
      h('div', { class: 'scroll' },
        sel(t('language'), S.settings.lang, [['tr', 'Türkçe'], ['en', 'English']], function (v) { S.settings.lang = v; }),
        sel(t('theme'), S.settings.theme, [['auto', t('autoTheme')], ['dark', t('dark')], ['light', t('light')]], function (v) { S.settings.theme = v; }),
        sel(t('mode'), S.settings.mode, [['motorcycle', t('motorcycle')], ['car', t('car')], ['bicycle', t('bicycle')], ['walking', t('walking')]], function (v) { S.settings.mode = v; }),
        sel(t('navApp'), S.settings.navApp, [['google', 'Google Maps'], ['waze', 'Waze'], ['yandex', 'Yandex Maps'], ['apple', 'Apple Maps'], ['here', 'HERE WeGo']], function (v) { S.settings.navApp = v; }),
        h('label', null, t('server')), server, S.settings.server === DEMO_SERVER ? h('p', { class: 'muted' }, t('demoWarn')) : null,
        h('label', null, t('templates')), tpl,
        h('div', { style: 'margin-top:12px' }, h('button', { onclick: function () { S.ui.view = 'backup'; render(); } }, t('backup')))));
  }
  function backupView() {
    var file = h('input', { type: 'file', accept: '.json', 'aria-label': t('import') });
    file.addEventListener('change', function () {
      var f = file.files[0]; if (!f) return; var rd = new FileReader();
      rd.onload = function () { try { var d = JSON.parse(String(rd.result)); if (!Array.isArray(d.routes)) throw 0; S = Object.assign(fresh(), d); S.ui = { view: 'home' }; save(); render(); toast('OK'); } catch (e) { toast('Invalid backup'); } };
      rd.readAsText(f);
    });
    return h('div', { class: 'screen' }, barOnly(t('backup')),
      h('div', { class: 'scroll' }, h('button', { class: 'primary', style: 'width:100%', onclick: function () {
        var c = Object.assign({}, S); delete c.ui;
        var a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' })), download: 'motonav-backup.json' });
        document.body.appendChild(a); a.click(); a.remove();
      } }, '⬇ ' + t('export')), h('label', null, t('import')), file,
        h('div', { style: 'margin-top:24px' }, h('button', { class: 'danger', onclick: function () { confirmSheet(t('clear') + '? ' + t('sure'), function () { S = fresh(); S.ui = { view: 'home' }; save(); render(); }); } }, t('clear')))));
  }

  // ---------- start
  load();
  render();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0 && !window.Capacitor) navigator.serviceWorker.register('sw.js').catch(function () {});
  window.MotoNavDebug = { state: function () { return S; } };
})();
