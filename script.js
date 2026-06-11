let todosLosJuegos = [];
let misEstados = JSON.parse(localStorage.getItem('misJuegosEstados')) || {};
let misFavoritos = JSON.parse(localStorage.getItem('misJuegosFavoritos')) || {};
let misRatings = JSON.parse(localStorage.getItem('misJuegosRatings')) || {};

// Cargar la API KEY de config.js (si existe) o de localStorage
let API_KEY = "";
if (typeof CONFIG_API_KEY !== 'undefined') {
    API_KEY = CONFIG_API_KEY;
} else {
    API_KEY = localStorage.getItem('miRawgApiKey') || "";
}

const contenedor = document.getElementById('contenedor-juegos');

let categoriaActual = 'all';
let favoritoActivo = false;
let textoBusqueda = '';
let modalJuegoId = null;

// CARGA DE JUEGOS DESDE LA API (3 páginas en serie para totalizar 120 juegos)
async function obtenerJuegos() {
    // Si no tenemos clave de API configurada, mostramos un formulario en pantalla
    if (API_KEY === "") {
        mostrarFormularioApiKey();
        return;
    }

    try {
        let temporal = [];
        for (let p = 1; p <= 3; p++) {
            let res = await fetch("https://api.rawg.io/api/games?key=" + API_KEY + "&page_size=40&page=" + p + "&genres=shooter,massively-multiplayer,strategy,racing");
            let datos = await res.json();
            for (let i = 0; i < datos.results.length; i++) {
                temporal.push(datos.results[i]);
            }
        }
        
        // Filtrar duplicados manualmente
        todosLosJuegos = [];
        for (let i = 0; i < temporal.length; i++) {
            let j = temporal[i];
            let existe = false;
            for (let k = 0; k < todosLosJuegos.length; k++) {
                if (todosLosJuegos[k].id === j.id) { existe = true; break; }
            }
            if (existe === false) {
                todosLosJuegos.push(j);
            }
        }
        
        document.getElementById('loading').style.display = 'none';
        filtrarYMostrar();
        actualizarDashboard();
    } catch (e) {
        document.getElementById('loading').innerHTML = '<div style="color:#ef4444; font-weight:600;">Error al conectar con la API de juegos</div>';
    }
}

// ACTUALIZAR ESTADÍSTICAS DEL COMPONENT PANEL
function actualizarDashboard() {
    let total = todosLosJuegos.length;
    let pendientes = 0;
    let jugados = 0;
    let favoritos = 0;
    
    for (let i = 0; i < total; i++) {
        let j = todosLosJuegos[i];
        if (misEstados[j.id] === 'pendiente') pendientes++;
        if (misEstados[j.id] === 'jugado') jugados++;
        if (misFavoritos[j.id] === true) favoritos++;
    }
    
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-pending').textContent = pendientes;
    document.getElementById('stat-played').textContent = jugados;
    document.getElementById('stat-favorites').textContent = favoritos;
    
    let porcentaje = total > 0 ? Math.round((jugados / total) * 100) : 0;
    document.getElementById('progress-percent').textContent = porcentaje + "%";
    document.getElementById('progress-fill').style.width = porcentaje + "%";
}

// DIBUJAR LAS TARJETAS EN EL CONTENEDOR HTML
function mostrarJuegos(lista) {
    contenedor.innerHTML = '';
    if (lista.length === 0) {
        contenedor.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; color:#8a8f98; font-weight:500;">No se encontraron resultados</div>';
        return;
    }
    
    for (let i = 0; i < lista.length; i++) {
        let j = lista[i];
        let estado = misEstados[j.id] || 'sin_estado';
        let esFav = misFavoritos[j.id] === true ? 'is-fav' : '';
        let claseBorde = estado === 'jugado' ? 'estado-jugado' : (estado === 'pendiente' ? 'estado-pendiente' : '');
        
        let tarjeta = `
            <div class="card ${claseBorde}" id="card-${j.id}">
                <div class="card-img-wrapper" onclick="abrirModal(${j.id})">
                    <img src="${j.background_image || 'https://via.placeholder.com/300x200'}" alt="${j.name}" loading="lazy">
                </div>
                <button class="btn-favorite-card ${esFav}" onclick="toggleFavorito(${j.id}, event)" title="Marcar favorito">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
                <div class="card-body">
                    <div class="card-header-info">
                        <h3 class="card-title" onclick="abrirModal(${j.id})">${j.name}</h3>
                        <div class="card-rating-badge">★ ${(j.rating || 0).toFixed(1)}</div>
                    </div>
                    <span class="badge">${(j.genres && j.genres[0]) ? j.genres[0].name : 'Sin género'}</span>
                    
                    <select class="status-select" onchange="cambiarEstado(${j.id}, this.value)">
                        <option value="sin_estado" ${estado === 'sin_estado' ? 'selected' : ''}>Sin marcar</option>
                        <option value="pendiente" ${estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                        <option value="jugado" ${estado === 'jugado' ? 'selected' : ''}>Completado</option>
                    </select>
                </div>
            </div>
        `;
        contenedor.innerHTML += tarjeta;
    }
}

