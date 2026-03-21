// ========================
// Service Worker
// ========================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/serviceWorker.js")
      .then(() => console.log("SW ok"))
      .catch(e => console.warn("SW fail", e));
  });
}

// ========================
// Search Toggle
// ========================
let searchOpen = false;

function toggleSearch() {
  searchOpen = !searchOpen;
  const exp = document.getElementById("searchExpand");
  const btn = document.getElementById("searchToggleBtn");
  if (searchOpen) {
    exp.classList.add("open");
    btn.style.display = "none";
    setTimeout(() => document.getElementById("cityInput").focus(), 380);
  } else {
    exp.classList.remove("open");
    btn.style.display = "flex";
  }
}

// Close on outside click
document.addEventListener("click", e => {
  if (!searchOpen) return;
  const exp = document.getElementById("searchExpand");
  const btn = document.getElementById("searchToggleBtn");
  if (!exp.contains(e.target) && !btn.contains(e.target)) {
    searchOpen = false;
    exp.classList.remove("open");
    btn.style.display = "flex";
  }
});

// Enter / Escape keys
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("cityInput").addEventListener("keydown", e => {
    if (e.key === "Enter") SearchCityName();
    if (e.key === "Escape" && searchOpen) toggleSearch();
  });
});

// ========================
// Error Modal
// ========================
function showErrorCard() {
  document.getElementById("errorModal").classList.remove("modal-hidden");
}
function closeError() {
  document.getElementById("errorModal").classList.add("modal-hidden");
  if (!searchOpen) toggleSearch();
}

// ========================
// Time Helpers
// ========================
function to12(t) {
  if (!t) return "—";
  const [hStr, mStr] = t.split(" ")[0].split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

// Get accurate current time in any timezone
function cityNow(tz) {
  const now = new Date();
  try {
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year:"numeric", month:"2-digit", day:"2-digit",
      hour:"2-digit", minute:"2-digit", second:"2-digit",
      hour12: false
    }).formatToParts(now);
    const g = type => p.find(x => x.type === type)?.value;
    let h = parseInt(g("hour"), 10);
    if (h === 24) h = 0;
    return new Date(`${g("year")}-${g("month")}-${g("day")}T${String(h).padStart(2,"0")}:${g("minute")}:${g("second")}`);
  } catch {
    return new Date(now.toLocaleString("en-US", { timeZone: tz }));
  }
}

function toDate(timeStr, ref) {
  const [h, m] = timeStr.split(" ")[0].split(":").map(Number);
  const d = new Date(ref);
  d.setHours(h, m, 0, 0);
  return d;
}

function diffHM(a, b) {
  const mins = Math.max(0, Math.floor((b - a) / 60000));
  return { h: Math.floor(mins / 60), m: mins % 60 };
}

// ========================
// Active Prayer Logic
// ========================
const PRAYERS = ["Fajr","Dhuhr","Asr","Maghrib","Isha"];

function activePrayer(timings, now) {
  const d = {};
  for (const p of PRAYERS) d[p] = toDate(timings[p], now);
  const sunrise = timings.Sunrise ? toDate(timings.Sunrise, now) : null;

  for (let i = 0; i < PRAYERS.length; i++) {
    const name = PRAYERS[i];
    const start = d[name];
    let end, next, nextT;

    if (name === "Fajr" && sunrise) {
      // Fajr window ends at Sunrise
      end = sunrise; next = "Sunrise"; nextT = timings.Sunrise;
    } else if (name === "Isha") {
      // Isha ends at next Fajr
      let nf = d["Fajr"];
      if (now >= nf) nf = new Date(nf.getTime() + 86400000);
      end = nf; next = "Fajr"; nextT = timings.Fajr;
    } else {
      next = PRAYERS[i+1]; nextT = timings[next]; end = d[next];
    }

    if (now >= start && now < end) {
      return { name, time: timings[name], rem: diffHM(now, end), next, nextT };
    }
  }

  // Between Sunrise and Dhuhr — waiting for Dhuhr
  if (sunrise && now >= sunrise && now < d["Dhuhr"]) {
    return { name:"Dhuhr", time:timings.Dhuhr, rem:diffHM(now, d["Dhuhr"]), next:"Dhuhr", nextT:timings.Dhuhr, waiting:true };
  }

  // Late night before Fajr
  const nf = now < d["Fajr"] ? d["Fajr"] : new Date(d["Fajr"].getTime() + 86400000);
  return { name:"Isha", time:timings.Isha, rem:diffHM(now, nf), next:"Fajr", nextT:timings.Fajr };
}

// ========================
// Prayer Metadata
// ========================
const META = {
  Fajr:    { e:"🌙", ar:"الفجر" },
  Dhuhr:   { e:"☀️",  ar:"الظهر" },
  Asr:     { e:"🌤️", ar:"العصر" },
  Maghrib: { e:"🌅", ar:"المغرب" },
  Isha:    { e:"🌙", ar:"العشاء" },
};

// ========================
// Render UI
// ========================
function renderHero(info) {
  document.getElementById("currentPrayerLabel").textContent =
    info.waiting ? "Upcoming" : info.name + " Prayer";
  document.getElementById("currentPrayerTime").textContent = to12(info.time);

  document.getElementById("remainingBlock").innerHTML = info.waiting
    ? `<div class="rem-label">Dhuhr starts in</div>
       <div class="rem-time">${info.rem.h}h ${info.rem.m}m</div>`
    : `<div class="rem-label">Ends in</div>
       <div class="rem-time">${info.rem.h}h ${info.rem.m}m</div>
       <div class="rem-next">Next: <strong>${info.next}</strong> at <strong>${to12(info.nextT)}</strong></div>`;
}

