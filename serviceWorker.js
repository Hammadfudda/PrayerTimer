const staticDevCoffee = "PrayerTimer"
const assets = [
  "/",
  "index.html",
  "style.css",
  "reminder.js",
"assets/icons/icon-48x48.png",
"assets/icons/icon-72x72.png",
"assets/icons/icon-96x96.png",
"assets/icons/icon-128x128.png",
"assets/icons/icon-144x144.png",
"assets/icons/icon-152x152.png",
"assets/icons/icon-192x192.png",
"assets/icons/icon-256x256.png",
"assets/icons/icon-384x384.png",
"assets/icons/icon-512x512.png",
"assets/islamic.png"
]

self.addEventListener("install", installEvent => {
  installEvent.waitUntil(
    caches.open(staticDevCoffee).then(cache => {
      cache.addAll(assets)
    })
  )
})