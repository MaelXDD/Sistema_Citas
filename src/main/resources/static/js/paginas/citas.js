let estadoReserva = {
    especialidad: null,
    doctor: null,
    horario: null,
    precio: null,
    horaSeleccionada: null,
    fechaCita: null
};

// Los horarios se piden una sola vez y se usan en los pasos 2 y 3
let horariosActivos = null;

document.addEventListener('DOMContentLoaded', () => {
    const paciente = obtenerPacienteSesion();
    if (!paciente) {
        Swal.fire({
            icon: 'info',
            title: 'Sesión requerida',
            text: 'Debes iniciar sesión para agendar una cita médica.',
            confirmButtonText: 'Iniciar Sesión'
        }).then(() => {
            window.location.href = '/index.html';
        });
        return;
    }

    configurarBotonesNavegacionPasos();
    configurarModalConfirmacion();
    cargarPasoEspecialidades();
});

/**
 * Controla los botones de retorno entre los 3 pasos.
 */
function configurarBotonesNavegacionPasos() {
    document.getElementById('btn-volver-paso1')?.addEventListener('click', () => {
        mostrarPaso(1);
    });

    document.getElementById('btn-volver-paso2')?.addEventListener('click', () => {
        mostrarPaso(2);
    });
}

/**
 * Muestra un paso y marca los indicadores (activo y completados) con clases CSS.
 * @param {number} paso - Número de paso a mostrar (1, 2 o 3).
 */
function mostrarPaso(paso) {
    [1, 2, 3].forEach((numero) => {
        document.getElementById(`paso${numero}`)?.classList.toggle('oculto', numero !== paso);

        const indicador = document.getElementById(`ind-paso${numero}`);
        indicador?.classList.toggle('activo', numero === paso);
        indicador?.classList.toggle('completado', numero < paso);
    });

    // Al cambiar de paso se vuelve arriba para ver el contenido nuevo (sobre todo en celular)
    document.querySelector('.pasos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Pide los horarios activos una sola vez.
 */
async function consultarHorariosActivos() {
    if (!horariosActivos) {
        const respuesta = await fetch(`${CONFIG.API_URL}/horarios`);
        if (!respuesta.ok) throw new Error();

        const todos = await respuesta.json();
        horariosActivos = todos.filter(h => h.doctor && h.activo);
    }
    return horariosActivos;
}

/**
 * Cuenta los doctores activos con horario de cada especialidad.
 * @returns {Promise<Map|null>} Mapa idEspecialidad -> cantidad, o null si no se pudo consultar.
 */
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

/**
 * "2 doctores disponibles", "1 doctor disponible" o "Sin doctores disponibles".
 */
function textoDoctores(cantidad) {
    if (cantidad === 0) return 'Sin doctores disponibles';
    return `${cantidad} ${cantidad === 1 ? 'doctor disponible' : 'doctores disponibles'}`;
}

/* ==========================================================================
   PASO 1: ESPECIALIDADES
   ========================================================================== */
async function cargarPasoEspecialidades() {
    const lista = document.getElementById('lista-especialidades');
    if (!lista) return;

    mostrarMensajeLista(lista, 'Cargando especialidades médicas...');

    try {
        const [respuesta, cantidades] = await Promise.all([
            fetch(`${CONFIG.API_URL}/especialidades/activas`),
            contarDoctoresPorEspecialidad()
        ]);
        if (!respuesta.ok) throw new Error();

        const especialidades = await respuesta.json();

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

            const boton = clon.querySelector('.opcion');
            const datoDoctores = clon.querySelector('.opcion-dato');

            if (cantidades) {
                const cantidad = cantidades.get(esp.idEspecialidad) ?? 0;
                clon.querySelector('.col-doctores').textContent = textoDoctores(cantidad);
                boton.disabled = cantidad === 0;
            } else {
                datoDoctores.remove();
            }

            boton.addEventListener('click', () => {
                seleccionarEspecialidad(esp);
            });

            lista.appendChild(clon);
        });
    } catch {
        mostrarMensajeLista(lista, 'Error al obtener especialidades.', true);
    }
}

async function seleccionarEspecialidad(esp) {
    estadoReserva.especialidad = esp;
    estadoReserva.precio = null;

    document.getElementById('nombre-especialidad-sel').textContent = esp.nombre;
    document.getElementById('tarifa-especialidad').textContent = '—';

    cargarPasoDoctores(esp.idEspecialidad);
    mostrarPaso(2);

    const precio = await consultarPrecio(esp.idEspecialidad);
    estadoReserva.precio = precio;
    document.getElementById('tarifa-especialidad').textContent = precio ? Formato.moneda(precio.monto) : 'Sin tarifa';
}

/* ==========================================================================
   PASO 2: DOCTORES POR ESPECIALIDAD
   ========================================================================== */