function renderGrid(timings, active) {
  const grid = document.getElementById("prayerGrid");
  grid.innerHTML = "";
  for (const name of PRAYERS) {
    const m = META[name];
    const card = document.createElement("div");
    card.className = "prayer-card" + (name === active ? " active-prayer" : "");
    card.innerHTML = `
      <div class="pc-left">
        <div class="pc-emoji">${m.e}</div>
        <div>
          <div class="pc-name">${name}</div>
          <div class="pc-ar">${m.ar}</div>
        </div>
      </div>
      <div class="pc-right">
        <div class="pc-time">${to12(timings[name])}</div>
        <div class="pc-dot"></div>
      </div>`;
    grid.appendChild(card);
  }
  document.getElementById("emptyState").classList.add("hidden");
}

// ========================
// Live Clock
// ========================
let _interval = null, _timings = null, _tz = null;

function startClock(tz) {
  _tz = tz;
  if (_interval) clearInterval(_interval);

  function tick() {
    const now = cityNow(tz);

    // Date
    document.getElementById("liveDate").textContent =
      now.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });

    // Clock
    const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    document.getElementById("liveClock").textContent =
      `${h%12||12}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} ${h>=12?"PM":"AM"}`;

    // Refresh prayer info every minute
    if (_timings && s === 0) {
      const info = activePrayer(_timings, now);
      renderHero(info);
      renderGrid(_timings, info.waiting ? "Dhuhr" : info.name);
    }
  }

  tick();
  _interval = setInterval(tick, 1000);
}

// ========================
// Full Render
// ========================
function renderAll(city, tz, timings) {
  _timings = timings;
  const now  = cityNow(tz);
  const info = activePrayer(timings, now);

  document.getElementById("cityBadge").textContent = city;
  renderHero(info);
  renderGrid(timings, info.waiting ? "Dhuhr" : info.name);
  startClock(tz);
}

// ========================
// Loading State
// ========================
function setLoading(on) {
  document.getElementById("searchButton").style.display = on ? "none" : "flex";
  document.getElementById("spinnerChecker").classList.toggle("active", on);
}

// ========================
// Search
// ========================
function SearchCityName() {
  const val = document.getElementById("cityInput").value.trim();
  if (!val) return;
  setLoading(true);

  fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(val)}&key=3968313623964ce893353132aee0eea0`)
    .then(r => r.json())
    .then(data => {
      if (!data.results?.length || !data.results[0].annotations?.timezone) {
        showErrorCard(); setLoading(false); return null;
      }
      const { lat, lng } = data.results[0].geometry;
      const tz   = data.results[0].annotations.timezone.name || "Asia/Karachi";
      const comp = data.results[0].components;
      const city = comp?.city || comp?.town || comp?.state || val;

      return fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=2&school=1`)
        .then(r => r.json())
        .then(td => ({ tz, city, timings: td.data.timings }));
    })
    .then(res => {
      if (!res) return;
      const clean = {};
      for (const [k,v] of Object.entries(res.timings)) clean[k] = v.split(" ")[0];
      save(res.city, res.tz, clean);
      renderAll(res.city, res.tz, clean);
      document.getElementById("cityInput").value = "";
      if (searchOpen) toggleSearch();
    })
    .catch(() => showErrorCard())
    .finally(() => setLoading(false));
}

// ========================
// LocalStorage
// ========================
const KEY = "pt_v4";

function save(city, tz, timings) {
  localStorage.setItem(KEY, JSON.stringify({ city, tz, timings, date: new Date().toDateString() }));
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (!d) return null;
    if (d.date !== new Date().toDateString()) return { city:d.city, tz:d.tz, stale:true };
    return d;
  } catch { return null; }
}

function silentRefetch(city, tz) {
  // Use saved tz directly to avoid geocode call on stale
  fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=&method=2&school=1`)
    .then(r => r.json())
    .then(td => {
      if (!td?.data?.timings) throw new Error("no data");
      const clean = {};
      for (const [k,v] of Object.entries(td.data.timings)) clean[k] = v.split(" ")[0];
      save(city, tz, clean);
      renderAll(city, tz, clean);
    })
    .catch(() => {
      // If timingsByCity fails, fallback to geocode refetch
      fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(city)}&key=3968313623964ce893353132aee0eea0`)
        .then(r => r.json())
        .then(data => {
          if (!data.results?.length) return;
          const { lat, lng } = data.results[0].geometry;
          const timezone = data.results[0].annotations?.timezone?.name || tz;
          const comp = data.results[0].components;
          const name = comp?.city || comp?.town || city;
          return fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=2&school=1`)
            .then(r => r.json())
            .then(td => {
              const clean = {};
              for (const [k,v] of Object.entries(td.data.timings)) clean[k] = v.split(" ")[0];
              save(name, timezone, clean);
              renderAll(name, timezone, clean);
            });
        })
        .catch(console.warn);
    });
}

// ========================
// Init on load
// ========================
window.addEventListener("DOMContentLoaded", () => {
  const saved = load();
  if (saved?.timings) {
    renderAll(saved.city, saved.tz, saved.timings);
  } else if (saved?.stale) {
    silentRefetch(saved.city, saved.tz);
  }
});