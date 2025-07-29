if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker
      .register("/serviceWorker.js")
      .then(res =>{

Notification.requestPermission().then(res=>{
    if(Notification.permission=='granted'){
        console.log("Granted permission")
        return
    }
    console.log(res)
})
         console.log("service worker registered")})
      .catch(err => console.log("service worker not registered", err))
  })
}


navigator.serviceWorker.ready.then((Notification)=>{
  let options = {
   title: "Prayer Reminder",
   body: "It's time for your prayer",
    icon: "assets/icons/icon-48x48.png",
  };
  Notification.showNotification("prayerTime",options);
})



// Convert 24-hour to 12-hour format for display
function convertTo12Hour(time24) {
  const [hourStr, minute] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${ampm}`;
}

function ErrorPrayer() {
  document.getElementById("PrayerError").innerHTML = "";
}

let searchButton = document.getElementById("searchButton");
let spinnerChecker = document.getElementById("spinnerChecker");
spinnerChecker.style.display = "none";

// Get city time in correct timezone
function getCityDate(timezone) {
  const now = new Date();
  const cityString = now.toLocaleString("en-US", { timeZone: timezone });
  return new Date(cityString);
}

// Determine current and next prayer
const getActivePrayer = (timings, cityNow) => {
  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const toDate = (time) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(cityNow);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const diffHM = (from, to) => {
    const totalMinutes = Math.floor((to - from) / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes };
  };

  for (let i = 0; i < prayers.length; i++) {
    const start = toDate(timings[prayers[i]]);
    let end;
    let nextPrayerName;
    let nextPrayerTime;

    if (prayers[i] === "Fajr" && timings.Sunrise) {
      end = toDate(timings.Sunrise);
      nextPrayerName = "Sunrise";
      nextPrayerTime = timings.Sunrise;
    } else {
      const nextIndex = (i + 1) % prayers.length;
      nextPrayerName = prayers[nextIndex];
      nextPrayerTime = timings[nextPrayerName];
      end = toDate(nextPrayerTime);
      if (nextIndex === 0) {
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    if (cityNow >= start && cityNow < end) {
      return {
        currentPrayer: prayers[i],
        startTime: timings[prayers[i]],
        remainingTime: diffHM(cityNow, end),
        nextPrayer: nextPrayerName,
        nextStartTime: nextPrayerTime
      };
    }
  }

  return { currentPrayer: null };
};

// Function to show the error card UI
function showErrorCard() {
  document.getElementById("PrayerError").innerHTML = `
    <div class="error-overlay">
      <div class="card border rounded-3 shadow-sm error-card">
        <div class="card-body text-center p-4">
          <div class="mb-3 text-danger">
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="currentColor" class="bi bi-exclamation-triangle" viewBox="0 0 16 16">
              <path d="M7.938 2.016a.13.13 0 0 1 .125 0l6.857 11.856c.03.053.048.112.048.175a.247.247 0 0 1-.247.247H1.28a.247.247 0 0 1-.247-.247.247.247 0 0 1 .048-.175L7.938 2.016zM8 5c-.535 0-.954.462-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507C8.954 5.462 8.535 5 8 5zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
            </svg>
          </div>
          <h5 class="fw-bold text-dark">Data Not Found</h5>
          <p class="text-muted mb-3">
            Sorry! Prayer time data is not available for this city.<br>
            Please check the city name and try again.
          </p>
          <button onclick="ErrorPrayer()" class="btn btn-dark px-4">Retry</button>
        </div>
      </div>
    </div>`;
}


function SearchCityName() {
  const cityInput = document.getElementById("cityInput").value.trim();
  if (!cityInput) return;

  searchButton.style.display = "none";
  spinnerChecker.style.display = "inline-block";

  fetch(`https://api.opencagedata.com/geocode/v1/json?q=${cityInput}&key=3968313623964ce893353132aee0eea0`)
    .then(r => r.json())
    .then(data => {
      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry;
        const timeZone = data.results[0].annotations.timezone.name;
        return fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=1&school=1`)
          .then(res => res.json())
          .then(timingData => ({ timingData, timeZone }));
      } else {
        showErrorCard();
      }
    })
    .then(result => {
      if (!result) return;
      const { timingData, timeZone } = result;
      const timings = timingData.data.timings;

      // Convert to 12-hour for display
      const convertedTimings = {};
      for (const [key, value] of Object.entries(timings)) {
        convertedTimings[key] = convertTo12Hour(value);
      }

      const cityNow = getCityDate(timeZone);
      const { currentPrayer, startTime, remainingTime, nextPrayer, nextStartTime } =
        getActivePrayer(timings, cityNow);

      if (!currentPrayer) {
        showErrorCard();
        return;
      }

      // Update Front Card
      document.getElementById("FrontTime").innerHTML = `
        <p class="ImageText">${currentPrayer} - ${convertTo12Hour(startTime)}</p>
      `;

      document.getElementById("RemainingTime").innerHTML = `
        <p class="RemainingTime fw-bold">
          Time Remaining: ${remainingTime.hours} hr ${remainingTime.minutes} min
        </p>
        <p class="text-muted">
          Next: <strong>${nextPrayer}</strong> at <strong>${convertTo12Hour(nextStartTime)}</strong>
        </p>
      `;

      // Update prayer list
      document.getElementById("prayerTiming").innerHTML = `
        <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow"><span class="prayerName">Fajr</span><span class="prayerTime">${convertedTimings.Fajr}</span></div>
        <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow"><span class="prayerName">Dhuhr</span><span class="prayerTime">${convertedTimings.Dhuhr}</span></div>
        <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow"><span class="prayerName">Asr</span><span class="prayerTime">${convertedTimings.Asr}</span></div>
        <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow"><span class="prayerName">Maghrib</span><span class="prayerTime">${convertedTimings.Maghrib}</span></div>
        <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow"><span class="prayerName">Isha</span><span class="prayerTime">${convertedTimings.Isha}</span></div>`;
    })
    .catch(err => {
      console.error(err);
      showErrorCard();
    })
    .finally(() => {
      spinnerChecker.style.display = "none";
      searchButton.style.display = "inline-block";
      document.getElementById("cityInput").value = "";
    });
}