// LÓGICA DE FILTRADOS Y ORDENACIONES
function filtrarYMostrar() {
    let filtrados = [];
    for (let i = 0; i < todosLosJuegos.length; i++) {
        let j = todosLosJuegos[i];
        
        let catOk = false;
        if (categoriaActual === 'all') {
            catOk = true;
        } else if (j.genres) {
            for (let g = 0; g < j.genres.length; g++) {
                let name = j.genres[g].name;
                if (categoriaActual === 'MMORPG' && (name === 'Massively Multiplayer' || name === 'MMORPG')) {
                    catOk = true;
                    break;
                }
                if (name === categoriaActual) {
                    catOk = true;
                    break;
                }
            }
        }
        
        let favOk = favoritoActivo === false || misFavoritos[j.id] === true;
        
        let busOk = true;
        if (textoBusqueda !== '') {
            let name = j.name.toLowerCase();
            let q = textoBusqueda.toLowerCase().trim();
            if (name.indexOf(q) === -1) busOk = false;
        }
        
        if (catOk && favOk && busOk) {
            filtrados.push(j);
        }
    }
    
    let sortVal = document.getElementById('sort-select').value;
    if (sortVal === 'rating-desc') {
        filtrados.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });
    } else if (sortVal === 'name-asc') {
        filtrados.sort(function(a, b) { return a.name.localeCompare(b.name); });
    }
    
    mostrarJuegos(filtrados);
}

// EVENTOS DE CONTROL EN LA INTERFAZ
function filtrarJuegos(cat, el) {
    categoriaActual = cat;
    favoritoActivo = false;
    let btns = document.querySelectorAll('.btn-filter');
    for (let i = 0; i < btns.length; i++) btns[i].classList.remove('active');
    if (el) el.classList.add('active');
    filtrarYMostrar();
}

function filtrarFavoritos(el) {
    favoritoActivo = !favoritoActivo;
    let btns = document.querySelectorAll('.btn-filter');
    for (let i = 0; i < btns.length; i++) btns[i].classList.remove('active');
    if (favoritoActivo === true) {
        el.classList.add('active');
        categoriaActual = 'all';
    } else {
        let btnTodos = document.querySelector(".btn-filter");
        if (btnTodos) btnTodos.classList.add('active');
    }
    filtrarYMostrar();
}

function manejarBusqueda(val) {
    textoBusqueda = val;
    document.getElementById('clear-search').style.display = val.length > 0 ? 'flex' : 'none';
    filtrarYMostrar();
}

function limpiarBusqueda() {
    document.getElementById('search-input').value = '';
    manejarBusqueda('');
}

function ordenarJuegos() {
    filtrarYMostrar();
}

// GESTIÓN DE FAVORITOS
function toggleFavorito(id, event) {
    if (event) event.stopPropagation();
    if (misFavoritos[id] === true) {
        delete misFavoritos[id];
        showToast('Eliminado de favoritos', 'warning');
    } else {
        misFavoritos[id] = true;
        showToast('Añadido a favoritos', 'success');
    }
    localStorage.setItem('misJuegosFavoritos', JSON.stringify(misFavoritos));
    actualizarDashboard();
    
    let btn = document.querySelector("#card-" + id + " .btn-favorite-card");
    if (btn) btn.classList.toggle('is-fav', misFavoritos[id] === true);
    if (favoritoActivo === true) filtrarYMostrar();
}

