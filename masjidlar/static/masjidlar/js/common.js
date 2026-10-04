/* Umumiy yordamchilar: masofa, qibla, namoz vaqtlari, mavzu, saqlanganlar */
(function () {
  var YM = (window.YM = {});
  var rad = function (d) { return (d * Math.PI) / 180; };
  var deg = function (r) { return (r * 180) / Math.PI; };

  YM.KAABA = { lat: 21.4225, lon: 39.8262 };
  YM.DEFAULT_POS = { lat: 41.3111, lon: 69.2797 }; // Toshkent
  YM.PRAYER = { method: 3, school: 1 }; // MWL + Hanafiy asr; kerak bo'lsa o'zgartiring

  YM.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  YM.haversine = function (lat1, lon1, lat2, lon2) {
    var dp = rad(lat2 - lat1), dl = rad(lon2 - lon1);
    var a = Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * 6371000 * Math.asin(Math.sqrt(a));
  };

  YM.fmtDist = function (m) {
    if (m < 1000) return Math.max(10, Math.round(m / 10) * 10) + " m";
    return (m < 10000 ? (m / 1000).toFixed(1) : Math.round(m / 1000)) + " km";
  };

  YM.travelText = function (m) {
    if (m <= 4000) return "piyoda ~" + Math.max(1, Math.round(m / 80)) + " daqiqa";
    return "mashinada ~" + Math.max(1, Math.round(m / 667)) + " daqiqa";
  };

  YM.bearing = function (lat1, lon1, lat2, lon2) {
    var p1 = rad(lat1), p2 = rad(lat2), dl = rad(lon2 - lon1);
    var y = Math.sin(dl) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (deg(Math.atan2(y, x)) + 360) % 360;
  };

  YM.links = function (lat, lon) {
    return {
      yandex: "https://yandex.com/maps/?rtext=~" + lat + "," + lon + "&rtt=auto",
      google: "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lon
    };
  };

  /* ---------- Mavzu ---------- */
  YM.tileUrl = function () {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    return "https://{s}.basemaps.cartocdn.com/rastertiles/" + (dark ? "dark_all" : "light_all") + "/{z}/{x}/{y}{r}.png";
  };
  YM.TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  YM.initTheme = function () {
    var btn = document.getElementById("themeBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("ym:theme", next); } catch (e) {}
      document.dispatchEvent(new Event("ym:theme"));
    });
  };

  /* ---------- Saqlanganlar ---------- */
  YM.favs = {
    get: function () {
      try { return JSON.parse(localStorage.getItem("ym:favs") || "[]"); } catch (e) { return []; }
    },
    has: function (id) { return this.get().indexOf(id) !== -1; },
    toggle: function (id) {
      var list = this.get(), i = list.indexOf(id);
      if (i === -1) list.push(id); else list.splice(i, 1);
      try { localStorage.setItem("ym:favs", JSON.stringify(list)); } catch (e) {}
      return i === -1;
    }
  };

  /* ---------- Toshkent vaqti (O'zbekiston) ---------- */
  YM.tzNow = function () {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tashkent", hourCycle: "h23", hour: "2-digit", minute: "2-digit",
      day: "2-digit", month: "2-digit", year: "numeric"
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return { h: +o.hour, m: +o.minute, date: o.day + "-" + o.month + "-" + o.year };
  };

  /* ---------- Namoz vaqtlari (Aladhan API) ---------- */
  YM.PRAYER_NAMES = [
    ["Fajr", "Bomdod"], ["Sunrise", "Quyosh"], ["Dhuhr", "Peshin"],
    ["Asr", "Asr"], ["Maghrib", "Shom"], ["Isha", "Xufton"]
  ];

  YM.getPrayer = function (lat, lon) {
    var date = YM.tzNow().date;
    var key = "ym:prayer:" + date + ":" + lat.toFixed(1) + "," + lon.toFixed(1);
    try {
      var cached = localStorage.getItem(key);
      if (cached) return Promise.resolve(JSON.parse(cached));
    } catch (e) {}
    var url = "https://api.aladhan.com/v1/timings/" + date + "?latitude=" + lat + "&longitude=" + lon +
      "&method=" + YM.PRAYER.method + "&school=" + YM.PRAYER.school;
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("prayer api");
      return r.json();
    }).then(function (j) {
      var t = j.data.timings, out = {};
      YM.PRAYER_NAMES.forEach(function (p) { out[p[0]] = String(t[p[0]]).slice(0, 5); });
      try { localStorage.setItem(key, JSON.stringify(out)); } catch (e) {}
      return out;
    });
  };

  function toMin(hhmm) { var p = hhmm.split(":"); return +p[0] * 60 + +p[1]; }

  YM.renderPrayer = function (grid, nextEl, times) {
    function draw() {
      var now = YM.tzNow(), cur = now.h * 60 + now.m, nextKey = null, nextMin = 0;
      for (var i = 0; i < YM.PRAYER_NAMES.length; i++) {
        var k = YM.PRAYER_NAMES[i][0], mm = toMin(times[k]);
        if (mm > cur) { nextKey = k; nextMin = mm - cur; break; }
      }
      if (!nextKey) { nextKey = "Fajr"; nextMin = toMin(times.Fajr) + 1440 - cur; }
      grid.innerHTML = YM.PRAYER_NAMES.map(function (p) {
        return '<div class="pt' + (p[0] === nextKey ? " next" : "") + '"><b>' + YM.esc(times[p[0]]) + "</b><span>" + p[1] + "</span></div>";
      }).join("");
      var label = YM.PRAYER_NAMES.filter(function (p) { return p[0] === nextKey; })[0][1];
      var h = Math.floor(nextMin / 60), m = nextMin % 60;
      if (nextEl) nextEl.textContent = label + " ga " + (h ? h + " soat " : "") + m + " daqiqa";
    }
    draw();
    if (grid._timer) clearInterval(grid._timer);
    grid._timer = setInterval(draw, 30000);
  };

  /* ---------- Qibla kompasi ---------- */
  YM.renderQibla = function (el, lat, lon) {
    var q = YM.bearing(lat, lon, YM.KAABA.lat, YM.KAABA.lon);
    var ticks = "";
    for (var a = 0; a < 360; a += 30) {
      ticks += '<line class="tick" x1="60" y1="8" x2="60" y2="' + (a % 90 === 0 ? 15 : 12) + '" transform="rotate(' + a + ' 60 60)"/>';
    }
    el.innerHTML =
      '<svg class="compass" viewBox="0 0 120 120" role="img" aria-label="Qibla kompasi">' +
      '<g id="dial"><circle class="ring" cx="60" cy="60" r="54"/>' + ticks +
      '<text class="n" x="60" y="29" text-anchor="middle">N</text>' +
      '<g id="qneedle"><path class="needle" d="M60 60 L65 50 L60 14 L55 50 Z"/><circle class="needle" cx="60" cy="14" r="4"/></g>' +
      '</g><circle class="hub" cx="60" cy="60" r="4"/></svg>' +
      '<small>Qibla: ' + Math.round(q) + '° (shimoldan soat yo\'nalishida)</small>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="compassBtn">Kompasni yoqish</button>';
    var needle = el.querySelector("#qneedle"), dial = el.querySelector("#dial");
    needle.setAttribute("transform", "rotate(" + q + " 60 60)");
    el.querySelector("#compassBtn").addEventListener("click", function (e) {
      var btn = e.currentTarget;
      YM.startCompass(function (heading) {
        dial.setAttribute("transform", "rotate(" + (-heading) + " 60 60)");
      }).then(function (ok) {
        btn.textContent = ok ? "Telefonni aylantiring: sariq o'q qiblani ko'rsatadi" : "Kompas mavjud emas";
        btn.disabled = true;
      });
    });
  };

  YM.startCompass = function (cb) {
    var ask = Promise.resolve("granted");
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      ask = DeviceOrientationEvent.requestPermission();
    }
    return ask.then(function (state) {
      if (state !== "granted") return false;
      var handler = function (e) {
        var h = null;
        if (typeof e.webkitCompassHeading === "number") h = e.webkitCompassHeading;
        else if (e.absolute && e.alpha != null) h = 360 - e.alpha;
        if (h != null) cb(h);
      };
      window.addEventListener("deviceorientationabsolute", handler, true);
      window.addEventListener("deviceorientation", handler, true);
      return "ondeviceorientation" in window;
    }).catch(function () { return false; });
  };

  document.addEventListener("DOMContentLoaded", YM.initTheme);
})();
