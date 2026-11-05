// =========================================================
// Service worker de MamaSegui
// Guarda una copia de la app en el celular para que funcione sin conexión.
//
// IMPORTANTE: cada vez que publiques cambios en la app, subí el número de VERSION.
// Así los celulares que ya la tienen instalada descargan la versión nueva.
// =========================================================

const VERSION = "mamasegui-v6";

// Archivos de la app que se guardan al instalar
const ARCHIVOS = [
  "./",
  "./index.html",
  "./logo-favaloro.png",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

// 1) Instalación: descarga y guarda todos los archivos
self.addEventListener("install", evento => {
  evento.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())   // la versión nueva se activa sin esperar a cerrar la app
  );
});

// 2) Activación: borra las copias de versiones anteriores de MamaSegui.
//    Solo las que empiezan con "mamasegui-": el sitio es compartido con Hospifava, CardioSegui
//    y otras apps, y sus copias no se tocan.
self.addEventListener("activate", evento => {
  evento.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves
        .filter(c => c.startsWith("mamasegui-") && c !== VERSION)
        .map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

// 3) Pedidos de la app
self.addEventListener("fetch", evento => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;
  if (new URL(pedido.url).origin !== self.location.origin) return;   // solo archivos propios

  if (pedido.mode === "navigate") {
    // La página: primero intenta internet (para tener siempre la última versión);
    // si no hay conexión, usa la copia guardada
    evento.respondWith(
      fetch(pedido)
        .then(respuesta => {
          if (respuesta.ok) {   // solo guarda respuestas correctas (no páginas de error)
            const copia = respuesta.clone();
            caches.open(VERSION).then(cache => cache.put("./index.html", copia));
          }
          return respuesta;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Imágenes, íconos y manifest: primero la copia guardada (más rápido), si no, internet
  evento.respondWith(
    caches.match(pedido).then(guardado => guardado || fetch(pedido))
  );
});
