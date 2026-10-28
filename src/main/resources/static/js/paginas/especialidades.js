document.addEventListener('DOMContentLoaded', () => {
    const usuario = obtenerPacienteSesion();
    if (!usuario || usuario.rol !== 'ADMIN') {
        window.location.href = '/index.html';
        return;
    }

    configurarNavegacionVistas();
    configurarEventosCabecera();
    configurarFormularioEspecialidades();
    configurarContadorDescripcion();
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

const ESPECIALIDADES_POR_PAGINA = 5;
let listaEspecialidades = [];
let paginaActual = 1;

/**
 * Pide los doctores activos y sus horarios en dos consultas y los reparte por especialidad.
 * @returns {Promise<Map>} Mapa idEspecialidad -> lista de { doctor, horarios }.
 */
async function consultarDoctoresPorEspecialidad() {
    const porEspecialidad = new Map();

    try {
        const [respuesta, horariosPorDoctor] = await Promise.all([
            fetch(`${CONFIG.API_URL}/doctores/activos`),
            consultarHorariosPorDoctor().catch(() => new Map())
        ]);
        if (!respuesta.ok) return porEspecialidad;

        (await respuesta.json()).forEach((doctor) => {
            if (!doctor.especialidad) return;

            const id = doctor.especialidad.idEspecialidad;
            if (!porEspecialidad.has(id)) porEspecialidad.set(id, []);
            porEspecialidad.get(id).push({ doctor, horarios: horariosPorDoctor.get(doctor.idDoctor) ?? [] });
        });
    } catch {
        // Sin doctores: las tarjetas se muestran igual, solo con la tarifa
    }

    return porEspecialidad;
}

/**
 * Muestra un mensaje en la lista y deja la paginación en cero.
 */
function mostrarMensajeEspecialidades(texto, esError = false) {
    mostrarMensajeLista(document.getElementById('listaEspecialidades'), texto, esError);

    document.getElementById('paginacion').replaceChildren();
    document.getElementById('textoMostradas').textContent = '0';
    document.getElementById('textoTotal').textContent = '0';
}

/**
 * Carga las especialidades con su tarifa y las muestra paginadas.
 */
async function cargarEspecialidades() {
    mostrarMensajeEspecialidades('Cargando especialidades médicas...');

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/especialidades`);
        if (!respuesta.ok) throw new Error();

        const especialidades = await respuesta.json();

        if (especialidades.length === 0) {
            listaEspecialidades = [];
            mostrarResumen();
            mostrarMensajeEspecialidades('No se encontraron especialidades registradas.');
            return;
        }

        const [doctoresPorEspecialidad, precios] = await Promise.all([
            consultarDoctoresPorEspecialidad(),
            Promise.all(especialidades.map(esp => consultarPrecio(esp.idEspecialidad)))
        ]);

        listaEspecialidades = especialidades.map((esp, i) => ({
            esp,
            precio: precios[i],
            doctores: doctoresPorEspecialidad.get(esp.idEspecialidad) ?? []
        }));

        mostrarResumen();
        mostrarPagina(paginaActual);
    } catch {
        mostrarMensajeEspecialidades('Error al consultar las especialidades con el servidor.', true);
    }
}

/**
 * Llena los cuadros de arriba con los datos reales de la lista.
 */
function mostrarResumen() {
    const total    = listaEspecialidades.length;
    const inactivas = listaEspecialidades.filter(({ esp }) => !esp.activo).length;
    const enTurno   = listaEspecialidades
        .flatMap(({ doctores }) => doctores)
        .filter(({ horarios }) => atiendeHoy(horarios)).length;
    const montos   = listaEspecialidades.filter(({ precio }) => precio).map(({ precio }) => precio.monto);
    const promedio = montos.length ? montos.reduce((suma, monto) => suma + monto, 0) / montos.length : null;

    document.getElementById('resumenTotal').textContent      = total;
    document.getElementById('resumenEnTurno').textContent    = enTurno;
    document.getElementById('resumenInactivas').textContent  = inactivas;
    document.getElementById('resumenTarifa').textContent     = promedio === null ? '—' : Formato.moneda(promedio);
}

/**
 * Dibuja las tarjetas de la página indicada.
 */
function mostrarPagina(pagina) {
    const totalPaginas = Math.max(1, Math.ceil(listaEspecialidades.length / ESPECIALIDADES_POR_PAGINA));
    paginaActual = Math.min(Math.max(pagina, 1), totalPaginas);

    const inicio  = (paginaActual - 1) * ESPECIALIDADES_POR_PAGINA;
    const visibles = listaEspecialidades.slice(inicio, inicio + ESPECIALIDADES_POR_PAGINA);

    const lista = document.getElementById('listaEspecialidades');
    const plantilla = document.getElementById('tpl-tarjeta-especialidad');
    lista.replaceChildren();

    for (const { esp, precio, doctores } of visibles) {
        const clon = plantilla.content.cloneNode(true);

        clon.querySelector('.especialidad-id').textContent          = `ID #${String(esp.idEspecialidad).padStart(2, '0')}`;
        clon.querySelector('.especialidad-nombre').textContent      = esp.nombre;
        clon.querySelector('.especialidad-descripcion').textContent = esp.descripcion || '—';
        clon.querySelector('.especialidad-precio').textContent      = precio ? Formato.moneda(precio.monto) : 'Sin tarifa';

        mostrarIcono(clon.querySelector('.especialidad-icono'), esp.nombre);
        mostrarMedicos(clon, doctores);

        const estado = clon.querySelector('.especialidad-estado');
        estado.textContent = esp.activo ? 'Activo' : 'Inactivo';
        estado.classList.add(esp.activo ? 'activo' : 'inactivo');

        const btnToggle = clon.querySelector('.btn-toggle-esp');
        btnToggle.querySelector('.texto-estado').textContent = esp.activo ? 'Desactivar' : 'Activar';
        btnToggle.querySelector('.icono-estado').classList.add(esp.activo ? 'bi-slash-circle' : 'bi-check-circle');

        clon.querySelector('.btn-edit-esp').addEventListener('click', () => {
            prepararEdicionEspecialidad(esp, precio);
        });

        btnToggle.addEventListener('click', () => {
            alternarEstadoEspecialidad(esp);
        });

        lista.appendChild(clon);
    }

    document.getElementById('textoMostradas').textContent = visibles.length;
    document.getElementById('textoTotal').textContent     = listaEspecialidades.length;
    dibujarPaginacion(document.getElementById('paginacion'), paginaActual, totalPaginas, mostrarPagina);
}

/**
 * Crea la fila de un doctor (nombre y horarios) a partir de la plantilla.
 */
function crearFilaMedico({ doctor, horarios }) {
    const fila = document.getElementById('tpl-medico').content.cloneNode(true);

    fila.querySelector('.medico-nombre').textContent = `Dr(a). ${doctor.nombres} ${doctor.apellidos}`;

    const lineas = fila.querySelector('.medico-horario-lineas');
    const textos = armarLineasHorario(horarios);

    if (textos.length === 0) {
        lineas.textContent = 'Sin horarios registrados';
    }

    for (const texto of textos) {
        const linea = document.createElement('span');
        linea.textContent = texto;
        lineas.appendChild(linea);
    }

    return fila;
}

/**
 * Muestra el primer doctor de la especialidad. Si hay más, aparece una flecha
 * que despliega a los demás.
 */
function mostrarMedicos(tarjeta, doctores) {
    const principal = tarjeta.querySelector('.medicos-principal');

    if (doctores.length === 0) {
        const fila = document.getElementById('tpl-medico').content.cloneNode(true);
        fila.querySelector('.medico-nombre').textContent = 'Sin médico asignado';
        fila.querySelector('.medico-horario-lineas').textContent = 'Sin horarios registrados';
        principal.appendChild(fila);
        return;
    }

    principal.appendChild(crearFilaMedico(doctores[0]));

    if (doctores.length === 1) return;

    const extra = tarjeta.querySelector('.medicos-extra');
    const boton = tarjeta.querySelector('.medicos-boton');
    const texto = boton.querySelector('.medicos-boton-texto');
    const otros = doctores.length - 1;
    const verMas = otros === 1 ? 'Ver 1 doctor más' : `Ver ${otros} doctores más`;

    for (const doctor of doctores.slice(1)) {
        tarjeta.querySelector('.medicos-extra-interior').appendChild(crearFilaMedico(doctor));
    }

    texto.textContent = verMas;
    boton.classList.remove('oculto');

    boton.addEventListener('click', () => {
        const abierto = extra.classList.toggle('abierto');
        boton.setAttribute('aria-expanded', abierto);
        texto.textContent = abierto ? 'Ocultar doctores' : verMas;
    });
}

/**
 * Muestra cuántos caracteres lleva la descripción (ej. "35 / 500").
 */
function actualizarContadorDescripcion() {
    const campo = document.getElementById('inputDescripcion');
    document.getElementById('contadorDescripcion').textContent = `${campo.value.length} / ${campo.maxLength}`;
}

function configurarContadorDescripcion() {
    document.getElementById('inputDescripcion')?.addEventListener('input', actualizarContadorDescripcion);
    document.getElementById('especialidadForm')?.addEventListener('reset', () => setTimeout(actualizarContadorDescripcion));
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
    actualizarContadorDescripcion();

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