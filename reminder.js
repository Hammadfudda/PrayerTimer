function convertTo12Hour(time24) {
  // Expects time24 in "HH:mm" format
  const [hourStr, minute] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${ampm}`;
}

function ErrorPrayer() {
  document.getElementById("PrayerError").innerHTML = "";
};

let searchButton = document.getElementById("searchButton");
let spinnerChecker = document.getElementById("spinnerChecker");
spinnerChecker.style.display = "none"; // Hide spinner initially
function SearchCityName() {
  // Prevent default form submission if this is a form
  let cityInput = document.getElementById("cityInput").value.trim();
  if (cityInput) {
    // Hide button, show spinner
    searchButton.style.display = "none";
    spinnerChecker.style.display = "inline-block";

    fetch(`https://api.opencagedata.com/geocode/v1/json?q=${cityInput}&key=3968313623964ce893353132aee0eea0`)
      .then(response => response.json())
      .then(data => {

        if (data.results && data.results.length > 0) {
          const TimeZone = data.results[0].annotations.timezone.name;

          const { lat, lng } = data.results[0].geometry;

          return fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=1&school=1`);
        } else {
          let PrayerError = document.getElementById("PrayerError");
          PrayerError.innerHTML = `
          <div class="d-flex justify-content-center align-items-center" style="min-height: 100vh; background-color: #f4f9ff;">
  <div class="card border rounded-3 shadow-sm" style="max-width: 360px; width: 100%; background-color: #ffffff;">
    <div class="card-body text-center p-4">
      <!-- Icon -->
      <div class="mb-3 text-danger">
        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="currentColor" class="bi bi-exclamation-triangle" viewBox="0 0 16 16">
          <path d="M7.938 2.016a.13.13 0 0 1 .125 0l6.857 11.856c.03.053.048.112.048.175a.247.247 0 0 1-.247.247H1.28a.247.247 0 0 1-.247-.247.247.247 0 0 1 .048-.175L7.938 2.016zM8 5c-.535 0-.954.462-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507C8.954 5.462 8.535 5 8 5zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
        </svg>
      </div>

      <!-- Title -->
      <h5 class="fw-bold text-dark">Data Not Found</h5>

      <!-- Message -->
      <p class="text-muted mb-3">
        Sorry! Prayer time data is not available for this city.<br>
        Please check the city name and try again.
      </p>

      <!-- Retry Button -->
      <button onclick="ErrorPrayer()" class="btn btn-dark px-4">Retry</button>
    </div>
  </div>
</div>`

        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.data && data.data.timings) {
          const timings = data.data.timings;
          console.log(timings);
          const convertedTimings = {};

          for (const [name, time] of Object.entries(timings)) {
            convertedTimings[name] = convertTo12Hour(time);
          }

          const PrayerTiming = document.getElementById("prayerTiming");
          let { Fajr, Dhuhr, Asr, Maghrib, Isha } = convertedTimings;

          PrayerTiming.innerHTML = `
            <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow">
              <span class="prayerName">Fajr</span>
              <span class="prayerTime">${Fajr}</span>
            </div>
            <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow">
              <span class="prayerName">Dhuhr</span>
              <span class="prayerTime">${Dhuhr}</span>
            </div>
            <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow">
              <span class="prayerName">Asr</span>
              <span class="prayerTime">${Asr}</span>
            </div>
            <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow">
              <span class="prayerName">Maghrib</span>
              <span class="prayerTime">${Maghrib}</span>
            </div>
            <div class="border border-2 border-dark rounded p-2 mt-3 prayerRow">
              <span class="prayerName">Isha</span>
              <span class="prayerTime">${Isha}</span>
            </div>`;
        } else {
          let PrayerError = document.getElementById("PrayerError");
          PrayerError.innerHTML = `
          <div class="d-flex justify-content-center align-items-center" style="min-height: 100vh; background-color: #f4f9ff;">
  <div class="card border rounded-3 shadow-sm" style="max-width: 360px; width: 100%; background-color: #ffffff;">
    <div class="card-body text-center p-4">
      <!-- Icon -->
      <div class="mb-3 text-danger">
        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="currentColor" class="bi bi-exclamation-triangle" viewBox="0 0 16 16">
          <path d="M7.938 2.016a.13.13 0 0 1 .125 0l6.857 11.856c.03.053.048.112.048.175a.247.247 0 0 1-.247.247H1.28a.247.247 0 0 1-.247-.247.247.247 0 0 1 .048-.175L7.938 2.016zM8 5c-.535 0-.954.462-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507C8.954 5.462 8.535 5 8 5zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
        </svg>
      </div>

      <!-- Title -->
      <h5 class="fw-bold text-dark">Data Not Found</h5>

      <!-- Message -->
      <p class="text-muted mb-3">
        Sorry! Prayer time data is not available for this city.<br>
        Please check the city name and try again.
      </p>

      <!-- Retry Button -->
      <button class="btn btn-dark px-4">Retry</button>
    </div>
  </div>
</div>`
        }
      })
      .catch(error => console.error("Error:", error))
      .finally(() => {
        // Restore button and hide spinner
        spinnerChecker.style.display = "none";
        searchButton.style.display = "inline-block";
        document.getElementById("cityInput").value = "";
      });
  }
}



