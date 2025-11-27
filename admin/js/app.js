/* =========================================================
   Alpha Pixel Admin - PouchDB v4 (Full Features)
   ========================================================= */

// 1. INICIALIZAR BASE DE DATOS
let db;
try {
    db = new PouchDB('alpha_pixel_db');
} catch (e) {
    console.error("Error PouchDB:", e);
}

// Variables globales
let clients = [];
let tasks = [];
let editingClientId = null; // Para saber si estamos editando
let editingClientRev = null; // Revisión necesaria para actualizar en PouchDB

// ---------------------------
//   CARGAR DATOS (READ)
// ---------------------------
async function loadData() {
    if (!db) return;
    try {
        const result = await db.allDocs({ include_docs: true, descending: true });
        
        clients = [];
        tasks = [];

        result.rows.forEach(row => {
            const doc = row.doc;
            if (doc.type === 'client') clients.push(doc);
            else if (doc.type === 'task') tasks.push(doc);
        });

        renderClients();
        renderTasks();
        updateDashboard();

    } catch (err) {
        console.error("Error cargando datos:", err);
    }
}

// ---------------------------
//   DASHBOARD
// ---------------------------
function updateDashboard() {
  const cCount = document.getElementById("clients-count");
  const tCount = document.getElementById("tasks-count");
  const tDone = document.getElementById("tasks-done");

  if(cCount) cCount.textContent = clients.length;
  if(tCount) tCount.textContent = tasks.length;
  if(tDone) tDone.textContent = tasks.filter(t => t.status === "done").length;
}

// ---------------------------
//   CLIENTES (CRUD COMPLETO)
// ---------------------------
function renderClients() {
  const tbody = document.querySelector("#clients-table tbody");
  if(!tbody) return;

  tbody.innerHTML = "";
  const searchInput = document.getElementById("client-search");
  const search = searchInput ? searchInput.value.toLowerCase() : "";

  clients
    .filter(c => (c.name || "").toLowerCase().includes(search) || (c.email || "").toLowerCase().includes(search))
    .forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.name || 'Sin nombre'}</td>
        <td>${c.email || ''}</td>
        <td>${c.phone || ''}</td> <td>${c.notes || ''}</td>
        <td>
          <button onclick="editClient('${c._id}')" style="background:#007bff; border:none; color:white; padding:5px 10px; border-radius:4px; margin-right:5px; cursor:pointer;">✎</button>
          <button onclick="deleteDoc('${c._id}')" style="background:#ff3333; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
}

// BUSCADOR
const searchInput = document.getElementById("client-search");
if(searchInput) searchInput.addEventListener("input", renderClients);

// PREPARAR EDICIÓN
window.editClient = async (id) => {
    try {
        const doc = await db.get(id); // Obtener datos actuales
        
        // Llenar el formulario
        document.getElementById("client-name").value = doc.name;
        document.getElementById("client-email").value = doc.email;
        document.getElementById("client-phone").value = doc.phone;
        document.getElementById("client-notes").value = doc.notes;

        // Cambiar estado a "Editando"
        editingClientId = doc._id;
        editingClientRev = doc._rev; // Importante para PouchDB

        // Cambiar texto del botón
        const btn = document.querySelector("#client-form button[type='submit']");
        if(btn) {
            btn.textContent = "Actualizar Cliente";
            btn.style.background = "#007bff"; // Azul para indicar edición
        }

        // Mostrar botón cancelar si no existe
        document.getElementById("client-reset").textContent = "Cancelar Edición";

    } catch (err) {
        console.error("Error al editar:", err);
    }
};

// GUARDAR O ACTUALIZAR CLIENTE
const clientForm = document.getElementById("client-form");
if(clientForm) {
    clientForm.addEventListener("submit", async e => {
      e.preventDefault();
      
      const docData = {
        type: 'client',
        name: document.getElementById("client-name").value,
        email: document.getElementById("client-email").value,
        phone: document.getElementById("client-phone").value,
        notes: document.getElementById("client-notes").value,
        updatedAt: new Date().toISOString()
      };

      try {
          if (editingClientId) {
              // MODO ACTUALIZAR
              docData._id = editingClientId;
              docData._rev = editingClientRev;
              await db.put(docData);
              alert("✅ Cliente actualizado");
          } else {
              // MODO CREAR NUEVO
              docData._id = new Date().toISOString();
              await db.put(docData);
              alert("✅ Cliente agregado");
          }

          resetClientForm();
          loadData();
      } catch (err) { console.error(err); alert("Error al guardar"); }
    });

    // Botón Limpiar/Cancelar
    const resetBtn = document.getElementById("client-reset");
    if(resetBtn) {
        resetBtn.addEventListener("click", resetClientForm);
    }
}

