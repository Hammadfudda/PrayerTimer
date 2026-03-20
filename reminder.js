// ========================
// Service Worker
// ========================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/serviceWorker.js")
      .then(() => console.log("SW registered"))
      .catch(err => console.warn("SW failed:", err));
  });
}

// ========================
// Search Toggle (ONE button only)
// ========================
let searchOpen = false;

function toggleSearch() {
  searchOpen = !searchOpen;
  const expand    = document.getElementById("searchExpand");
  const toggleBtn = document.getElementById("searchToggleBtn");

  if (searchOpen) {
    expand.classList.add("open");
    toggleBtn.classList.add("active");
    setTimeout(() => document.getElementById("cityInput").focus(), 380);
  } else {
    expand.classList.remove("open");
    toggleBtn.classList.remove("active");
  }
}

// Enter key
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("cityInput").addEventListener("keydown", e => {
    if (e.key === "Enter") SearchCityName();
    if (e.key === "Escape") { if (searchOpen) toggleSearch(); }
  });
});

// Click outside to close
document.addEventListener("click", e => {
  const expand    = document.getElementById("searchExpand");
  const toggleBtn = document.getElementById("searchToggleBtn");
  if (searchOpen && !expand.contains(e.target) && !toggleBtn.contains(e.target)) {
    searchOpen = false;
    expand.classList.remove("open");
    toggleBtn.classList.remove("active");
  }
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
function convertTo12Hour(time24) {
  if (!time24) return "—";
  const clean = time24.split(" ")[0];
  const [h, m] = clean.split(":");
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${m} ${ampm}`;
}

function getCityDate(timezone) {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false
    }).formatToParts(now);
    const get = type => parts.find(p => p.type === type)?.value;
    let h = parseInt(get("hour"), 10);
    if (h === 24) h = 0;
    const str = `${get("year")}-${get("month")}-${get("day")}T${String(h).padStart(2,"0")}:${get("minute")}:${get("second")}`;
    return new Date(str);
  } catch {
    return new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  }
}

function timeToDate(timeStr, ref) {
  const [h, m] = timeStr.split(" ")[0].split(":").map(Number);
  const d = new Date(ref);
  d.setHours(h, m, 0, 0);
  return d;
}

function diffHM(from, to) {
  const total = Math.max(0, Math.floor((to - from) / 60000));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

// ========================
// Active Prayer (FIXED)
// ========================
const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

function getActivePrayer(timings, cityNow) {
  const dates = {};
  for (const p of PRAYERS) dates[p] = timeToDate(timings[p], cityNow);
  const sunrise = timings.Sunrise ? timeToDate(timings.Sunrise, cityNow) : null;

  for (let i = 0; i < PRAYERS.length; i++) {
    const name  = PRAYERS[i];
    const start = dates[name];
    let end, next, nextTime;

    if (name === "Fajr" && sunrise) {
      end = sunrise; next = "Sunrise"; nextTime = timings.Sunrise;
    } else if (name === "Isha") {
      // Next Fajr: if today's Fajr already passed, use tomorrow's Fajr
      let nextFajr = dates["Fajr"];
      if (cityNow >= nextFajr) nextFajr = new Date(nextFajr.getTime() + 86400000);
      end = nextFajr; next = "Fajr"; nextTime = timings.Fajr;
    } else {
      next = PRAYERS[i + 1]; nextTime = timings[next]; end = dates[next];
    }

    if (cityNow >= start && cityNow < end) {
      return { current: name, currentTime: timings[name], remaining: diffHM(cityNow, end), next, nextTime };
    }
  }

  // Between Sunrise and Dhuhr
  if (sunrise && cityNow >= sunrise && cityNow < dates["Dhuhr"]) {
    return { current: "Dhuhr", currentTime: timings.Dhuhr, remaining: diffHM(cityNow, dates["Dhuhr"]), next: "Dhuhr", nextTime: timings.Dhuhr, waitingFor: true };
  }

  // Before Fajr (late night) — Fajr aaj ka hai, already future mein hai
  const nextFajr = cityNow < dates["Fajr"]
    ? dates["Fajr"]
    : new Date(dates["Fajr"].getTime() + 86400000);
  return {
    current: "Isha", currentTime: timings.Isha,
    remaining: diffHM(cityNow, nextFajr),
    next: "Fajr", nextTime: timings.Fajr
  };
}

// ========================
// Prayer Metadata
// ========================
const META = {
  Fajr:    { emoji: "🌙", ar: "الفجر" },
  Dhuhr:   { emoji: "☀️",  ar: "الظهر" },
  Asr:     { emoji: "🌤️", ar: "العصر" },
  Maghrib: { emoji: "🌅", ar: "المغرب" },
  Isha:    { emoji: "🌙", ar: "العشاء" },
};

// ========================
// UI Render
// ========================
function updateHero(info) {
  const { current, currentTime, remaining, next, nextTime, waitingFor } = info;
  document.getElementById("currentPrayerLabel").textContent = waitingFor ? "Upcoming" : current + " Prayer";
  document.getElementById("currentPrayerTime").textContent  = convertTo12Hour(currentTime);

  document.getElementById("remainingBlock").innerHTML = waitingFor
    ? `<div class="remaining-label">Dhuhr starts in</div>
       <div class="remaining-time-big">${remaining.hours}h ${remaining.minutes}m</div>`
    : `<div class="remaining-label">Ends in</div>
       <div class="remaining-time-big">${remaining.hours}h ${remaining.minutes}m</div>
       <div class="remaining-sub">Next: <strong>${next}</strong> at <strong>${convertTo12Hour(nextTime)}</strong></div>`;
}

function buildGrid(timings, activeName) {
  const grid = document.getElementById("prayerGrid");
  grid.innerHTML = "";

  for (const name of PRAYERS) {
    const m = META[name] || { emoji: "🕌", ar: "" };
    const isActive = name === activeName;
    const card = document.createElement("div");
    card.className = "prayer-card" + (isActive ? " active-prayer" : "");
    card.innerHTML = `
      <div class="prayer-left">
        <div class="prayer-emoji">${m.emoji}</div>
        <div>
          <div class="prayer-name-en">${name}</div>
          <div class="prayer-name-ar">${m.ar}</div>
        </div>
      </div>
      <div class="prayer-right">
        <div class="prayer-time-text">${convertTo12Hour(timings[name])}</div>
        <div class="active-dot"></div>
      </div>`;
    grid.appendChild(card);
  }
  document.getElementById("emptyState").classList.add("hidden");
}

// ========================
// Live Clock
// ========================
let clockInterval = null;
let savedTimings  = null;
let savedTimezone = null;

function startClock(timezone) {
  savedTimezone = timezone;
  if (clockInterval) clearInterval(clockInterval);

  function tick() {
    const now = getCityDate(timezone);
    document.getElementById("liveDate").textContent =
      now.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });

    const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    const ampm = h >= 12 ? "PM" : "AM";
    document.getElementById("liveClock").textContent =
      `${h%12||12}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} ${ampm}`;

    // Refresh every minute
    if (savedTimings && s === 0) {
      const info = getActivePrayer(savedTimings, now);
      updateHero(info);
      buildGrid(savedTimings, info.waitingFor ? "Dhuhr" : info.current);
    }
  }
  tick();
  clockInterval = setInterval(tick, 1000);
}

// ========================
// Full Render
// ========================
function renderAll(city, timezone, timings) {
  savedTimings = timings;
  const now    = getCityDate(timezone);
  const info   = getActivePrayer(timings, now);

  document.getElementById("cityBadge").textContent = city;
  updateHero(info);
  buildGrid(timings, info.waitingFor ? "Dhuhr" : info.current);
  startClock(timezone);
}

// ========================
// Search
// ========================
function setLoading(on) {
  const btn = document.getElementById("searchButton");
  const sp  = document.getElementById("spinnerChecker");
  btn.style.display = on ? "none" : "flex";
  on ? sp.classList.add("active") : sp.classList.remove("active");
}

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
      const tz    = data.results[0].annotations.timezone.name || "Asia/Karachi";
      const comp  = data.results[0].components;
      const city  = comp?.city || comp?.town || comp?.state || val;

      return fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=2&school=1`)
        .then(r => r.json())
        .then(td => ({ tz, city, timings: td.data.timings }));
    })
    .then(res => {
      if (!res) return;
      const cleaned = {};
      for (const [k, v] of Object.entries(res.timings)) cleaned[k] = v.split(" ")[0];
      saveData(res.city, res.tz, cleaned);
      renderAll(res.city, res.tz, cleaned);
      document.getElementById("cityInput").value = "";
      if (searchOpen) toggleSearch();
    })
    .catch(() => showErrorCard())
    .finally(() => setLoading(false));
}

