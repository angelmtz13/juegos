let todosLosJuegos = [];
let misEstados = JSON.parse(localStorage.getItem('misJuegosEstados')) || {};

const contenedor = document.getElementById('contenedor-juegos');
const loading = document.getElementById('loading');

async function obtenerJuegos() {
    try {
        const respuesta = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.freetogame.com/api/games'));
        
        if (!respuesta.ok) throw new Error('Error en la red');

        const datos = await respuesta.json();
        todosLosJuegos = JSON.parse(datos.contents);
        
        loading.style.display = 'none';
        mostrarJuegos(todosLosJuegos);

    } catch (error) {
        console.error("Error:", error);
        loading.innerHTML = "Error al cargar la API. Intenta más tarde.";
    }
}

function mostrarJuegos(lista) {
    contenedor.innerHTML = '';

    const listaLimitada = lista.slice(0, 30);

    listaLimitada.forEach(juego => {
        const estadoActual = misEstados[juego.id] || 'sin_estado';
        
        let claseBorde = '';
        if(estadoActual === 'jugado') claseBorde = 'estado-jugado';
        if(estadoActual === 'pendiente') claseBorde = 'estado-pendiente';

        const tarjeta = `
            <div class="card ${claseBorde}" id="card-${juego.id}">
                <img src="${juego.thumbnail}" alt="${juego.title}">
                <div class="card-body">
                    <h3 class="card-title">${juego.title}</h3>
                    <span class="badge">${juego.genre}</span>
                    <p class="card-desc">${juego.short_description}</p>
                    
                    <select class="status-select" onchange="cambiarEstado(${juego.id}, this.value)">
                        <option value="sin_estado" ${estadoActual === 'sin_estado' ? 'selected' : ''}>Sin Marcar</option>
                        <option value="pendiente" ${estadoActual === 'pendiente' ? 'selected' : ''}>🕒 Pendiente</option>
                        <option value="jugado" ${estadoActual === 'jugado' ? 'selected' : ''}>✅ Terminado</option>
                    </select>

                    <a href="${juego.game_url}" target="_blank" class="play-link">Jugar Ahora →</a>
                </div>
            </div>
        `;
        contenedor.innerHTML += tarjeta;
    });
}

function cambiarEstado(id, nuevoEstado) {
    misEstados[id] = nuevoEstado;
    localStorage.setItem('misJuegosEstados', JSON.stringify(misEstados));

    const tarjeta = document.getElementById(`card-${id}`);
    tarjeta.classList.remove('estado-jugado', 'estado-pendiente');

    if(nuevoEstado === 'jugado') tarjeta.classList.add('estado-jugado');
    if(nuevoEstado === 'pendiente') tarjeta.classList.add('estado-pendiente');
}

function filtrarJuegos(categoria) {
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    if(event) event.target.classList.add('active');

    if (categoria === 'all') {
        mostrarJuegos(todosLosJuegos);
    } else {
        const filtrados = todosLosJuegos.filter(juego => juego.genre === categoria);
        mostrarJuegos(filtrados);
    }
}

obtenerJuegos();