async function cargarPasoDoctores(idEspecialidad) {
    const lista = document.getElementById('lista-doctores');
    if (!lista) return;

    mostrarMensajeLista(lista, 'Buscando médicos disponibles...');

    try {
        const [respuesta, horarios] = await Promise.all([
            fetch(`${CONFIG.API_URL}/doctores/activos`),
            consultarHorariosActivos().catch(() => [])
        ]);
        if (!respuesta.ok) throw new Error();

        const todos = await respuesta.json();
        const doctores = todos.filter(d => d.especialidad && d.especialidad.idEspecialidad === idEspecialidad);

        if (doctores.length === 0) {
            mostrarMensajeLista(lista, 'No hay médicos con turnos en esta especialidad.');
            return;
        }

        lista.replaceChildren();
        const tpl = document.getElementById('tpl-fila-doctor');

        doctores.forEach((doc) => {
            const horariosDoctor = horarios.filter(h => h.doctor.idDoctor === doc.idDoctor);
            const lineas = armarLineasHorario(horariosDoctor, DIAS_LARGOS);

            const clon = tpl.content.cloneNode(true);
            clon.querySelector('.col-iniciales').textContent = `${doc.nombres[0]}${doc.apellidos[0]}`.toUpperCase();
            clon.querySelector('.col-nombre').textContent = `Dr. ${doc.nombres} ${doc.apellidos}`;
            clon.querySelector('.col-dias').textContent = lineas.length > 0 ? lineas.join('\n') : 'Sin horarios disponibles';

            const boton = clon.querySelector('.btn-elegir');
            boton.disabled = lineas.length === 0;
            boton.addEventListener('click', () => {
                seleccionarDoctor(doc);
            });

            lista.appendChild(clon);
        });
    } catch {
        mostrarMensajeLista(lista, 'Error al cargar personal médico.', true);
    }
}

function seleccionarDoctor(doc) {
    estadoReserva.doctor = doc;
    document.getElementById('nombre-doctor-sel').textContent = `${doc.nombres} ${doc.apellidos}`;

    cargarPasoHorarios(doc.idDoctor);
    mostrarPaso(3);
}

/* ==========================================================================
   PASO 3: HORARIOS DEL MÉDICO
   ========================================================================== */
async function cargarPasoHorarios(idDoctor) {
    const lista = document.getElementById('lista-horarios');
    if (!lista) return;

    mostrarMensajeLista(lista, 'Consultando horarios de atención...');

    try {
        const todos = await consultarHorariosActivos();
        const indiceDia = (h) => DIAS_SEMANA.indexOf(sinTildes(h.diaSemana).toUpperCase());

        const horarios = todos
            .filter(h => h.doctor.idDoctor === idDoctor)
            .sort((a, b) => indiceDia(a) - indiceDia(b) || a.horaInicio.localeCompare(b.horaInicio));

        if (horarios.length === 0) {
            mostrarMensajeLista(lista, 'El especialista no cuenta con horarios activos.');
            return;
        }

        lista.replaceChildren();
        const tpl = document.getElementById('tpl-fila-horario');

        horarios.forEach((h) => {
            const clon = tpl.content.cloneNode(true);
            const fecha = fechaDesdeIso(calcularProximaFechaDia(h.diaSemana));

            clon.querySelector('.col-mes').textContent = fecha.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
            clon.querySelector('.col-numero').textContent = fecha.getDate();
            clon.querySelector('.col-dia').textContent = h.diaSemana;
            clon.querySelector('.col-horas').textContent = `${Formato.horaAmPm(h.horaInicio)} - ${Formato.horaAmPm(h.horaFin)}`;

            clon.querySelector('.btn-elegir').addEventListener('click', () => {
                abrirModalConfirmacion(h);
            });

            lista.appendChild(clon);
        });
    } catch {
        mostrarMensajeLista(lista, 'Error al consultar horarios.', true);
    }
}

/* ==========================================================================
   MODAL DE CONFIRMACIÓN Y GENERACIÓN DINÁMICA DE SLOTS
   ========================================================================== */
function configurarModalConfirmacion() {
    document.getElementById('btn-cerrar-modal-cita')?.addEventListener('click', () => {
        toggleModal('modal-confirmar-cita');
    });

    document.getElementById('btnConfirmarCita')?.addEventListener('click', () => {
        if (!estadoReserva.horaSeleccionada) {
            Notificacion.advertencia('Hora requerida', 'Por favor selecciona un horario específico de atención.');
            return;
        }

        const motivo = document.getElementById('input-motivo')?.value.trim();

        // Estructura completa de la cita pendiente transferible a pago.html
        const citaPendiente = {
            paciente: obtenerPacienteSesion(),
            doctor: estadoReserva.doctor,
            especialidad: estadoReserva.especialidad,
            precio: estadoReserva.precio,
            horario: estadoReserva.horario,
            fechaCita: estadoReserva.fechaCita,
            horaCita: estadoReserva.horaSeleccionada,
            motivo: motivo || 'Consulta general'
        };

        sessionStorage.setItem('citaPendiente', JSON.stringify(citaPendiente));
        toggleModal('modal-confirmar-cita');
        window.location.href = '/pago.html';
    });
}

/**
 * Pide las horas que ya tienen cita ese día. Si falla, se muestran todas libres.
 */