// GESTIÓN DE ESTADOS DE JUEGOS
function cambiarEstado(id, val) {
    if (val === 'sin_estado') delete misEstados[id];
    else misEstados[id] = val;
    
    localStorage.setItem('misJuegosEstados', JSON.stringify(misEstados));
    actualizarDashboard();
    
    let card = document.getElementById("card-" + id);
    if (card) {
        card.classList.remove('estado-jugado', 'estado-pendiente');
        if (val === 'jugado') {
            card.classList.add('estado-jugado');
            showToast('Juego completado', 'success');
        } else if (val === 'pendiente') {
            card.classList.add('estado-pendiente');
            showToast('Juego marcado como pendiente', 'info');
        } else {
            showToast('Estado restablecido', 'warning');
        }
    }
}

// DETALLES EN MODAL (Carga solo descripción y plataformas)
async function abrirModal(id) {
    modalJuegoId = id;
    let modal = document.getElementById('game-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    document.getElementById('modal-title').textContent = 'Cargando...';
    document.getElementById('modal-genre').textContent = 'Cargando...';
    document.getElementById('modal-release').textContent = 'Lanzamiento: -';
    document.getElementById('modal-specs').innerHTML = 'Cargando ficha técnica...';
    document.getElementById('modal-platforms').innerHTML = '';
    document.getElementById('modal-banner').style.backgroundImage = 'none';

    // Cargar estrellas guardadas
    ponerEstrellas(misRatings[id] || 0);

    let juegoLocal = null;
    for (let i = 0; i < todosLosJuegos.length; i++) {
        if (todosLosJuegos[i].id === id) { juegoLocal = todosLosJuegos[i]; break; }
    }

    if (juegoLocal) {
        document.getElementById('modal-title').textContent = juegoLocal.name;
        document.getElementById('modal-genre').textContent = (juegoLocal.genres && juegoLocal.genres[0]) ? juegoLocal.genres[0].name : 'Sin género';
        document.getElementById('modal-release').textContent = 'Lanzamiento: ' + (juegoLocal.released || 'No disponible');
        if (juegoLocal.background_image) {
            document.getElementById('modal-banner').style.backgroundImage = "url('" + juegoLocal.background_image + "')";
        }
    }

    try {
        let res = await fetch("https://api.rawg.io/api/games/" + id + "?key=" + API_KEY);
        if (res.ok) {
            let detalles = await res.json();
            
            // 1. Desarrolladores
            let devs = "No disponible";
            if (detalles.developers && detalles.developers.length > 0) {
                let devNames = [];
                for (let i = 0; i < detalles.developers.length; i++) {
                    devNames.push(detalles.developers[i].name);
                }
                devs = devNames.join(", ");
            }

            // 2. Editoriales / Distribuidores
            let pubs = "No disponible";
            if (detalles.publishers && detalles.publishers.length > 0) {
                let pubNames = [];
                for (let i = 0; i < detalles.publishers.length; i++) {
                    pubNames.push(detalles.publishers[i].name);
                }
                pubs = pubNames.join(", ");
            }

            // 3. Metacritic
            let meta = "No disponible";
            if (detalles.metacritic !== null && detalles.metacritic !== undefined) {
                meta = detalles.metacritic + " / 100";
            }

            // 4. Clasificación ESRB
            let esrb = "Sin clasificación";
            if (detalles.esrb_rating !== null && detalles.esrb_rating !== undefined) {
                esrb = detalles.esrb_rating.name;
            }

            // 5. Sitio Web Oficial
            let webHTML = "No disponible";
            if (detalles.website) {
                webHTML = '<a href="' + detalles.website + '" target="_blank">Visitar sitio web ↗</a>';
            }

            // Renderizamos la ficha técnica en el HTML
            document.getElementById('modal-specs').innerHTML = `
                <div class="spec-item">
                    <span class="spec-label">Desarrollador</span>
                    <span class="spec-value">${devs}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Distribuidora</span>
                    <span class="spec-value">${pubs}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Metacritic</span>
                    <span class="spec-value">${meta}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Clasificación ESRB</span>
                    <span class="spec-value">${esrb}</span>
                </div>
                <div class="spec-item" style="grid-column: span 2;">
                    <span class="spec-label">Sitio Web Oficial</span>
                    <span class="spec-value">${webHTML}</span>
                </div>
            `;
            
            let platforms = detalles.platforms || [];
            let container = document.getElementById('modal-platforms');
            container.innerHTML = '';
            for (let i = 0; i < platforms.length; i++) {
                let badge = document.createElement('span');
                badge.className = 'platform-badge';
                badge.textContent = platforms[i].platform.name;
                container.appendChild(badge);
            }
        }
    } catch (e) {
        document.getElementById('modal-specs').textContent = 'Error al cargar ficha técnica del juego.';
    }
}

function cerrarModal() {
    document.getElementById('game-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
    modalJuegoId = null;
}

window.onclick = function (event) {
    let modal = document.getElementById('game-modal');
    if (event.target === modal) cerrarModal();
};

// VALORACIÓN POR ESTRELLAS
function ponerEstrellas(cantidad) {
    let stars = document.querySelectorAll('#stars-container .star');
    for (let i = 0; i < stars.length; i++) {
        if (i < cantidad) stars[i].classList.add('active');
        else stars[i].classList.remove('active');
    }
    
    let labels = {
        0: 'Sin calificar',
        1: 'Malo',
        2: 'Aceptable',
        3: 'Bueno',
        4: 'Excelente',
        5: 'Obra Maestra'
    };
    document.getElementById('rating-label').textContent = labels[cantidad] || 'Sin calificar';
    
    // Guardar puntuación automáticamente al dar clic
    if (modalJuegoId !== null) {
        if (cantidad > 0) {
            misRatings[modalJuegoId] = cantidad;
        } else {
            delete misRatings[modalJuegoId];
        }
        localStorage.setItem('misJuegosRatings', JSON.stringify(misRatings));
    }
}

// TOAST NOTIFICATIONS
function showToast(mensaje, tipo) {
    let container = document.getElementById('toast-container');
    let toast = document.createElement('div');
    toast.className = 'toast toast-' + tipo;
    
    let svg = '';
    if (tipo === 'success') svg = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:#10b981;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    else if (tipo === 'warning') svg = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:#f59e0b;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    else svg = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:#3b82f6;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    
    toast.innerHTML = '<span class="toast-icon-wrapper">' + svg + '</span> <span>' + mensaje + '</span>';
    container.appendChild(toast);
    
    setTimeout(function() {
        toast.style.animation = 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
        setTimeout(function() { toast.remove(); }, 300);
    }, 2500);
}

// MOSTRAR FORMULARIO SI NO HAY API KEY CONFIGURADA
function mostrarFormularioApiKey() {
    let loadingDiv = document.getElementById('loading');
    loadingDiv.innerHTML = `
        <div style="max-width: 400px; margin: 30px auto; background: white; padding: 24px; border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-md); text-align: left; color: var(--text-primary);">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 8px;">🔑 Configurar API Key</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.4;">No se detectó la clave de API en el archivo <code>config.js</code>. Por favor, ingresa tu clave de RAWG para poder ver los juegos. La guardaremos localmente en tu navegador de forma segura.</p>
            <input type="text" id="api-key-input" placeholder="Tu API Key de RAWG..." style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.85rem; margin-bottom: 12px; outline: none; background: #f8fafc;">
            <button onclick="guardarApiKey()" style="width: 100%; padding: 8px; background: var(--accent-primary); color: white; border: none; border-radius: var(--radius-sm); font-weight: 700; font-size: 0.85rem; cursor: pointer;">Guardar Clave</button>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 10px; text-align: center;">¿No tienes una? Consíguela gratis en <a href="https://rawg.io/apidocs" target="_blank" style="color: var(--accent-primary); text-decoration: none;">rawg.io/apidocs</a></p>
        </div>
    `;
}

// GUARDAR LA CLAVE EN LOCALSTORAGE Y RECARGAR LA PÁGINA
function guardarApiKey() {
    let inputVal = document.getElementById('api-key-input').value.trim();
    if (inputVal === "") {
        alert("Por favor ingresa una clave válida.");
        return;
    }
    localStorage.setItem('miRawgApiKey', inputVal);
    location.reload();
}

obtenerJuegos();