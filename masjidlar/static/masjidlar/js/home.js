/* Bosh sahifa: xarita, klasterlar, joylashuv, yaqin masjidlar, qidiruv */
(function () {
  var C = window.YM_CFG;
  var esc = YM.esc;
  var $ = function (s) { return document.querySelector(s); };
  var panel = $("#panel"), listEl = $("#list"), heroEl = $("#hero"), toastEl = $("#toast"), qInput = $("#q");
  var state = { view: "near", near: [], me: null, byId: {}, results: null };
  var markers = {};
  var isMobile = function () { return window.matchMedia("(max-width: 820px)").matches; };

  /* ---------- Xarita ---------- */
  var map = L.map("map", { zoomControl: false, preferCanvas: true }).setView([41.3, 64.5], 6);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  var tiles = null;
  function setTiles() {
    if (tiles) map.removeLayer(tiles);
    tiles = L.tileLayer(YM.tileUrl(), { maxZoom: 19, subdomains: "abcd", attribution: YM.TILE_ATTR }).addTo(map);
  }
  setTiles();
  document.addEventListener("ym:theme", setTiles);

  var pin = L.divIcon({
    className: "ym-pin", iconSize: [30, 38], iconAnchor: [15, 36], popupAnchor: [0, -32],
    html: '<svg width="30" height="38" viewBox="0 0 30 38" aria-hidden="true"><path d="M15 37C15 37 2 24 2 14.5a13 13 0 0 1 26 0C28 24 15 37 15 37z" fill="#0B8A87" stroke="#fff" stroke-width="2"/><path d="M9 20v-4a6 6 0 0 1 12 0v4z" fill="#fff"/><rect x="14.2" y="6" width="1.6" height="3" fill="#fff"/></svg>'
  });

  var cluster = L.markerClusterGroup({
    showCoverageOnHover: false, maxClusterRadius: 50, chunkedLoading: true,
    iconCreateFunction: function (c) {
      return L.divIcon({ html: "<span>" + c.getChildCount() + "</span>", className: "ym-cluster", iconSize: [40, 40] });
    }
  });
  map.addLayer(cluster);

  function detailHref(id) { return C.detailUrl.replace("/0/", "/" + id + "/"); }

  function popupHtml(id) {
    var it = state.byId[id], lk = YM.links(it[1], it[2]);
    var sub = [];
    if (it[4]) sub.push(esc(it[4]));
    if (state.me) sub.push("<b>" + YM.fmtDist(YM.haversine(state.me.lat, state.me.lon, it[1], it[2])) + "</b>");
    return '<div class="pop"><h3>' + esc(it[3]) + "</h3><p>" + (sub.join(", ") || "&nbsp;") + "</p>" +
      '<div class="row"><a class="btn btn-primary" href="' + detailHref(id) + '">Batafsil</a>' +
      '<a class="btn btn-ghost" target="_blank" rel="noopener" href="' + lk.yandex + '">Yo\'nalish</a></div></div>';
  }

  fetch(C.apiAll).then(function (r) { return r.json(); }).then(function (d) {
    var layers = d.items.map(function (it) {
      var id = it[0];
      var m = L.marker([it[1], it[2]], { icon: pin, title: it[3] });
      m.bindPopup(function () { return popupHtml(id); });
      markers[id] = m;
      state.byId[id] = it;
      return m;
    });
    cluster.addLayers(layers);
    renderList();
  }).catch(function () { toast("Masjidlar ro'yxatini yuklab bo'lmadi. Sahifani yangilang."); });

  /* ---------- Yordamchilar ---------- */
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 6000);
  }
  function setSheet(open) {
    panel.classList.toggle("open", open);
    $("#sheetHandle").setAttribute("aria-expanded", open ? "true" : "false");
  }
  $("#sheetHandle").addEventListener("click", function () { setSheet(!panel.classList.contains("open")); });
  qInput.addEventListener("focus", function () { if (isMobile()) setSheet(true); });

  function focusMosque(id, lat, lon) {
    if (isMobile()) setSheet(false);
    var m = markers[id];
    if (!m) { map.setView([lat, lon], 16); return; }
    cluster.zoomToShowLayer(m, function () {
      map.setView(m.getLatLng(), Math.max(map.getZoom(), 16));
      m.openPopup();
    });
  }

  /* ---------- Ro'yxat ---------- */
  function cardHtml(it) {
    var lk = YM.links(it.lat, it.lon), saved = YM.favs.has(it.id);
    var sub = esc(it.city || it.address || "");
    return '<li class="item"><div class="item-main" role="button" tabindex="0" data-focus="' + it.id + '" data-lat="' + it.lat + '" data-lon="' + it.lon + '">' +
      "<h3>" + esc(it.name) + "</h3><p>" + (sub || "&nbsp;") + "</p></div>" +
      '<div class="d">' + (it.distance_m != null ? YM.fmtDist(it.distance_m) : "") + "</div>" +
      '<div class="item-actions"><a class="btn btn-primary btn-sm" href="' + detailHref(it.id) + '">Batafsil</a>' +
      '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + lk.yandex + '">Yo\'nalish</a>' +
      '<button class="btn btn-ghost btn-sm" data-fav="' + it.id + '" aria-pressed="' + saved + '">' + (saved ? "Saqlandi" : "Saqlash") + "</button></div></li>";
  }

  function savedItems() {
    return YM.favs.get().map(function (id) {
      var it = state.byId[id];
      if (!it) return null;
      var o = { id: id, name: it[3], city: it[4], lat: it[1], lon: it[2] };
      if (state.me) o.distance_m = YM.haversine(state.me.lat, state.me.lon, it[1], it[2]);
      return o;
    }).filter(Boolean);
  }

  function renderList() {
    var items, empty;
    if (state.results !== null) {
      items = state.results; empty = "Hech narsa topilmadi. Boshqacha yozib ko'ring yoki yangi masjid qo'shing.";
    } else if (state.view === "saved") {
      items = savedItems(); empty = "Hali saqlanmagan. Masjid kartasidagi «Saqlash» tugmasini bosing.";
    } else {
      items = state.near;
      empty = state.me ? "Yaqin atrofda masjid topilmadi." : "Joylashuvni yoqsangiz, atrofdagi masjidlar shu yerda chiqadi.";
    }
    listEl.innerHTML = items.length ? items.map(cardHtml).join("") : '<li class="empty">' + empty + "</li>";
    $("#savedCount").textContent = YM.favs.get().length;
  }

  listEl.addEventListener("click", function (e) {
    var fav = e.target.closest("[data-fav]");
    if (fav) {
      YM.favs.toggle(+fav.getAttribute("data-fav"));
      renderList();
      return;
    }
    var f = e.target.closest("[data-focus]");
    if (f) focusMosque(+f.getAttribute("data-focus"), +f.getAttribute("data-lat"), +f.getAttribute("data-lon"));
  });
  listEl.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var f = e.target.closest("[data-focus]");
    if (f) focusMosque(+f.getAttribute("data-focus"), +f.getAttribute("data-lat"), +f.getAttribute("data-lon"));
  });

  document.querySelectorAll(".tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".tabs button").forEach(function (x) { x.classList.toggle("on", x === b); });
      state.view = b.getAttribute("data-view");
      state.results = null; qInput.value = "";
      renderList();
    });
  });

  /* ---------- Qidiruv ---------- */
  var searchTimer, searchSeq = 0;
  qInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    var v = qInput.value.trim();
    if (v.length < 2) { state.results = null; renderList(); return; }
    searchTimer = setTimeout(function () {
      var seq = ++searchSeq;
      fetch(C.apiSearch + "?q=" + encodeURIComponent(v)).then(function (r) { return r.json(); }).then(function (d) {
        if (seq !== searchSeq) return;
        state.results = d.items.map(function (it) {
          if (state.me) it.distance_m = YM.haversine(state.me.lat, state.me.lon, it.lat, it.lon);
          return it;
        });
        renderList();
      });
    }, 250);
  });

  /* ---------- Joylashuv ---------- */
  var meMarker = null, meCircle = null, route = null;

  function locate() {
    if (!navigator.geolocation) { locError("Brauzeringiz joylashuvni qo'llab-quvvatlamaydi."); return; }
    $("#locBtn").classList.add("busy");
    navigator.geolocation.getCurrentPosition(onPos, onErr, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }

  function locError(msg) {
    $("#locBtn").classList.remove("busy");
    var el = $("#locErr");
    if (el) { el.textContent = msg; el.hidden = false; }
    toast(msg);
  }

  function onErr(err) {
    var msgs = {
      1: "Joylashuvga ruxsat berilmagan. Manzil satridagi qulf belgisini bosib, «Joylashuv»ni yoqing va qayta urinib ko'ring.",
      2: "Joylashuv aniqlanmadi. GPS yoki internetni tekshirib, qayta urinib ko'ring.",
      3: "Joylashuvni aniqlash uzoq cho'zildi. Qayta urinib ko'ring."
    };
    locError(msgs[err.code] || msgs[2]);
  }

  function onPos(p) {
    $("#locBtn").classList.remove("busy");
    state.me = { lat: p.coords.latitude, lon: p.coords.longitude };
    if (meMarker) map.removeLayer(meMarker);
    if (meCircle) map.removeLayer(meCircle);
    meCircle = L.circle([state.me.lat, state.me.lon], { radius: Math.min(p.coords.accuracy || 50, 500), color: "#2F6BFF", weight: 1, fillOpacity: 0.08, interactive: false }).addTo(map);
    meMarker = L.marker([state.me.lat, state.me.lon], {
      icon: L.divIcon({ className: "", html: '<div class="ym-me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      interactive: false, zIndexOffset: 1000
    }).addTo(map);
    map.setView([state.me.lat, state.me.lon], 15);
    loadNearby();
    YM.getPrayer(state.me.lat, state.me.lon).then(function (t) {
      $("#prayer").hidden = false;
      YM.renderPrayer($("#prayerGrid"), $("#prayerNext"), t);
    }).catch(function () {});
  }

  function loadNearby() {
    var url = C.apiNearby + "?lat=" + state.me.lat + "&lon=" + state.me.lon + "&limit=20";
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      state.near = d.items;
      state.view = "near"; state.results = null; qInput.value = "";
      document.querySelectorAll(".tabs button").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-view") === "near"); });
      renderHero(); renderList();
      if (route) { map.removeLayer(route); route = null; }
      var n = state.near[0];
      if (n) {
        route = L.polyline([[state.me.lat, state.me.lon], [n.lat, n.lon]], { color: "#0B8A87", weight: 4, opacity: 0.9, dashArray: "8 8" }).addTo(map);
        map.fitBounds(L.latLngBounds([[state.me.lat, state.me.lon], [n.lat, n.lon]]).pad(0.35), {
          maxZoom: 17, paddingTopLeft: [20, 60], paddingBottomRight: isMobile() ? [20, 330] : [20, 20]
        });
      }
      if (isMobile()) setSheet(true);
    }).catch(function () { toast("Yaqin masjidlarni olib bo'lmadi. Qayta urinib ko'ring."); });
  }

  function renderHero() {
    var n = state.near[0];
    if (!n) {
      heroEl.innerHTML = '<div class="cta"><h2>Yaqin atrofda masjid topilmadi</h2><p>Bu hududda masjid hali xaritaga qo\'shilmagan bo\'lishi mumkin. Siz qo\'shib yordam bering.</p><a class="btn btn-primary" href="/qoshish/">Masjid qo\'shish</a></div>';
      return;
    }
    var lk = YM.links(n.lat, n.lon);
    heroEl.innerHTML =
      '<div class="hero"><div>' +
      '<div class="hero-dist">' + YM.fmtDist(n.distance_m) + '</div><div class="hero-walk">' + YM.travelText(n.distance_m) + "</div>" +
      "<h2>" + esc(n.name) + "</h2><p class=\"hero-sub\">" + esc(n.city || n.address || "Sizga eng yaqin masjid") + "</p>" +
      '<div class="hero-actions"><a class="btn btn-primary btn-sm" href="' + detailHref(n.id) + '">Batafsil</a>' +
      '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + lk.yandex + '">Yo\'nalish</a></div></div>' +
      '<div class="qibla" id="qibla"></div></div>';
    YM.renderQibla($("#qibla"), state.me.lat, state.me.lon);
  }

  $("#locBtn").addEventListener("click", locate);
  heroEl.addEventListener("click", function (e) { if (e.target.id === "ctaLocate") locate(); });

  /* ---------- Birinchi kirishda joylashuv so'rash ---------- */
  var dlg = $("#locDialog");
  dlg.addEventListener("close", function () { if (dlg.returnValue === "yes") locate(); });
  (function askFirst() {
    var go = function (st) {
      if (st === "granted") { locate(); return; }
      if (st === "denied") return;
      try { if (sessionStorage.getItem("ym:asked")) return; sessionStorage.setItem("ym:asked", "1"); } catch (e) {}
      if (typeof dlg.showModal === "function") dlg.showModal();
    };
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "geolocation" }).then(function (r) { go(r.state); }, function () { go("prompt"); });
    } else { go("prompt"); }
  })();

  renderList();
})();