// ========================
// LocalStorage
// ========================
const KEY = "pt_v3";

function saveData(city, tz, timings) {
  localStorage.setItem(KEY, JSON.stringify({ city, tz, timings, date: new Date().toDateString() }));
}

function loadData() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (!d) return null;
    if (d.date !== new Date().toDateString()) return { city: d.city, tz: d.tz, stale: true };
    return d;
  } catch { return null; }
}

function silentRefetch(city) {
  fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(city)}&key=3968313623964ce893353132aee0eea0`)
    .then(r => r.json())
    .then(data => {
      if (!data.results?.length) return;
      const { lat, lng } = data.results[0].geometry;
      const tz   = data.results[0].annotations?.timezone?.name || "Asia/Karachi";
      const comp = data.results[0].components;
      const name = comp?.city || comp?.town || city;
      return fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=2&school=1`)
        .then(r => r.json())
        .then(td => {
          const cleaned = {};
          for (const [k,v] of Object.entries(td.data.timings)) cleaned[k] = v.split(" ")[0];
          saveData(name, tz, cleaned);
          renderAll(name, tz, cleaned);
        });
    })
    .catch(console.warn);
}

// ========================
// Init
// ========================
window.addEventListener("DOMContentLoaded", () => {
  const saved = loadData();
  if (saved?.timings) {
    renderAll(saved.city, saved.tz, saved.timings);
  } else if (saved?.stale) {
    silentRefetch(saved.city);
  }
});