function resetClientForm() {
    document.getElementById("client-form").reset();
    editingClientId = null;
    editingClientRev = null;
    
    const btn = document.querySelector("#client-form button[type='submit']");
    if(btn) {
        btn.textContent = "Guardar";
        btn.style.background = ""; // Volver al color original (accent)
    }
    
    const resetBtn = document.getElementById("client-reset");
    if(resetBtn) resetBtn.textContent = "Limpiar";
}

// ---------------------------
//   TAREAS (CRUD)
// ---------------------------
function renderTasks() {
  const cols = {
      todo: document.getElementById("col-todo"),
      inprogress: document.getElementById("col-inprogress"),
      done: document.getElementById("col-done")
  };

  if(cols.todo) cols.todo.innerHTML = "";
  if(cols.inprogress) cols.inprogress.innerHTML = "";
  if(cols.done) cols.done.innerHTML = "";

  tasks.forEach((t) => {
    const card = document.createElement("div");
    card.className = "task-card";
    card.innerHTML = `
      <strong>${t.title}</strong>
      <p><small>Asignado: ${t.owner || 'Nadie'}</small></p>
      <div class="task-actions">
          <button onclick="moveTask('${t._id}', '${t.status}')">➡ Mover</button>
          <button onclick="deleteDoc('${t._id}')" style="color:#ff5555">✕</button>
      </div>
    `;
    if(cols[t.status]) cols[t.status].appendChild(card);
  });
}

const taskForm = document.getElementById("task-form");
if(taskForm) {
    taskForm.addEventListener("submit", async e => {
      e.preventDefault();
      const nuevaTarea = {
        _id: new Date().toISOString(),
        type: 'task',
        title: document.getElementById("task-title").value,
        owner: document.getElementById("task-owner").value,
        status: document.getElementById("task-status").value
      };
      try {
          await db.put(nuevaTarea);
          taskForm.reset();
          loadData();
      } catch (err) { console.error(err); }
    });
}

window.moveTask = async (id, currentStatus) => {
    const order = ["todo", "inprogress", "done"];
    const nextIdx = (order.indexOf(currentStatus) + 1) % order.length;
    try {
        const doc = await db.get(id); 
        doc.status = order[nextIdx];      
        await db.put(doc);            
        loadData();
    } catch (err) { console.error(err); }
};

// ---------------------------
//   ELIMINAR GENERAL
// ---------------------------
window.deleteDoc = async (id) => {
    if(!confirm("¿Eliminar este registro permanentemente?")) return;
    try {
        const doc = await db.get(id); 
        await db.remove(doc);         
        loadData();
    } catch (err) { console.error(err); }
};

