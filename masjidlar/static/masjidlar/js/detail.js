/* Masjid sahifasi: mini xarita, namoz vaqtlari, qibla, saqlash, ulashish */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var doc = $("#doc");
  var lat = parseFloat(doc.dataset.lat), lon = parseFloat(doc.dataset.lon);
  var id = parseInt(doc.dataset.id, 10), name = doc.dataset.name;

  var lk = YM.links(lat, lon);
  $("#goYandex").href = lk.yandex;
  $("#goGoogle").href = lk.google;

  /* Mini xarita */
  var map = L.map("miniMap", { scrollWheelZoom: false }).setView([lat, lon], 16);
  var tiles = null;
  function setTiles() {
    if (tiles) map.removeLayer(tiles);
    tiles = L.tileLayer(YM.tileUrl(), { maxZoom: 19, subdomains: "abcd", attribution: YM.TILE_ATTR }).addTo(map);
  }
  setTiles();
  document.addEventListener("ym:theme", setTiles);
  L.marker([lat, lon], {
    icon: L.divIcon({
      className: "ym-pin", iconSize: [30, 38], iconAnchor: [15, 36],
      html: '<svg width="30" height="38" viewBox="0 0 30 38" aria-hidden="true"><path d="M15 37C15 37 2 24 2 14.5a13 13 0 0 1 26 0C28 24 15 37 15 37z" fill="#0B8A87" stroke="#fff" stroke-width="2"/><path d="M9 20v-4a6 6 0 0 1 12 0v4z" fill="#fff"/><rect x="14.2" y="6" width="1.6" height="3" fill="#fff"/></svg>'
    })
  }).addTo(map);

  /* Namoz vaqtlari va qibla */
  YM.getPrayer(lat, lon).then(function (t) {
    YM.renderPrayer($("#prayerGrid"), $("#prayerNext"), t);
  }).catch(function () {
    $("#prayerGrid").innerHTML = '<span class="muted">Namoz vaqtlarini yuklab bo\'lmadi. Internetni tekshiring.</span>';
  });
  YM.renderQibla($("#qibla"), lat, lon);

  /* Saqlash */
  var fav = $("#favBtn");
  function paintFav() {
    var on = YM.favs.has(id);
    fav.textContent = on ? "Saqlandi" : "Saqlash";
    fav.setAttribute("aria-pressed", on ? "true" : "false");
  }
  fav.addEventListener("click", function () { YM.favs.toggle(id); paintFav(); });
  paintFav();

  /* Ulashish */
  $("#shareBtn").addEventListener("click", function () {
    var data = { title: name, text: name + " masjidi", url: location.href };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(location.href).then(function () { $("#shareBtn").textContent = "Havola nusxalandi"; });
    }
  });

  /* Mendan masofa */
  $("#distBtn").addEventListener("click", function () {
    var note = $("#distNote");
    if (!navigator.geolocation) { note.textContent = "Brauzeringiz joylashuvni qo'llamaydi."; note.hidden = false; return; }
    navigator.geolocation.getCurrentPosition(function (p) {
      var d = YM.haversine(p.coords.latitude, p.coords.longitude, lat, lon);
      note.textContent = "Siz bilan masofa: " + YM.fmtDist(d) + ", " + YM.travelText(d);
      note.hidden = false;
      L.circleMarker([p.coords.latitude, p.coords.longitude], { radius: 8, color: "#fff", weight: 3, fillColor: "#2F6BFF", fillOpacity: 1 }).addTo(map);
      map.fitBounds(L.latLngBounds([[p.coords.latitude, p.coords.longitude], [lat, lon]]).pad(0.3), { maxZoom: 16 });
    }, function () {
      note.textContent = "Joylashuvga ruxsat berilmadi. Brauzer sozlamalarida yoqing.";
      note.hidden = false;
    }, { enableHighAccuracy: true, timeout: 15000 });
  });
})();
