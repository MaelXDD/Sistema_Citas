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
    configurarSeleccionDias();
    configurarResumenDoctor();
    configurarFiltros();
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

const HORARIOS_POR_PAGINA = 5;
const MINUTOS_MEDIODIA = 13 * 60;
let listaHorarios = [];
let horariosFiltrados = [];
let doctoresActivos = [];
let paginaActual = 1;

// Una sola consulta de tarifa por especialidad
const tarifas = new Map();
function tarifaDe(idEspecialidad) {
    if (!tarifas.has(idEspecialidad)) tarifas.set(idEspecialidad, consultarPrecio(idEspecialidad));
    return tarifas.get(idEspecialidad);
}

/**
 * Muestra un mensaje en la lista y deja la paginación en cero.
 */
function mostrarMensajeHorarios(texto, esError = false) {
    mostrarMensajeLista(document.getElementById('listaHorarios'), texto, esError);

    document.getElementById('paginacion').replaceChildren();
    document.getElementById('textoMostradas').textContent = '0';
    document.getElementById('textoTotal').textContent = '0';
}

/**
 * Posición del día en la semana (0 = Lunes), sin importar tildes ni mayúsculas.
 */
function indiceDia(horario) {
    return DIAS_SEMANA.indexOf(sinTildes(horario.diaSemana).toUpperCase());
}

function aMinutos(hora) {
    const [horas, minutos] = String(hora).split(':').map(Number);
    return horas * 60 + minutos;
}

/**
 * Mañana si termina antes de la 1 pm, Tarde si empieza desde la 1 pm, Intermedio en otro caso.
 */
function etiquetaTurno(inicio, fin) {
    if (aMinutos(fin) <= MINUTOS_MEDIODIA) return 'Turno Mañana';
    if (aMinutos(inicio) >= MINUTOS_MEDIODIA) return 'Turno Tarde';
    return 'Turno Intermedio';
}

/**
 * Duración del turno, por ejemplo "6 horas" o "5 horas 30 min".
 */
function textoDuracion(inicio, fin) {
    const total = aMinutos(fin) - aMinutos(inicio);
    const horas = Math.floor(total / 60);
    const minutos = total % 60;

    return `${horas} ${horas === 1 ? 'hora' : 'horas'}${minutos ? ` ${minutos} min` : ''}`;
}

/**
 * Ordena por apellido del médico, luego por día y por hora de inicio.
 */
function compararHorarios(a, b) {
    const nombreA = a.doctor ? `${a.doctor.apellidos} ${a.doctor.nombres}` : '';
    const nombreB = b.doctor ? `${b.doctor.apellidos} ${b.doctor.nombres}` : '';

    return nombreA.localeCompare(nombreB)
        || indiceDia(a) - indiceDia(b)
        || String(a.horaInicio).localeCompare(String(b.horaInicio));
}

/**
 * Consulta los turnos activos con la tarifa de la especialidad de cada médico.
 */