// ---------------------------
//   IMPORTAR / EXPORTAR (DB)
// ---------------------------
const exportBtn = document.getElementById("export-btn");
if(exportBtn) {
    exportBtn.addEventListener("click", async () => {
        try {
            // 1. Obtener todos los documentos
            const result = await db.allDocs({ include_docs: true });
            // 2. Limpiar datos internos de PouchDB (_rev)
            const cleanData = result.rows.map(row => {
                const doc = row.doc;
                delete doc._rev; // Borramos la revisión para evitar conflictos al importar
                return doc;
            });

            // 3. Crear archivo
            const blob = new Blob([JSON.stringify(cleanData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            // 4. Descargar
            const a = document.createElement("a");
            a.href = url;
            a.download = `backup_alphapixel_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
        } catch (err) {
            console.error("Error exportando:", err);
            alert("Error al exportar datos");
        }
    });
}

const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");

if(importBtn && importFile) {
    importBtn.addEventListener("click", () => importFile.click());
    
    importFile.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                if(!Array.isArray(data)) throw new Error("Formato inválido");

                // Asegurar IDs únicos si ya existen
                const docsToImport = data.map(doc => {
                    // Si el ID ya existe en tu DB actual, PouchDB daría error de conflicto.
                    // Para importar como copias nuevas, regeneramos el ID.
                    // Si quieres SOBRESCRIBIR, la lógica es más compleja.
                    // Aquí regeneramos ID para seguridad:
                    if(doc._id) delete doc._id; 
                    doc._id = new Date().toISOString() + Math.random();
                    return doc;
                });

                await db.bulkDocs(docsToImport);
                alert("✅ Datos importados correctamente");
                loadData();
            } catch (err) {
                console.error("Error importando:", err);
                alert("Error: El archivo no es válido o está corrupto.");
            }
        };
        reader.readAsText(file);
    });
}

// ---------------------------
//   UTILIDADES UI
// ---------------------------
const selectOwner = document.getElementById("task-owner");
if(selectOwner) {
    ["Jesús", "Karina", "Gabriel", "Diana", "Karol", "Jaquelin"].forEach(emp => {
        const opt = document.createElement("option");
        opt.value = emp; opt.textContent = emp;
        selectOwner.appendChild(opt);
    });
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const sectionId = btn.dataset.section;
    if(!sectionId) return; 
    
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    const sec = document.getElementById(sectionId);
    if(sec) sec.classList.add("active");
    
    const title = document.getElementById("section-title");
    if(title) title.textContent = btn.textContent.replace(/[^a-zA-ZáéíóúÁÉÍÓÚ ]/g, "");
  });
});

// ---------------------------
//   MONITOR CONEXIÓN INDESTRUCTIBLE
// ---------------------------
function checkConnection() {
    try {
        const online = navigator.onLine;
        const statusBadge = document.getElementById("netStatus");

        if (statusBadge) {
            if (online) {
                statusBadge.textContent = "ONLINE";
                statusBadge.style.color = "#00ff88"; 
                statusBadge.style.borderColor = "rgba(0,255,136,0.2)";
            } else {
                statusBadge.textContent = "OFFLINE";
                statusBadge.style.color = "red";
                statusBadge.style.borderColor = "red";
            }
        }
        
        // Bloquear/Desbloquear botones
        const saveBtns = document.querySelectorAll("button[type='submit']");
        saveBtns.forEach(btn => {
            // En PouchDB SÍ se puede guardar offline, así que solo cambiamos opacidad visual
            if(!online) btn.style.opacity = "0.8"; 
            else btn.style.opacity = "1";
        });

    } catch (e) { console.log(e); }
}

async function enviarNotificacionAdmin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;

    btn.innerText = "Enviando...";
    btn.disabled = true;

    const datos = {
        titulo: document.getElementById('push-title').value,
        mensaje: document.getElementById('push-msg').value,
        url: document.getElementById('push-url').value
    };

    try {
        const res = await fetch('../backend/enviar-notificacion.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(datos)
        });

        const resultado = await res.json();

        if(resultado.success) {
            alert(`✅ Enviado con éxito a ${resultado.enviadas} suscriptores.`);
            e.target.reset();
        } else {
            alert("❌ Error: " + resultado.message);
        }
    } catch (error) {
        alert("❌ Error de conexión con el servidor");
    }

    btn.innerText = originalText;
    btn.disabled = false;
}

// ---------------------------
//   NOTIFICACIONES RÁPIDAS (PRESETS)
// ---------------------------
async function enviarPreset(tipo) {
    // 1. Definir los mensajes predeterminados
    const presets = {
        oferta: {
            titulo: '🔥 ¡OFERTA FLASH 24H!',
            mensaje: 'Descuento exclusivo del 20% en todos nuestros servicios web. Solo hoy.',
            url: 'https://tu-dominio.com/#servicios'
        },
        recordatorio: {
            titulo: '⏰ Recordatorio Alpha',
            mensaje: 'Tu proyecto está esperando. ¿Continuamos con la transformación digital?',
            url: 'https://tu-dominio.com/#contacto'
        },
        test: {
            titulo: '🧪 Prueba de Sistema',
            mensaje: 'Esta es una notificación de control para verificar la conectividad del servidor.',
            url: 'https://tu-dominio.com'
        }
    };

    const datos = presets[tipo];
    if (!datos) return;

    // Confirmación de seguridad
    if(!confirm(`¿Enviar "${datos.titulo}" a TODOS los usuarios?`)) return;

    try {
        // Feedback visual (opcional, busca el botón clickeado si quieres animarlo)
        console.log("Enviando preset:", tipo);

        // 2. Reutilizamos el backend que ya tienes
        const res = await fetch('../backend/enviar-notificacion.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(datos)
        });
        
        const resultado = await res.json();
        
        if(resultado.success) {
            alert(`✅ ÉXITO: Notificación enviada a ${resultado.enviadas} dispositivos.`);
        } else {
            alert("⚠️ Ocurrió un problema: " + resultado.message);
        }

    } catch (error) {
        console.error(error);
        alert("❌ Error de conexión con el servidor (Revisa XAMPP/Hosting)");
    }
}

window.addEventListener("online", checkConnection);
window.addEventListener("offline", checkConnection);

// INICIAR
checkConnection();
loadData();