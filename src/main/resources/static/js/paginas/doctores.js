document.addEventListener('DOMContentLoaded', () => {
    // Protección de acceso: solo administradores
    const usuario = obtenerPacienteSesion();
    if (!usuario || usuario.rol !== 'ADMIN') {
        window.location.href = '/index.html';
        return;
    }

    configurarNavegacionVistas();
    configurarEventosCabecera();
    configurarFormularioDoctores();
    cargarDoctores();
    cargarEspecialidadesEnSelector();
});

/**
 * Controla la alternancia entre la tabla de personal médico y el formulario de alta/edición
 */
function configurarNavegacionVistas() {
    const vistaTabla      = document.getElementById('vistaTabla');
    const vistaFormulario = document.getElementById('vistaFormulario');
    const btnMostrarForm  = document.getElementById('btnMostrarForm');
    const btnCancelar     = document.getElementById('btnCancelar');
    const btnRegresarHome = document.getElementById('btnRegresarHome');
    const form            = document.getElementById('doctorForm');

    btnMostrarForm?.addEventListener('click', () => {
        document.getElementById('tituloFormulario').textContent      = "Registrar Especialista";
        document.getElementById('descripcionFormulario').textContent = "Ingrese los datos requeridos para dar de alta al médico en el sistema.";
        document.getElementById('inputIdDoctor').value               = "";
        document.getElementById('inputDni').readOnly                 = false;
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
 * Vincula los botones de descarga de PDF y estadísticas de la cabecera.
 */
function configurarEventosCabecera() {
    document.getElementById('btnDescargarReporte')?.addEventListener('click', () => {
        window.open(`${CONFIG.API_URL}/reportes/doctores/pdf`, '_blank');
    });

    document.getElementById('btnIrEstadisticas')?.addEventListener('click', () => {
        window.location.href = '/estadisticas.html';
    });
}

/**
 * Obtiene la lista de médicos activos desde la base de datos y la renderiza
 */
async function cargarDoctores() {
    const tbody = document.getElementById('tablaDoctoresBody');
    if (!tbody) return;

    renderizarMensajeEnTabla(tbody, 'tpl-msg-doctor', 'Cargando personal médico...');

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/doctores/activos`);
        if (!respuesta.ok) throw new Error();

        const doctores = await respuesta.json();

        if (doctores.length === 0) {
            renderizarMensajeEnTabla(tbody, 'tpl-msg-doctor', 'No hay doctores registrados actualmente.');
            return;
        }

        tbody.replaceChildren();
        const plantilla = document.getElementById('tpl-fila-doctor');

        doctores.forEach(doc => {
            const clon = plantilla.content.cloneNode(true);

            clon.querySelector('.col-dni').textContent = doc.dni;
            clon.querySelector('.col-nombre').textContent = `${doc.apellidos}, ${doc.nombres}`;
            clon.querySelector('.col-esp').textContent = doc.especialidad ? doc.especialidad.nombre : 'Sin asignar';
            clon.querySelector('.col-correo').textContent = doc.correo;
            clon.querySelector('.col-telefono').textContent = doc.telefono || '—';

            clon.querySelector('.btn-edit').addEventListener('click', () => {
                prepararEdicionDoctor(doc);
            });

            clon.querySelector('.btn-del').addEventListener('click', () => {
                darDeBajaDoctor(doc.idDoctor);
            });

            tbody.appendChild(clon);
        });
    } catch {
        renderizarMensajeEnTabla(tbody, 'tpl-msg-doctor', 'Error al obtener la lista de médicos desde el servidor.', true);
    }
}

/**
 * Rellena el selector de especialidades consumiendo la base de datos.
 */
async function cargarEspecialidadesEnSelector() {
    const selector = document.getElementById('selectEspecialidad');
    if (!selector) return;

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/especialidades/activas`);
        if (!respuesta.ok) throw new Error();

        const especialidades = await respuesta.json();
        selector.replaceChildren();

        const optDefault = document.createElement('option');
        optDefault.value = "";
        optDefault.textContent = "Seleccione Especialidad...";
        optDefault.disabled = true;
        optDefault.selected = true;
        selector.appendChild(optDefault);

        especialidades.forEach(esp => {
            const opt = document.createElement('option');
            opt.value = esp.idEspecialidad;
            opt.textContent = esp.nombre;
            selector.appendChild(opt);
        });
    } catch {
        selector.replaceChildren();
        const optError = document.createElement('option');
        optError.textContent = "Error al cargar especialidades";
        optError.disabled = true;
        selector.appendChild(optError);
    }
}

/**
 * Prepara los campos del formulario para modificar los datos de un doctor.
 * @param {Object} doc - Objeto con datos del doctor provenientes de la BD.
 */
function prepararEdicionDoctor(doc) {
    document.getElementById('inputIdDoctor').value   = doc.idDoctor;
    document.getElementById('inputNombres').value    = doc.nombres;
    document.getElementById('inputApellidos').value  = doc.apellidos;
    document.getElementById('inputDni').value        = doc.dni;
    document.getElementById('inputDni').readOnly     = true;
    document.getElementById('inputCorreo').value     = doc.correo;
    document.getElementById('inputTelefono').value   = doc.telefono || '';

    const selector = document.getElementById('selectEspecialidad');
    if (selector && doc.especialidad) {
        selector.value = doc.especialidad.idEspecialidad;
    }

    document.getElementById('tituloFormulario').textContent      = "Modificar Especialista";
    document.getElementById('descripcionFormulario').textContent = "Edite los campos necesarios para actualizar el registro del médico.";

    document.getElementById('vistaTabla').classList.add('oculto');
    document.getElementById('vistaFormulario').classList.remove('oculto');
}

/**
 * Ejecuta el alta o actualización del médico contra el backend.
 */
function configurarFormularioDoctores() {
    const form = document.getElementById('doctorForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const datos = Object.fromEntries(new FormData(form).entries());
        const idDoctor = document.getElementById('inputIdDoctor').value;
        const selectorEsp = document.getElementById('selectEspecialidad');

        if (datos.dni && datos.dni.length !== 8) {
            Notificacion.advertencia('DNI Inválido', 'El DNI debe contener exactamente 8 dígitos.');
            return;
        }

        if (datos.telefono && datos.telefono.length !== 9) {
            Notificacion.advertencia('Teléfono Inválido', 'El teléfono debe contener exactamente 9 dígitos.');
            return;
        }

        const payload = {
            dni: datos.dni,
            nombres: datos.nombres,
            apellidos: datos.apellidos,
            correo: datos.correo,
            telefono: datos.telefono || null,
            especialidad: { idEspecialidad: parseInt(selectorEsp.value) }
        };

        const esEdicion = idDoctor !== "";
        const url    = esEdicion ? `${CONFIG.API_URL}/doctores/${idDoctor}` : `${CONFIG.API_URL}/doctores`;
        const metodo = esEdicion ? 'PUT' : 'POST';

        try {
            const respuesta = await fetch(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (respuesta.ok) {
                form.reset();
                selectorEsp.selectedIndex = 0;
                document.getElementById('vistaFormulario').classList.add('oculto');
                document.getElementById('vistaTabla').classList.remove('oculto');
                await cargarDoctores();
                Notificacion.exito(
                    esEdicion ? '¡Cambios Guardados!' : '¡Médico Añadido!',
                    esEdicion ? 'Los datos se actualizaron correctamente.' : 'El médico fue registrado en el staff activo.'
                );
            } else {
                const error = await respuesta.json().catch(() => ({}));
                Notificacion.error('Error al guardar', error.mensaje || 'Verifique que el correo o DNI no estén duplicados.');
            }
        } catch {
            Notificacion.error('Error de conexión', 'No hubo respuesta del servidor.');
        }
    });
}

/**
 * Da de baja lógica a un doctor tras confirmación del usuario.
 * @param {number} idDoctor - Identificador único del médico.
 */
async function darDeBajaDoctor(idDoctor) {
    const confirmado = await Notificacion.confirmar(
        '¿Dar de baja al médico?',
        'El especialista dejará de figurar en el staff activo y no se le podrán programar nuevas citas.',
        'Sí, dar de baja',
        '#dc2626'
    );

    if (!confirmado) return;

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/doctores/${idDoctor}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            await cargarDoctores();
            Notificacion.exito('Baja confirmada', 'El médico ha sido desactivado del sistema.');
        } else {
            const error = await respuesta.json().catch(() => ({}));
            Notificacion.error('No se pudo desactivar', error.mensaje || 'El registro no pudo ser modificado.');
        }
    } catch {
        Notificacion.error('Error de red', 'No se pudo comunicar con el servidor.');
    }
}