async function cargarHorarios() {
    if (!document.getElementById('listaHorarios')) return;

    mostrarMensajeHorarios('Cargando asignación de horarios...');

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/horarios`);
        if (!respuesta.ok) throw new Error();

        const horarios = await respuesta.json();

        if (horarios.length === 0) {
            listaHorarios = [];
            mostrarResumen();
            mostrarMensajeHorarios('No hay horarios ni turnos registrados.');
            return;
        }

        listaHorarios = await Promise.all(horarios.sort(compararHorarios).map(async (h) => ({
            h,
            precio: h.doctor && h.doctor.especialidad ? await tarifaDe(h.doctor.especialidad.idEspecialidad) : null
        })));

        mostrarResumen();
        llenarFiltroEspecialidades();
        aplicarFiltros(paginaActual);
    } catch {
        mostrarMensajeHorarios('Error al obtener los horarios desde el servidor.', true);
    }
}

/**
 * Llena los cuadros de arriba con los datos reales de la lista.
 */
function mostrarResumen() {
    const doctores = new Set(listaHorarios.filter(({ h }) => h.doctor).map(({ h }) => h.doctor.idDoctor));
    const hoy = new Set(
        listaHorarios.filter(({ h }) => h.doctor && atiendeHoy([h])).map(({ h }) => h.doctor.idDoctor)
    );

    const montos = new Map();
    for (const { h, precio } of listaHorarios) {
        if (precio && h.doctor && h.doctor.especialidad) montos.set(h.doctor.especialidad.idEspecialidad, precio.monto);
    }
    const promedio = montos.size ? [...montos.values()].reduce((suma, monto) => suma + monto, 0) / montos.size : null;

    document.getElementById('resumenTurnos').textContent    = listaHorarios.length;
    document.getElementById('resumenDoctores').textContent  = doctores.size;
    document.getElementById('resumenEnTurno').textContent   = hoy.size;
    document.getElementById('resumenTarifa').textContent    = promedio === null ? '—' : Formato.moneda(promedio);
}

/**
 * Llena el filtro con las especialidades que tienen turnos, sin perder la elegida.
 */
function llenarFiltroEspecialidades() {
    const filtro = document.getElementById('filtroEspecialidad');
    const elegida = filtro.value;
    const especialidades = new Map();

    for (const { h } of listaHorarios) {
        if (h.doctor && h.doctor.especialidad) {
            especialidades.set(h.doctor.especialidad.idEspecialidad, h.doctor.especialidad.nombre);
        }
    }

    filtro.replaceChildren(filtro.options[0]);

    for (const [id, nombre] of [...especialidades].sort((a, b) => a[1].localeCompare(b[1]))) {
        const opcion = document.createElement('option');
        opcion.value = id;
        opcion.textContent = nombre;
        filtro.appendChild(opcion);
    }

    filtro.value = elegida;
}

/**
 * Vincula el buscador, los filtros y el botón para limpiarlos.
 */
function configurarFiltros() {
    const buscador = document.getElementById('inputBuscar');
    const especialidad = document.getElementById('filtroEspecialidad');
    const dia = document.getElementById('filtroDia');

    buscador?.addEventListener('input', () => aplicarFiltros(1));
    especialidad?.addEventListener('change', () => aplicarFiltros(1));
    dia?.addEventListener('change', () => aplicarFiltros(1));

    document.getElementById('btnLimpiarFiltros')?.addEventListener('click', () => {
        buscador.value = '';
        especialidad.value = '';
        dia.value = '';
        aplicarFiltros(1);
    });
}

/**
 * Filtra por médico, especialidad y día, y muestra la página indicada.
 */
function aplicarFiltros(pagina = 1) {
    const texto          = sinTildes(document.getElementById('inputBuscar').value.trim());
    const idEspecialidad = document.getElementById('filtroEspecialidad').value;
    const dia            = document.getElementById('filtroDia').value;

    horariosFiltrados = listaHorarios.filter(({ h }) => {
        const nombre = h.doctor ? sinTildes(`${h.doctor.nombres} ${h.doctor.apellidos}`) : '';
        const coincideNombre = nombre.includes(texto);
        const coincideEsp = !idEspecialidad
            || (h.doctor && h.doctor.especialidad && String(h.doctor.especialidad.idEspecialidad) === idEspecialidad);
        const coincideDia = !dia || String(indiceDia(h)) === dia;

        return coincideNombre && coincideEsp && coincideDia;
    });

    if (horariosFiltrados.length === 0) {
        mostrarMensajeHorarios('No se encontraron turnos con esos filtros.');
        return;
    }

    mostrarPagina(pagina);
}

/**
 * Dibuja las tarjetas de la página indicada.
 */
function mostrarPagina(pagina) {
    const totalPaginas = Math.max(1, Math.ceil(horariosFiltrados.length / HORARIOS_POR_PAGINA));
    paginaActual = Math.min(Math.max(pagina, 1), totalPaginas);

    const inicio   = (paginaActual - 1) * HORARIOS_POR_PAGINA;
    const visibles = horariosFiltrados.slice(inicio, inicio + HORARIOS_POR_PAGINA);

    const lista = document.getElementById('listaHorarios');
    const plantilla = document.getElementById('tpl-tarjeta-horario');
    lista.replaceChildren();

    for (const { h, precio } of visibles) {
        const clon = plantilla.content.cloneNode(true);

        const doctor = h.doctor;
        const dia    = indiceDia(h);

        clon.querySelector('.horario-avatar').textContent       = doctor ? `${doctor.nombres[0]}${doctor.apellidos[0]}`.toUpperCase() : '?';
        clon.querySelector('.horario-nombre').textContent       = doctor ? `Dr(a). ${doctor.nombres} ${doctor.apellidos}` : 'No asignado';
        clon.querySelector('.horario-especialidad').textContent = doctor && doctor.especialidad ? doctor.especialidad.nombre : 'General';
        clon.querySelector('.horario-dia').textContent          = dia === -1 ? h.diaSemana : DIAS_LARGOS[dia];
        clon.querySelector('.horario-turno').textContent        = etiquetaTurno(h.horaInicio, h.horaFin);
        clon.querySelector('.horario-horas').textContent        = `${formatearHora(h.horaInicio)} - ${formatearHora(h.horaFin)}`;
        clon.querySelector('.horario-duracion').textContent     = `Duración: ${textoDuracion(h.horaInicio, h.horaFin)}`;
        clon.querySelector('.tarifa-precio').textContent        = precio ? Formato.moneda(precio.monto) : 'Sin tarifa';

        clon.querySelector('.btn-del-horario').addEventListener('click', () => {
            eliminarHorario(h.idHorario);
        });

        lista.appendChild(clon);
    }

    document.getElementById('textoMostradas').textContent = visibles.length;
    document.getElementById('textoTotal').textContent     = horariosFiltrados.length;
    dibujarPaginacion(document.getElementById('paginacion'), paginaActual, totalPaginas, mostrarPagina);
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
        doctoresActivos = doctores;
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
 * Muestra los datos del médico elegido (especialidad y tarifa) debajo del selector.
 */
function configurarResumenDoctor() {
    const selector = document.getElementById('selectDoctor');
    const resumen  = document.getElementById('resumenDoctor');

    const mostrar = async () => {
        const doctor = doctoresActivos.find((d) => String(d.idDoctor) === selector.value);

        if (!doctor) {
            resumen.classList.add('oculto');
            return;
        }

        document.getElementById('resumenDoctorIniciales').textContent    = `${doctor.nombres[0]}${doctor.apellidos[0]}`.toUpperCase();
        document.getElementById('resumenDoctorNombre').textContent       = `Dr(a). ${doctor.nombres} ${doctor.apellidos}`;
        document.getElementById('resumenDoctorEspecialidad').textContent = doctor.especialidad ? doctor.especialidad.nombre : 'Sin especialidad asignada';
        document.getElementById('resumenDoctorTarifa').textContent       = '...';
        resumen.classList.remove('oculto');

        const precio = doctor.especialidad ? await tarifaDe(doctor.especialidad.idEspecialidad) : null;

        // Si el usuario cambió de médico mientras cargaba, no se pisa el dato
        if (selector.value === String(doctor.idDoctor)) {
            document.getElementById('resumenDoctorTarifa').textContent = precio ? Formato.moneda(precio.monto) : 'Sin tarifa';
        }
    };

    selector?.addEventListener('change', mostrar);
    document.getElementById('horarioForm')?.addEventListener('reset', () => setTimeout(mostrar));
}

/**
 * Botón "Seleccionar todos" y contador de días marcados.
 */
function configurarSeleccionDias() {
    const casillas = () => Array.from(document.querySelectorAll('input[name="diasSemana"]'));
    const boton    = document.getElementById('btnTodosDias');
    const contador = document.getElementById('contadorDias');

    const actualizar = () => {
        const marcados = casillas().filter((c) => c.checked).length;

        if (marcados === 0) {
            contador.textContent = 'Ningún día seleccionado';
        } else {
            contador.textContent = `${marcados} ${marcados === 1 ? 'día seleccionado' : 'días seleccionados'} para este profesional`;
        }

        boton.textContent = marcados === casillas().length ? 'Quitar todos' : 'Seleccionar todos (Lun-Sáb)';
    };

    boton?.addEventListener('click', () => {
        const marcarTodos = casillas().some((c) => !c.checked);
        casillas().forEach((c) => { c.checked = marcarTodos; });
        actualizar();
    });

    casillas().forEach((c) => c.addEventListener('change', actualizar));
    document.getElementById('horarioForm')?.addEventListener('reset', () => setTimeout(actualizar));
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