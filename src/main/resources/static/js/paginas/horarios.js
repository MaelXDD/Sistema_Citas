document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificación de perfil administrador
    const usuario = obtenerPacienteSesion();
    if (!usuario || usuario.rol !== 'ADMIN') {
        window.location.href = '/index.html';
        return;
    }

    configurarNavegacionVistas();
    configurarEventosCabecera();
    configurarFormularioHorarios();
    cargarDoctoresEnSelector();
    cargarHorarios();
});

/**
 * Alterna entre la tabla y el formulario mediante clases CSS
 */
function configurarNavegacionVistas() {
    const vistaTabla      = document.getElementById('vistaTabla');
    const vistaFormulario = document.getElementById('vistaFormulario');
    const btnMostrarForm  = document.getElementById('btnMostrarForm');
    const btnCancelar     = document.getElementById('btnCancelar');
    const btnRegresarHome = document.getElementById('btnRegresarHome');
    const form            = document.getElementById('horarioForm');

    btnMostrarForm?.addEventListener('click', () => {
        form?.reset();
        vistaTabla.classList.add('oculto');
        vistaFormulario.classList.remove('oculto');
    });

    const volverATabla = () => {
        vistaFormulario.classList.add('oculto');
        vistaTabla.classList.remove('oculto');
        form?.reset();
    };

    btnCancelar?.addEventListener('click', volverATabla);

    btnRegresarHome?.addEventListener('click', () => {
        if (!vistaFormulario.classList.contains('oculto')) {
            volverATabla();
        } else {
            window.location.href = '/index.html';
        }
    });
}

/**
 * Navegación rápida al panel de estadísticas.
 */
function configurarEventosCabecera() {
    document.getElementById('btnIrEstadisticas')?.addEventListener('click', () => {
        window.location.href = '/estadisticas.html';
    });
}

/**
 * Consulta y renderiza los turnos clonando el <template id="tpl-fila-horario">.
 * Cero innerHTML en el armado de la tabla.
 */
async function cargarHorarios() {
    const tbody = document.getElementById('tablaHorariosBody');
    if (!tbody) return;

    renderizarMensajeEnTabla(tbody, 'tpl-msg-horario', 'Cargando asignación de horarios...');

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/horarios`);
        if (!respuesta.ok) throw new Error();

        const horarios = await respuesta.json();

        if (horarios.length === 0) {
            renderizarMensajeEnTabla(tbody, 'tpl-msg-horario', 'No hay horarios ni turnos registrados.');
            return;
        }

        tbody.replaceChildren();
        const plantilla = document.getElementById('tpl-fila-horario');

        horarios.forEach(h => {
            const clon = plantilla.content.cloneNode(true);

            const nombreDoctor = h.doctor ? `Dr. ${h.doctor.nombres} ${h.doctor.apellidos}` : 'No asignado';
            const espDoctor    = (h.doctor && h.doctor.especialidad) ? h.doctor.especialidad.nombre : 'General';

            clon.querySelector('.col-medico').textContent = nombreDoctor;
            clon.querySelector('.col-esp').textContent    = espDoctor;
            clon.querySelector('.col-dia').textContent    = h.diaSemana;
            clon.querySelector('.col-inicio').textContent = Formato.horaAmPm(h.horaInicio);
            clon.querySelector('.col-fin').textContent    = Formato.horaAmPm(h.horaFin);

            clon.querySelector('.btn-del-horario').addEventListener('click', () => {
                eliminarHorario(h.idHorario);
            });

            tbody.appendChild(clon);
        });
    } catch {
        renderizarMensajeEnTabla(tbody, 'tpl-msg-horario', 'Error al obtener los horarios desde el servidor.', true);
    }
}

/**
 * Pobla el selector de médicos con registros activos obtenidos desde la base de datos.
 */
async function cargarDoctoresEnSelector() {
    const selector = document.getElementById('selectDoctor');
    if (!selector) return;

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/doctores/activos`);
        if (!respuesta.ok) throw new Error();

        const doctores = await respuesta.json();
        selector.replaceChildren();

        const optDefault = document.createElement('option');
        optDefault.value = "";
        optDefault.textContent = "Seleccione el médico...";
        optDefault.disabled = true;
        optDefault.selected = true;
        selector.appendChild(optDefault);

        doctores.forEach(doc => {
            const opt = document.createElement('option');
            opt.value = doc.idDoctor;
            const esp = doc.especialidad ? ` (${doc.especialidad.nombre})` : '';
            opt.textContent = `${doc.apellidos}, ${doc.nombres}${esp}`;
            selector.appendChild(opt);
        });
    } catch {
        selector.replaceChildren();
        const optError = document.createElement('option');
        optError.textContent = "Error al cargar médicos";
        optError.disabled = true;
        selector.appendChild(optError);
    }
}

/**
 * Procesa el registro de turnos para cada día seleccionado en los checkboxes.
 */
function configurarFormularioHorarios() {
    const form = document.getElementById('horarioForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idDoctor = document.getElementById('selectDoctor').value;
        const turno    = document.getElementById('selectTurno').value;

        const checkboxes = document.querySelectorAll('input[name="diasSemana"]:checked');
        const diasSeleccionados = Array.from(checkboxes).map(cb => cb.value);

        if (diasSeleccionados.length === 0) {
            Notificacion.advertencia('Días Requeridos', 'Seleccione al menos un día de la semana para el turno.');
            return;
        }

        if (!turno) {
            Notificacion.advertencia('Turno Requerido', 'Seleccione el rango de atención médica.');
            return;
        }

        const [horaInicio, horaFin] = turno.split('-');

        try {
            for (const dia of diasSeleccionados) {
                const payload = {
                    doctor: { idDoctor: parseInt(idDoctor) },
                    diaSemana: dia,
                    horaInicio: `${horaInicio}:00`,
                    horaFin: `${horaFin}:00`,
                    activo: true
                };

                const res = await fetch(`${CONFIG.API_URL}/horarios`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error();
            }

            form.reset();
            document.getElementById('vistaFormulario').classList.add('oculto');
            document.getElementById('vistaTabla').classList.remove('oculto');
            await cargarHorarios();

            Notificacion.exito('¡Turnos Asignados!', 'Los horarios seleccionados fueron registrados correctamente.');
        } catch {
            Notificacion.error('Error al registrar', 'Ocurrió un error al guardar los turnos del médico.');
        }
    });
}

/**
 * Elimina un registro de horario tras confirmación.
 * @param {number} idHorario - Identificador del turno.
 */
async function eliminarHorario(idHorario) {
    const confirmado = await Notificacion.confirmar(
        '¿Eliminar este turno?',
        'El médico ya no estará disponible para citas en este día y horario.',
        'Sí, eliminar'
    );

    if (!confirmado) return;

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/horarios/${idHorario}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            await cargarHorarios();
            Notificacion.exito('Turno eliminado', 'El horario fue retirado correctamente.');
        } else {
            const error = await respuesta.json().catch(() => ({}));
            Notificacion.error('No se pudo eliminar', error.mensaje || 'Error al retirar el turno.');
        }
    } catch {
        Notificacion.error('Error de red', 'No hubo respuesta del servidor.');
    }
}