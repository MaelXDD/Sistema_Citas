const ESTADOS_ACTIVOS = ['PENDIENTE', 'CONFIRMADA'];

let citasPaciente = [];
let filtroEstado = '';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Validar autenticación de paciente
    const paciente = obtenerPacienteSesion();
    if (!paciente) {
        Swal.fire({
            icon: 'info',
            title: 'Sesión requerida',
            text: 'Debes iniciar sesión para consultar tus citas médicas.',
            confirmButtonText: 'Iniciar Sesión'
        }).then(() => {
            window.location.href = '/index.html';
        });
        return;
    }

    configurarFiltrosEstado(paciente.idPaciente);
    cargarCitasPaciente(paciente.idPaciente);
});

/**
 * Los botones de estado filtran la lista sin volver a pedir las citas al servidor.
 */
function configurarFiltrosEstado(idPaciente) {
    const botones = document.querySelectorAll('#filtros-estado [data-estado]');

    botones.forEach((boton) => {
        boton.addEventListener('click', () => {
            filtroEstado = boton.dataset.estado;
            botones.forEach(b => b.classList.toggle('boton-suave-oscuro', b === boton));
            dibujarCitas(idPaciente);
        });
    });
}

/**
 * Estado que ve el paciente. Una cita pendiente o confirmada cuya hora ya pasó
 * se muestra como VENCIDA, porque ya no se puede atender ni cancelar.
 */
function estadoDe(cita) {
    const estado = cita.estado || 'PENDIENTE';
    const sigueActiva = ESTADOS_ACTIVOS.includes(estado);

    return sigueActiva && citaYaTermino(cita.fechaCita, cita.horaCita) ? 'VENCIDA' : estado;
}

/**
 * Las citas por atender van primero (la más cercana arriba) y después
 * las completadas y canceladas (la más reciente arriba).
 */
function ordenarCitas(citas) {
    const momento = (cita) => `${cita.fechaCita} ${cita.horaCita}`;
    const activas = citas.filter(c => ESTADOS_ACTIVOS.includes(estadoDe(c)));
    const otras = citas.filter(c => !ESTADOS_ACTIVOS.includes(estadoDe(c)));

    activas.sort((a, b) => momento(a).localeCompare(momento(b)));
    otras.sort((a, b) => momento(b).localeCompare(momento(a)));

    return [...activas, ...otras];
}

/**
 * Llena las cuatro tarjetas de arriba y la cantidad de cada botón de filtro.
 */
function mostrarResumen() {
    const activas = citasPaciente.filter(c => ESTADOS_ACTIVOS.includes(estadoDe(c)));
    const proxima = activas[0];

    document.getElementById('resumenTotal').textContent = citasPaciente.length;
    document.getElementById('resumenActivas').textContent = activas.length;
    document.getElementById('resumenCanceladas').textContent = citasPaciente.filter(c => estadoDe(c) === 'CANCELADA').length;
    document.getElementById('resumenProxima').textContent = proxima
        ? `${textoFecha(proxima.fechaCita)} · ${Formato.horaAmPm(proxima.horaCita)}`
        : '—';

    document.querySelectorAll('#filtros-estado [data-estado]').forEach((boton) => {
        const estado = boton.dataset.estado;
        const cantidad = estado ? citasPaciente.filter(c => estadoDe(c) === estado).length : citasPaciente.length;
        boton.querySelector('.filtro-cantidad').textContent = cantidad;
    });
}

/**
 * Consulta el historial de citas del paciente desde el backend.
 * @param {number} idPaciente - ID único del paciente en sesión.
 */
