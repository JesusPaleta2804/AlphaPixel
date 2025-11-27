/* ===============================
   Alpha Pixel Service Worker v5 (Final)
   =============================== */
const CACHE_NAME = "alphapixel-v5-final";

// Archivos que SIEMPRE deben estar disponibles offline
const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./offline.html",
    "./manifest.json",
    "./img/favicon.ico",
    "./img/logo.jpeg"
];

// 1. INSTALACIÓN
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("[SW] Caching archivos críticos...");
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting(); // Fuerza al SW a activarse de inmediato
});

// 2. ACTIVACIÓN (Limpieza de cachés viejas)
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) {
                    console.log("[SW] Borrando caché vieja:", key);
                    return caches.delete(key);
                }
            })
        ))
    );
    self.clients.claim(); // Toma control de todas las páginas abiertas
});

// 3. INTERCEPTOR DE RED (Estrategia: Cache First con Network Fallback)
self.addEventListener("fetch", event => {
    // Solo nos interesan peticiones GET (navegación y archivos)
    if (event.request.method !== "GET") return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // A) Si el archivo está en caché, úsalo
            if (cachedResponse) {
                return cachedResponse;
            }

            // B) Si no, intenta buscarlo en la red (Network)
            return fetch(event.request)
                .then(networkResponse => {
                    // Si la respuesta es válida, guárdala en caché dinámica para la próxima
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    // C) ERROR DE RED (OFFLINE / XAMPP APAGADO)
                    
                    // Si lo que el usuario pedía era una página web (HTML)...
                    if (event.request.headers.get('accept').includes('text/html')) {
                        // ...Devolvemos SIEMPRE el offline.html que guardamos al inicio
                        return caches.match('./offline.html');
                    }
                    
                    // Para imágenes u otros recursos que fallen, no hacemos nada (se verán rotos)
                });
        })
    );
});

/* ===============================
   NOTIFICACIONES PUSH (CORREGIDO)
   =============================== */
self.addEventListener('push', function(event) {
    if (!(self.Notification && self.Notification.permission === 'granted')) {
        return;
    }

    const data = event.data ? event.data.json() : {};
    const title = data.title || "Alpha Pixel";
    
    const options = {
        body: data.body || "Tienes una nueva notificación.",
        icon: 'img/logo.jpeg',  // Asegúrate que esta ruta existe
        badge: 'img/logo.jpeg', // Icono pequeño para barra de estado (Android)
        vibrate: [100, 50, 100],
        data: {
            url: data.data ? data.data.url : '/' // Guardamos la URL para usarla al hacer clic
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// AL HACER CLIC EN LA NOTIFICACIÓN
self.addEventListener('notificationclick', function(event) {
    console.log('[SW] Notificación clickeada');
    
    event.notification.close(); // Cierra la alerta visual

    // CORRECCIÓN IMPORTANTE: Usamos 'self.clients'
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // URL a abrir (o el inicio si no viene nada)
            const urlToOpen = event.notification.data.url || '/';
            
            // 1. Si ya hay una pestaña abierta con esa URL, la enfocamos
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                // Verificamos si la URL coincide y si podemos enfocarla
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // 2. Si no está abierta, abrimos una nueva pestaña
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});