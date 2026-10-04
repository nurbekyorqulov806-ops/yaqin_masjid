/* Masjid taklif qilish: xaritada joyni belgilash */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var P = window.YM_PICK || {};
  var latIn = $("#id_latitude"), lonIn = $("#id_longitude");
  var startLat = parseFloat(P.lat), startLon = parseFloat(P.lon);
  var has = !isNaN(startLat) && !isNaN(startLon);

  var map = L.map("pickMap").setView(has ? [startLat, startLon] : [41.3, 64.5], has ? 16 : 6);
  var tiles = null;
  function setTiles() {
    if (tiles) map.removeLayer(tiles);
    tiles = L.tileLayer(YM.tileUrl(), { maxZoom: 19, subdomains: "abcd", attribution: YM.TILE_ATTR }).addTo(map);
  }
  setTiles();
  document.addEventListener("ym:theme", setTiles);

  var marker = null;
  function put(lat, lon) {
    latIn.value = lat.toFixed(6);
    lonIn.value = lon.toFixed(6);
    $("#pickErr").hidden = true;
    if (!marker) {
      marker = L.marker([lat, lon], { draggable: true }).addTo(map);
      marker.on("dragend", function () { var p = marker.getLatLng(); put(p.lat, p.lng); });
    } else { marker.setLatLng([lat, lon]); }
  }
  if (has) put(startLat, startLon);

  map.on("click", function (e) { put(e.latlng.lat, e.latlng.lng); });

  $("#useMe").addEventListener("click", function () {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function (p) {
      put(p.coords.latitude, p.coords.longitude);
      map.setView([p.coords.latitude, p.coords.longitude], 17);
    }, function () {
      var e = $("#pickErr");
      e.textContent = "Joylashuvga ruxsat berilmadi. Xaritada qo'lda belgilang.";
      e.hidden = false;
    }, { enableHighAccuracy: true, timeout: 15000 });
  });

  $("#addForm").addEventListener("submit", function (e) {
    if (!latIn.value || !lonIn.value) {
      e.preventDefault();
      $("#pickErr").textContent = "Avval xaritada masjid joylashuvini belgilang.";
      $("#pickErr").hidden = false;
      $("#pickMap").scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
})();
