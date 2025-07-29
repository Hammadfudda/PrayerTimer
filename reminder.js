// Convert 24-hour time to 12-hour format
function convertTo12Hour(time24) {
  const [hourStr, minute] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${ampm}`;
}

// Clear error message
function ErrorPrayer() {
  document.getElementById("PrayerError").innerHTML = "";
}

// Hide spinner initially
let searchButton = document.getElementById("searchButton");
let spinnerChecker = document.getElementById("spinnerChecker");
spinnerChecker.style.display = "none";

// --- Helper function to find active prayer ---
const getActivePrayer = (timings, timestamp) => {
  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const now = new Date(timestamp * 1000);

  const timeToDate = (time) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const diffHM = (a, b) => {
    const totalMinutes = Math.floor((b - a) / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes };
  };

  for (let i = 0; i < prayers.length; i++) {
    const start = timeToDate(timings[prayers[i]]);
    let end;

    // Special case: Fajr ends at Sunrise
    if (prayers[i] === "Fajr" && timings.Sunrise) {
      end = timeToDate(timings.Sunrise);
    } else {
      const nextIndex = (i + 1) % prayers.length;
      end = timeToDate(timings[prayers[nextIndex]]);
      if (nextIndex === 0) {
        // Next day for Fajr
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    if (now >= start && now < end) {
      return {
        currentPrayer: prayers[i],
        remainingTime: diffHM(now, end),
        elapsedTime: diffHM(start, now),
      };
    }
  }

  return {
    currentPrayer: null,
    remainingTime: { hours: null, minutes: null },
    elapsedTime: { hours: null, minutes: null }
  };
};

// --- Main function to search city and show timings ---
function SearchCityName() {
  let cityInput = document.getElementById("cityInput").value.trim();
  if (cityInput) {
    searchButton.style.display = "none";
    spinnerChecker.style.display = "inline-block";

    fetch(`https://api.opencagedata.com/geocode/v1/json?q=${cityInput}&key=3968313623964ce893353132aee0eea0`)
      .then(response => response.json())
      .then(data => {
        if (data.results && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry;
          return fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=1&school=1`);
        } else {
          let PrayerError = document.getElementById("PrayerError");
          PrayerError.innerHTML = `
          <div class="d-flex justify-content-center align-items-center" style="min-height: 100vh; background-color: #f4f9ff;">
            <div class="card border rounded-3 shadow-sm" style="max-width: 360px; width: 100%; background-color: #ffffff;">
              <div class="card-body text-center p-4">
                <div class="mb-3 text-danger">
                  <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="currentColor" class="bi bi-exclamation-triangle" viewBox="0 0 16 16">
                    <path d="M7.938 2.016a.13.13 0 0 1 .125 0l6.857 11.856c.03.053.048.112.048.175a.247.247 0 0 1-.247.247H1.28a.247.247 0 0 1-.247-.247.247.247 0 0 1 .048-.175L7.938 2.016zM8 5c-.535 0-.954.462-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507C8.954 5.462 8.535 5 8 5zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                  </svg>
                </div>
                <h5 class="fw-bold text-dark">Data Not Found</h5>
                <p class="text-muted mb-3">Sorry! Prayer time data is not available for this city.<br>Please check the city name and try again.</p>
                <button onclick="ErrorPrayer()" class="btn btn-dark px-4">Retry</button>
              </div>
            </div>
          </div>`;
        }
      })
      .then(response => response && response.json())
      .then(data => {
        if (data && data.data && data.data.timings) {
          const timings = data.data.timings;

          // Keep 24-hour format for calculation
          const prayerData = {
            Fajr: timings.Fajr,
            Sunrise: timings.Sunrise,
            Dhuhr: timings.Dhuhr,
            Asr: timings.Asr,
            Maghrib: timings.Maghrib,
            Isha: timings.Isha
          };

          // Convert times to 12-hour for display
          const convertedTimings = {};
          for (const [name, time] of Object.entries(prayerData)) {
            convertedTimings[name] = convertTo12Hour(time);
          }

          // Get active prayer
          const timestamp = data.data.date.timestamp;
          const { currentPrayer, remainingTime, elapsedTime } = getActivePrayer(prayerData, timestamp);

          // --- Update the card on the left ---
          document.getElementById("FrontTime").innerHTML = `
            <p class="ImageText">${currentPrayer} - ${convertedTimings[currentPrayer]}</p>
          `;

          document.getElementById("RemainingTime").innerHTML = `
            <p class="RemainingTime text-bold">
              Time Remaining: ${remainingTime.hours} hr ${remainingTime.minutes} min
            </p>
          `;

          // --- Update the right-side timings list ---
          const PrayerTiming = document.getElementById("prayerTiming");
          let { Fajr, Dhuhr, Asr, Maghrib, Isha } = convertedTimings;

          PrayerTiming.innerHTML = `
            <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow"><span class="prayerName">Fajr</span><span class="prayerTime">${Fajr}</span></div>
            <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow"><span class="prayerName">Dhuhr</span><span class="prayerTime">${Dhuhr}</span></div>
            <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow"><span class="prayerName">Asr</span><span class="prayerTime">${Asr}</span></div>
            <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow"><span class="prayerName">Maghrib</span><span class="prayerTime">${Maghrib}</span></div>
            <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow"><span class="prayerName">Isha</span><span class="prayerTime">${Isha}</span></div>`;
        }
      })
      .catch(error => console.error("Error:", error))
      .finally(() => {
        spinnerChecker.style.display = "none";
        searchButton.style.display = "inline-block";
        document.getElementById("cityInput").value = "";
      });
  }
}