async function consultarHorasOcupadas(idDoctor, fecha) {
    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/citas/ocupadas?idDoctor=${idDoctor}&fecha=${fecha}`);
        return respuesta.ok ? await respuesta.json() : [];
    } catch {
        return [];
    }
}

async function abrirModalConfirmacion(horario) {
    estadoReserva.horario = horario;
    estadoReserva.horaSeleccionada = null;

    // Calcular la fecha más próxima correspondiente a ese día de la semana
    estadoReserva.fechaCita = calcularProximaFechaDia(horario.diaSemana);

    const precio = estadoReserva.precio;

    document.getElementById('res-especialidad').textContent = estadoReserva.especialidad.nombre;
    document.getElementById('res-doctor').textContent = `Dr. ${estadoReserva.doctor.nombres} ${estadoReserva.doctor.apellidos}`;
    document.getElementById('res-dia').textContent = `${horario.diaSemana} ${textoFecha(estadoReserva.fechaCita)}`;
    document.getElementById('res-horario').textContent = `${Formato.horaAmPm(horario.horaInicio)} - ${Formato.horaAmPm(horario.horaFin)}`;
    document.getElementById('res-tarifa').textContent = precio ? Formato.moneda(precio.monto) : 'Sin tarifa';
    document.getElementById('input-motivo').value = '';
    document.getElementById('nota-duracion').textContent = `Cada cita dura ${DURACION_CITA_MINUTOS} minutos.`;
    document.getElementById('texto-seleccion').classList.add('oculto');

    const ocupadas = await consultarHorasOcupadas(estadoReserva.doctor.idDoctor, estadoReserva.fechaCita);

    generarSlotsHorarios(horario.horaInicio, horario.horaFin, ocupadas);
    toggleModal('modal-confirmar-cita');
}

/**
 * Convierte minutos desde las 00:00 en "HH:mm" (870 -> "14:30").
 */
function minutosAHora(minutos) {
    return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

/**
 * Divide el rango del turno en bloques de consulta clonando el <template id="tpl-boton-slot">.
 * Las horas que ya tienen cita salen deshabilitadas.
 */
function generarSlotsHorarios(horaInicio, horaFin, ocupadas = []) {
    const contenedor = document.getElementById('slots-horario');
    if (!contenedor) return;

    contenedor.replaceChildren();
    const tpl = document.getElementById('tpl-boton-slot');

    const [hIni, mIni] = horaInicio.split(':').map(Number);
    const [hFin, mFin] = horaFin.split(':').map(Number);

    let actual = hIni * 60 + mIni;
    const limite = hFin * 60 + mFin;
    let libres = 0;

    while (actual + DURACION_CITA_MINUTOS <= limite) {
        const textoHora = minutosAHora(actual);
        const textoFin = minutosAHora(actual + DURACION_CITA_MINUTOS);

        const clon = tpl.content.cloneNode(true);
        const boton = clon.querySelector('.slot-horario');
        boton.textContent = Formato.horaAmPm(textoHora);

        if (ocupadas.includes(textoHora)) {
            boton.disabled = true;
            boton.title = 'Esta hora ya tiene una cita';
        } else {
            libres++;
            boton.addEventListener('click', () => {
                contenedor.querySelectorAll('.slot-horario').forEach(b => b.classList.remove('seleccionado'));
                boton.classList.add('seleccionado');
                estadoReserva.horaSeleccionada = `${textoHora}:00`;

                const seleccion = document.getElementById('texto-seleccion');
                seleccion.textContent = `Tu cita: ${Formato.horaAmPm(textoHora)} - ${Formato.horaAmPm(textoFin)}`;
                seleccion.classList.remove('oculto');
            });
        }

        contenedor.appendChild(clon);
        actual += DURACION_CITA_MINUTOS;
    }

    if (libres === 0) {
        const aviso = document.createElement('p');
        aviso.className = 'aviso-slots';
        aviso.textContent = 'Ya no quedan horas libres este día. Prueba con otra fecha.';
        contenedor.appendChild(aviso);
    }
}

/**
 * Calcula la fecha calendario (YYYY-MM-DD) del próximo día indicado.
 */
function calcularProximaFechaDia(nombreDia) {
    const diasMapa = {
        'domingo': 0, 'lunes': 1, 'martes': 2, 'miercoles': 3,
        'miércoles': 3, 'jueves': 4, 'viernes': 5, 'sabado': 6, 'sábado': 6
    };

    const diaObjetivo = diasMapa[nombreDia.toLowerCase()];
    const hoy = new Date();
    const diaActual = hoy.getDay();

    let diferencia = diaObjetivo - diaActual;
    if (diferencia <= 0) {
        diferencia += 7;
    }

    const fechaProxima = new Date(hoy);
    fechaProxima.setDate(hoy.getDate() + diferencia);

    const aaaa = fechaProxima.getFullYear();
    const mm = String(fechaProxima.getMonth() + 1).padStart(2, '0');
    const dd = String(fechaProxima.getDate()).padStart(2, '0');

    return `${aaaa}-${mm}-${dd}`;
}