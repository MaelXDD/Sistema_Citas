document.addEventListener('DOMContentLoaded', () => {
    configurarTarjetasEspecialidad();
    configurarCierreModalEspecialidad();
});

/**
 * Escucha los clics sobre las tarjetas de especialidades destacadas.
 */
function configurarTarjetasEspecialidad() {
    const tarjetas = document.querySelectorAll('.tarjeta-icono[data-especialidad]');
    tarjetas.forEach(tarjeta => {
        tarjeta.addEventListener('click', () => {
            const criterio = tarjeta.getAttribute('data-especialidad');
            consultarEspecialidadPorNombre(criterio);
        });
    });
}

/**
 * Consulta la especialidad directamente al backend mediante su nombre normalizado.
 * Cero datos quemados.
 */
async function consultarEspecialidadPorNombre(nombreEsp) {
    try {
        const res = await fetch(`${CONFIG.API_URL}/especialidades/activas`);
        if (!res.ok) throw new Error();
        const lista = await res.json();

        const normalizar = str => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const encontrada = lista.find(e => normalizar(e.nombre).includes(normalizar(nombreEsp)));

        if (!encontrada) {
            Notificacion.advertencia('Información no disponible', 'No se encontró información de esta especialidad.');
            return;
        }

        mostrarModalDetalle(encontrada);
    } catch {
        Notificacion.error('Error de conexión', 'No se pudo conectar con el servidor para consultar la especialidad.');
    }
}

/**
 * Rellena los datos usando el <template id="tpl-item-enfermedad"> de tu HTML.
 * Cero innerHTML y cero estilos en línea.
 */
function mostrarModalDetalle(esp) {
    const modal = document.getElementById('modalEspecialidad');
    if (!modal) return;

    document.getElementById('tituloEspecialidad').textContent = esp.nombre;
    document.getElementById('descripcionEspecialidad').textContent = esp.descripcion || 'Sin descripción detallada por el momento.';
    document.getElementById('cuandoAcudir').textContent = esp.cuandoAcudir || 'Consulte periódicamente para chequeos preventivos.';

    const contenedorLista = document.getElementById('enfermedadesEspecialidad');
    contenedorLista.replaceChildren();

    const tplItem = document.getElementById('tpl-item-enfermedad');

    if (esp.enfermedadesTratadas) {
        const enfermedades = esp.enfermedadesTratadas.split(',');
        enmedadesLoop:
            for (const item of enfermedades) {
                if (tplItem) {
                    const clon = tplItem.content.cloneNode(true);
                    clon.querySelector('.item-enfermedad').textContent = item.trim();
                    contenedorLista.appendChild(clon);
                } else {
                    const li = document.createElement('li');
                    li.textContent = item.trim();
                    contenedorLista.appendChild(li);
                }
            }
    } else {
        const li = document.createElement('li');
        li.textContent = 'Enfermedades generales del área.';
        contenedorLista.appendChild(li);
    }

    modal.classList.add('activo');
    modal.classList.remove('oculto');
}

/**
 * Configura los botones de cierre del modal de especialidades.
 * Ajustado al ID de tu HTML: #btn-cerrar-especialidad
 */
function configurarCierreModalEspecialidad() {
    const modal = document.getElementById('modalEspecialidad');
    const btnCerrar = document.getElementById('btn-cerrar-especialidad');

    const cerrar = () => {
        modal?.classList.remove('activo');
        modal?.classList.add('oculto');
    };

    btnCerrar?.addEventListener('click', cerrar);

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrar();
        }
    });
}