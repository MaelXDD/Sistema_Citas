// Vista pública de especialidades y doctores (no requiere sesión).
let horariosActivos = null;
let especialidades = [];

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btn-volver-paso1')?.addEventListener('click', () => {
        history.replaceState(null, '', window.location.pathname);
        mostrarPaso(1);
    });

    await cargarEspecialidades();
    abrirEspecialidadDesdeUrl();
});

/**
 * Si la URL trae ?especialidad=cardiología (botón "Ver doctores" del inicio),
 * abre directamente los doctores de esa especialidad.
 */
function abrirEspecialidadDesdeUrl() {
    const criterio = new URLSearchParams(window.location.search).get('especialidad');
    if (!criterio) return;

    const buscada = sinTildes(criterio).trim();
    const encontrada = especialidades.find(e => sinTildes(e.nombre).includes(buscada));
    if (encontrada) {
        seleccionarEspecialidad(encontrada);
    } else {
        Notificacion.advertencia('Información no disponible', 'No se encontró esa especialidad. Elige una de la lista.');
    }
}

function mostrarPaso(paso) {
    [1, 2].forEach((numero) => {
        document.getElementById(`paso${numero}`)?.classList.toggle('oculto', numero !== paso);

        const indicador = document.getElementById(`ind-paso${numero}`);
        indicador?.classList.toggle('activo', numero === paso);
        indicador?.classList.toggle('completado', numero < paso);
    });
    document.querySelector('.pasos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function consultarHorariosActivos() {
    if (!horariosActivos) {
        const respuesta = await fetch(`${CONFIG.API_URL}/horarios`);
        if (!respuesta.ok) throw new Error();

        const todos = await respuesta.json();
        horariosActivos = todos.filter(h => h.doctor && h.activo);
    }
    return horariosActivos;
}

async function contarDoctoresPorEspecialidad() {
    try {
        const [respuesta, horarios] = await Promise.all([
            fetch(`${CONFIG.API_URL}/doctores/activos`),
            consultarHorariosActivos().catch(() => null)
        ]);
        if (!respuesta.ok) return null;

        const conHorario = horarios && new Set(horarios.map(h => h.doctor.idDoctor));
        const cantidades = new Map();

        (await respuesta.json()).forEach((doc) => {
            if (!doc.especialidad || (conHorario && !conHorario.has(doc.idDoctor))) return;
            const id = doc.especialidad.idEspecialidad;
            cantidades.set(id, (cantidades.get(id) ?? 0) + 1);
        });

        return cantidades;
    } catch {
        return null;
    }
}

function textoDoctores(cantidad) {
    if (cantidad === 0) return 'Sin doctores disponibles';
    return `${cantidad} ${cantidad === 1 ? 'doctor disponible' : 'doctores disponibles'}`;
}

/* ===== PASO 1: ESPECIALIDADES ===== */
async function cargarEspecialidades() {
    const lista = document.getElementById('lista-especialidades');
    if (!lista) return;

    mostrarMensajeLista(lista, 'Cargando especialidades médicas...');

    try {
        const [respuesta, cantidades] = await Promise.all([
            fetch(`${CONFIG.API_URL}/especialidades/activas`),
            contarDoctoresPorEspecialidad()
        ]);
        if (!respuesta.ok) throw new Error();

        especialidades = await respuesta.json();

        if (especialidades.length === 0) {
            mostrarMensajeLista(lista, 'No hay especialidades disponibles.');
            return;
        }

        lista.replaceChildren();
        const tpl = document.getElementById('tpl-opcion-especialidad');

        especialidades.forEach((esp) => {
            const clon = tpl.content.cloneNode(true);
            clon.querySelector('.col-nombre').textContent = esp.nombre;
            mostrarIcono(clon.querySelector('.opcion-icono'), esp.nombre);
            clon.querySelector('.col-descripcion').textContent = esp.descripcion || 'Atención integral especializada.';

            if (cantidades) {
                clon.querySelector('.col-doctores').textContent = textoDoctores(cantidades.get(esp.idEspecialidad) ?? 0);
            } else {
                clon.querySelector('.opcion-dato').remove();
            }

            clon.querySelector('.opcion').addEventListener('click', () => seleccionarEspecialidad(esp));
            lista.appendChild(clon);
        });
    } catch (error) {
        mostrarMensajeLista(lista, mensajeDeError(error, 'Error al obtener especialidades.'), true);
    }
}

async function seleccionarEspecialidad(esp) {
    document.getElementById('nombre-especialidad-sel').textContent = esp.nombre;
    document.getElementById('tarifa-especialidad').textContent = '—';

    cargarDoctores(esp.idEspecialidad);
    mostrarPaso(2);

    const precio = await consultarPrecio(esp.idEspecialidad);
    document.getElementById('tarifa-especialidad').textContent = precio ? Formato.moneda(precio.monto) : 'Sin tarifa';
}

/* ===== PASO 2: SOLO LOS DOCTORES DE LA ESPECIALIDAD ===== */
async function cargarDoctores(idEspecialidad) {
    const lista = document.getElementById('lista-doctores');
    if (!lista) return;

    mostrarMensajeLista(lista, 'Buscando médicos disponibles...');

    try {
        const [respuesta, horarios] = await Promise.all([
            fetch(`${CONFIG.API_URL}/doctores/activos`),
            consultarHorariosActivos().catch(() => [])
        ]);
        if (!respuesta.ok) throw new Error();

        const doctores = (await respuesta.json())
            .filter(d => d.especialidad && d.especialidad.idEspecialidad === idEspecialidad);

        if (doctores.length === 0) {
            mostrarMensajeLista(lista, 'Por ahora no hay médicos en esta especialidad.');
            return;
        }

        const esAdmin = obtenerPacienteSesion()?.rol === 'ADMIN';
        lista.replaceChildren();
        const tpl = document.getElementById('tpl-fila-doctor');

        doctores.forEach((doc) => {
            const lineas = armarLineasHorario(horarios.filter(h => h.doctor.idDoctor === doc.idDoctor), DIAS_LARGOS);

            const clon = tpl.content.cloneNode(true);
            const avatar = clon.querySelector('.col-iniciales');
            if (doc.fotoUrl) {
                const img = document.createElement('img');
                img.src = doc.fotoUrl;
                img.alt = `Dr. ${doc.nombres} ${doc.apellidos}`;
                avatar.replaceChildren(img);
            } else {
                avatar.textContent = `${doc.nombres[0]}${doc.apellidos[0]}`.toUpperCase();
            }
            clon.querySelector('.col-nombre').textContent = `Dr. ${doc.nombres} ${doc.apellidos}`;
            clon.querySelector('.col-dias').textContent = lineas.length > 0 ? lineas.join('\n') : 'Sin horarios disponibles';

            const boton = clon.querySelector('.btn-elegir');
            if (esAdmin) {
                boton.remove();
            } else {
                boton.disabled = lineas.length === 0;
                boton.addEventListener('click', reservarCita);
            }

            lista.appendChild(clon);
        });
    } catch (error) {
        mostrarMensajeLista(lista, mensajeDeError(error, 'Error al cargar personal médico.'), true);
    }
}

/**
 * Visitante: abre el inicio de sesión. Paciente: pasa a "Sacar Cita".
 */
function reservarCita() {
    if (!obtenerPacienteSesion()) {
        toggleModal('modal-login');
        return;
    }
    window.location.href = '/citas.html';
}