async function cargarCitasPaciente(idPaciente) {
    const contenedor = document.getElementById('contenedor-mis-citas');
    if (!contenedor) return;

    mostrarMensajeLista(contenedor, 'Cargando citas médicas...');

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/citas/paciente/${idPaciente}`);
        if (!respuesta.ok) throw new Error();

        citasPaciente = ordenarCitas(await respuesta.json());

        if (citasPaciente.length === 0) {
            mostrarMensajeLista(contenedor, 'No tienes citas registradas actualmente.');
            return;
        }

        mostrarResumen();
        dibujarCitas(idPaciente);
    } catch {
        mostrarMensajeLista(contenedor, 'Ocurrió un error al cargar tu historial de citas.', true);
    }
}

/**
 * Dibuja las tarjetas según el filtro de estado elegido.
 */
function dibujarCitas(idPaciente) {
    const contenedor = document.getElementById('contenedor-mis-citas');
    const visibles = filtroEstado ? citasPaciente.filter(c => estadoDe(c) === filtroEstado) : citasPaciente;

    if (visibles.length === 0) {
        mostrarMensajeLista(contenedor, 'No tienes citas con este estado.');
        return;
    }

    contenedor.replaceChildren();
    const tpl = document.getElementById('tpl-tarjeta-cita');

    visibles.forEach(cita => {
        const clon = tpl.content.cloneNode(true);
        const tarjeta = clon.querySelector('.fila-cita');
        const fecha = fechaDesdeIso(cita.fechaCita);

        // Asignación de datos
        const nombreDoc = cita.doctor
            ? `Dr. ${cita.doctor.nombres} ${cita.doctor.apellidos}`
            : 'Médico por asignar';

        const especialidad = cita.especialidad
            ? cita.especialidad.nombre
            : (cita.doctor?.especialidad?.nombre || 'General');

        tarjeta.querySelector('.col-mes').textContent = fecha.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
        tarjeta.querySelector('.col-numero').textContent = fecha.getDate();
        tarjeta.querySelector('.col-doc').textContent = nombreDoc;
        tarjeta.querySelector('.col-esp').textContent = especialidad;
        tarjeta.querySelector('.col-fecha').textContent = textoFechaLarga(cita.fechaCita);
        tarjeta.querySelector('.col-hora').textContent = Formato.horaAmPm(cita.horaCita);
        tarjeta.querySelector('.col-motivo').textContent = cita.motivo || 'Consulta médica general';

        // Configuración del badge de estado
        const estado = estadoDe(cita);
        const badgeEstado = tarjeta.querySelector('.col-estado');
        badgeEstado.textContent = estado;
        badgeEstado.classList.add(estado.toLowerCase());
        tarjeta.classList.add(estado.toLowerCase());

        // Elementos de acción
        const btnPdf = tarjeta.querySelector('.btn-pdf');
        const btnAnular = tarjeta.querySelector('.btn-anular');

        // Lógica según el estado del registro
        if (ESTADOS_ACTIVOS.includes(estado)) {
            btnPdf.classList.remove('oculto');
            btnAnular.classList.remove('oculto');

            btnAnular.addEventListener('click', () => {
                cancelarCita(cita.idCita, idPaciente);
            });
        } else if (estado === 'COMPLETADA' || estado === 'VENCIDA') {
            btnPdf.classList.remove('oculto');
        }

        btnPdf.addEventListener('click', () => {
            imprimirTicketCita(cita.idCita);
        });

        contenedor.appendChild(clon);
    });
}

/**
 * Solicita la anulación de una cita al backend usando DELETE /api/citas/{id}.
 * @param {number} idCita - ID de la cita a cancelar.
 * @param {number} idPaciente - ID para refrescar la vista.
 */
async function cancelarCita(idCita, idPaciente) {
    const confirmado = await Notificacion.confirmar(
        '¿Deseas cancelar esta cita?',
        'Esta acción liberará el horario de atención para otro paciente.',
        'Sí, cancelar cita'
    );

    if (!confirmado) return;

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/citas/${idCita}`, {
            method: 'DELETE'
        });

        // 204 No Content o 200 OK
        if (respuesta.status === 204 || respuesta.ok) {
            await Notificacion.exito('Cita cancelada', 'Tu cita fue cancelada correctamente.');
            await cargarCitasPaciente(idPaciente);
        } else {
            const error = await respuesta.json().catch(() => ({}));
            Notificacion.error('No se pudo cancelar', error.mensaje || 'Error al cancelar la cita.');
        }
    } catch {
        Notificacion.error('Error de red', 'No hubo respuesta del servidor.');
    }
}

/**
 * Abre el comprobante en formato PDF.
 * @param {number} idCita - ID de la cita.
 */
function imprimirTicketCita(idCita) {
    window.open(`${CONFIG.API_URL}/reportes/citas/${idCita}/pdf`, '_blank');
}