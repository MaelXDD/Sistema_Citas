document.addEventListener('DOMContentLoaded', () => {
    const usuario = obtenerPacienteSesion();
    if (!usuario || usuario.rol !== 'ADMIN') {
        window.location.href = '/index.html';
        return;
    }

    configurarNavegacionVistas();
    configurarEventosCabecera();
    configurarFormularioEspecialidades();
    cargarEspecialidades();
});

/**
 * Controla la visualización entre la tabla y el formulario mediante clases CSS.
 */
function configurarNavegacionVistas() {
    const vistaTabla      = document.getElementById('vistaTabla');
    const vistaFormulario = document.getElementById('vistaFormulario');
    const btnMostrarForm  = document.getElementById('btnMostrarForm');
    const btnCancelar     = document.getElementById('btnCancelar');
    const btnRegresarHome = document.getElementById('btnRegresarHome');
    const form            = document.getElementById('especialidadForm');

    btnMostrarForm?.addEventListener('click', () => {
        document.getElementById('tituloFormulario').textContent      = "Registrar Especialidad";
        document.getElementById('descripcionFormulario').textContent = "Ingrese los datos requeridos para registrar la especialidad en el sistema.";
        document.getElementById('inputIdEspecialidad').value         = "";
        document.getElementById('inputIdPrecio').value               = "";
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
 * Vincula los botones de la cabecera (reporte en PDF y enlace a estadísticas).
 */
function configurarEventosCabecera() {
    document.getElementById('btnDescargarReporteEsp')?.addEventListener('click', () => {
        window.open(`${CONFIG.API_URL}/reportes/especialidades/pdf`, '_blank');
    });

    document.getElementById('btnIrEstadisticas')?.addEventListener('click', () => {
        window.location.href = '/estadisticas.html';
    });
}

/**
 * Carga todas las especialidades registradas y consulta de forma dinámica
 * sus tarifas en la tabla precios de la base de datos.
 */
async function cargarEspecialidades() {
    const tbody = document.getElementById('tablaEspecialidadesBody');
    if (!tbody) return;

    renderizarMensajeEnTabla(tbody, 'tpl-msg-esp', 'Cargando especialidades médicas...');

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/especialidades`);
        if (!respuesta.ok) throw new Error();

        const especialidades = await respuesta.json();

        if (especialidades.length === 0) {
            renderizarMensajeEnTabla(tbody, 'tpl-msg-esp', 'No se encontraron especialidades registradas.');
            return;
        }

        tbody.replaceChildren();
        const plantilla = document.getElementById('tpl-fila-especialidad');

        for (const esp of especialidades) {
            const clon = plantilla.content.cloneNode(true);

            clon.querySelector('.col-id').textContent   = esp.idEspecialidad;
            clon.querySelector('.col-nombre').textContent = esp.nombre;
            clon.querySelector('.col-desc').textContent   = esp.descripcion || '—';

            // Consultar precio dinámico desde la BD
            const celdaPrecio = clon.querySelector('.col-precio');
            let precioObj = null;

            try {
                const resPrecio = await fetch(`${CONFIG.API_URL}/precios/especialidad/${esp.idEspecialidad}`);
                if (resPrecio.ok) {
                    precioObj = await resPrecio.json();
                    celdaPrecio.textContent = Formato.moneda(precioObj.monto);
                } else {
                    celdaPrecio.textContent = 'Sin tarifa';
                }
            } catch {
                celdaPrecio.textContent = 'Sin tarifa';
            }

            // Badge de estado (activo / inactivo) mediante clases semánticas
            const badgeEstado = clon.querySelector('.col-estado');
            badgeEstado.textContent = esp.activo ? 'Activo' : 'Inactivo';
            badgeEstado.classList.add(esp.activo ? 'activo' : 'inactivo');

            // Botón de alternancia de estado
            const btnToggle = clon.querySelector('.btn-toggle-esp');
            btnToggle.textContent = esp.activo ? 'Desactivar' : 'Activar';

            clon.querySelector('.btn-edit-esp').addEventListener('click', () => {
                prepararEdicionEspecialidad(esp, precioObj);
            });

            btnToggle.addEventListener('click', () => {
                alternarEstadoEspecialidad(esp);
            });

            tbody.appendChild(clon);
        }
    } catch {
        renderizarMensajeEnTabla(tbody, 'tpl-msg-esp', 'Error al consultar las especialidades con el servidor.', true);
    }
}

/**
 * Prepara el formulario para editar datos de especialidad y precio.
 * @param {Object} esp - Objeto de la especialidad.
 * @param {Object|null} precio - Objeto de la tabla precios si existe.
 */
function prepararEdicionEspecialidad(esp, precio) {
    document.getElementById('inputIdEspecialidad').value = esp.idEspecialidad;
    document.getElementById('inputIdPrecio').value       = precio ? precio.idPrecio : '';
    document.getElementById('inputNombre').value         = esp.nombre;
    document.getElementById('inputDescripcion').value    = esp.descripcion || '';
    document.getElementById('inputPrecio').value         = precio ? precio.monto : '';

    document.getElementById('tituloFormulario').textContent      = "Modificar Especialidad";
    document.getElementById('descripcionFormulario').textContent = "Edite los campos necesarios para actualizar la especialidad y su tarifa.";

    document.getElementById('vistaTabla').classList.add('oculto');
    document.getElementById('vistaFormulario').classList.remove('oculto');
}

/**
 * Procesa el envío del formulario contra los endpoints correspondientes de la BD.
 */
function configurarFormularioEspecialidades() {
    const form = document.getElementById('especialidadForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idEsp    = document.getElementById('inputIdEspecialidad').value;
        const idPrecio = document.getElementById('inputIdPrecio').value;
        const nombre   = document.getElementById('inputNombre').value.trim();
        const desc     = document.getElementById('inputDescripcion').value.trim();
        const precio   = document.getElementById('inputPrecio').value;

        const payloadEsp = {
            nombre: nombre,
            descripcion: desc || null,
            activo: true
        };

        const esEdicion = idEsp !== "";
        const urlEsp = esEdicion ? `${CONFIG.API_URL}/especialidades/${idEsp}` : `${CONFIG.API_URL}/especialidades`;
        const metodoEsp = esEdicion ? 'PUT' : 'POST';

        try {
            const resEsp = await fetch(urlEsp, {
                method: metodoEsp,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadEsp)
            });

            if (!resEsp.ok) throw new Error();
            const espGuardada = await resEsp.json();

            // Si se ingresó precio, registrar o actualizar en la tabla precios
            if (precio && parseFloat(precio) > 0) {
                const payloadPrecio = {
                    especialidad: { idEspecialidad: espGuardada.idEspecialidad },
                    descripcion: `Tarifa consulta ${espGuardada.nombre}`,
                    monto: parseFloat(precio),
                    activo: true
                };

                const urlPrecio = idPrecio ? `${CONFIG.API_URL}/precios/${idPrecio}` : `${CONFIG.API_URL}/precios`;
                const metodoPrecio = idPrecio ? 'PUT' : 'POST';

                await fetch(urlPrecio, {
                    method: metodoPrecio,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadPrecio)
                });
            }

            form.reset();
            document.getElementById('vistaFormulario').classList.add('oculto');
            document.getElementById('vistaTabla').classList.remove('oculto');
            await cargarEspecialidades();

            Notificacion.exito(
                esEdicion ? '¡Cambios Guardados!' : '¡Especialidad Creada!',
                esEdicion ? 'La especialidad y su precio han sido actualizados.' : 'Se registró la nueva especialidad con éxito.'
            );
        } catch {
            Notificacion.error('Error al guardar', 'No se pudieron registrar los datos de la especialidad.');
        }
    });
}

/**
 * Activa o desactiva lógicamente una especialidad.
 * @param {Object} esp - Objeto de la especialidad.
 */
async function alternarEstadoEspecialidad(esp) {
    const accion = esp.activo ? 'desactivar' : 'activar';
    const confirmado = await Notificacion.confirmar(
        `¿Desea ${accion} la especialidad?`,
        `La especialidad "${esp.nombre}" pasará a estar ${esp.activo ? 'inactiva' : 'activa'} en el sistema.`,
        `Sí, ${accion}`,
        esp.activo ? '#dc2626' : '#004a99'
    );

    if (!confirmado) return;

    try {
        const payload = {
            ...esp,
            activo: !esp.activo
        };

        const res = await fetch(`${CONFIG.API_URL}/especialidades/${esp.idEspecialidad}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            await cargarEspecialidades();
            Notificacion.exito('Estado modificado', `La especialidad se encuentra ahora ${!esp.activo ? 'activa' : 'inactiva'}.`);
        } else {
            Notificacion.error('Error', 'No se pudo actualizar el estado de la especialidad.');
        }
    } catch {
        Notificacion.error('Error de red', 'No hubo respuesta del servidor.');
    }
}