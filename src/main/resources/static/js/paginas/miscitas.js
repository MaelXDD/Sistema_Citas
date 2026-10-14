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

    cargarCitasPaciente(paciente.idPaciente);
});

/**
 * Consulta y renderiza el historial de citas del paciente desde el backend.
 * @param {number} idPaciente - ID único del paciente en sesión.
 */
async function cargarCitasPaciente(idPaciente) {
    const contenedor = document.getElementById('contenedor-mis-citas');
    if (!contenedor) return;

    renderizarMensajeEnContenedor(contenedor, 'Cargando citas médicas...');

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/citas/paciente/${idPaciente}`);
        if (!respuesta.ok) throw new Error();

        const citas = await respuesta.json();

        if (citas.length === 0) {
            renderizarMensajeEnContenedor(contenedor, 'No tienes citas registradas actualmente.');
            return;
        }

        contenedor.replaceChildren();
        const tpl = document.getElementById('tpl-tarjeta-cita');

        citas.forEach(cita => {
            const clon = tpl.content.cloneNode(true);
            const tarjeta = clon.querySelector('.tarjeta-cita');

            // Asignación de datos
            const nombreDoc = cita.doctor
                ? `Dr. ${cita.doctor.nombres} ${cita.doctor.apellidos}`
                : 'Médico por asignar';

            const especialidad = cita.especialidad
                ? cita.especialidad.nombre
                : (cita.doctor?.especialidad?.nombre || 'General');

            tarjeta.querySelector('.col-doc').textContent = nombreDoc;
            tarjeta.querySelector('.col-esp').textContent = especialidad;
            tarjeta.querySelector('.col-fecha').textContent = cita.fechaCita;
            tarjeta.querySelector('.col-hora').textContent = Formato.horaAmPm(cita.horaCita);
            tarjeta.querySelector('.col-motivo').textContent = cita.motivo || 'Consulta médica general';

            // Configuración del badge de estado
            const badgeEstado = tarjeta.querySelector('.col-estado');
            const estadoNormalizado = (cita.estado || 'PENDIENTE').toLowerCase();
            badgeEstado.textContent = cita.estado || 'PENDIENTE';
            badgeEstado.classList.add(estadoNormalizado);

            // Elementos de acción
            const btnPdf = tarjeta.querySelector('.btn-pdf');
            const btnAnular = tarjeta.querySelector('.btn-anular');
            const msgCancelado = tarjeta.querySelector('.col-msg-cancelado');

            // Lógica según el estado del registro
            if (cita.estado === 'CONFIRMADA' || cita.estado === 'PENDIENTE') {
                btnPdf.classList.remove('oculto');
                btnAnular.classList.remove('oculto');

                btnAnular.addEventListener('click', () => {
                    cancelarCita(cita.idCita, idPaciente);
                });
            } else if (cita.estado === 'CANCELADA') {
                msgCancelado.classList.remove('oculto');
            } else if (cita.estado === 'COMPLETADA') {
                btnPdf.classList.remove('oculto');
            }

            btnPdf.addEventListener('click', () => {
                imprimirTicketCita(cita.idCita);
            });

            contenedor.appendChild(clon);
        });

    } catch {
        renderizarMensajeEnContenedor(contenedor, 'Ocurrió un error al cargar tu historial de citas.', true);
    }
}

/**
 * Muestra mensajes de estado vacíos o errores utilizando <template id="tpl-sin-citas">.
 */
function renderizarMensajeEnContenedor(contenedor, mensaje, esError = false) {
    contenedor.replaceChildren();
    const tpl = document.getElementById('tpl-sin-citas');
    if (!tpl) return;

    const clon = tpl.content.cloneNode(true);
    const caja = clon.querySelector('.celda-mensaje');
    if (caja) {
        caja.textContent = mensaje;
        if (esError) caja.classList.add('celda-error');
    }
    contenedor.appendChild(clon);
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