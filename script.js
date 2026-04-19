let todosLosJuegos = [];
let misEstados = JSON.parse(localStorage.getItem('misJuegosEstados')) || {};
const contenedor = document.getElementById('contenedor-juegos');
const loading = document.getElementById('loading');

async function obtenerJuegos() {
    try {
        const API_KEY = '62a1c4d40a4a408c957fe0f0f7b00536';
        const respuesta = await fetch(`https://api.rawg.io/api/games?key=${API_KEY}&page_size=30`);
        
        if (!respuesta.ok) throw new Error('Error en la red');
        const datos = await respuesta.json();
        todosLosJuegos = datos.results;
        
        loading.style.display = 'none';
        mostrarJuegos(todosLosJuegos);
    } catch (error) {
        console.error("Error:", error);
        loading.innerHTML = "Error al cargar la API. Intenta más tarde.";
    }
}

function mostrarJuegos(lista) {
    contenedor.innerHTML = '';
    lista.forEach(juego => {
        const estadoActual = misEstados[juego.id] || 'sin_estado';
        
        let claseBorde = '';
        if(estadoActual === 'jugado') claseBorde = 'estado-jugado';
        if(estadoActual === 'pendiente') claseBorde = 'estado-pendiente';

        const tarjeta = `
            <div class="card ${claseBorde}" id="card-${juego.id}">
                <img src="${juego.background_image || 'https://via.placeholder.com/300x200'}" alt="${juego.name}">
                <div class="card-body">
                    <h3 class="card-title">${juego.name}</h3>
                    <span class="badge">${juego.genres?.[0]?.name || 'Sin género'}</span>
                    <p class="card-desc">Rating: ${juego.rating} / 5</p>
                    
                    <select class="status-select" onchange="cambiarEstado(${juego.id}, this.value)">
                        <option value="sin_estado" ${estadoActual === 'sin_estado' ? 'selected' : ''}>Sin Marcar</option>
                        <option value="pendiente" ${estadoActual === 'pendiente' ? 'selected' : ''}>🕒 Pendiente</option>
                        <option value="jugado" ${estadoActual === 'jugado' ? 'selected' : ''}>✅ Terminado</option>
                    </select>
                    <a href="https://rawg.io/games/${juego.slug}" target="_blank" class="play-link">Ver Juego →</a>
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
        const filtrados = todosLosJuegos.filter(juego => 
            juego.genres?.some(g => g.name === categoria)
        );
        mostrarJuegos(filtrados);
    }
}

obtenerJuegos();