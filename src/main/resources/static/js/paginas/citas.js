let estadoReserva = {
    especialidad: null,
    doctor: null,
    horario: null,
    horaSeleccionada: null,
    fechaCita: null
};

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
 * Alterna la visibilidad entre los 3 pasos mediante clases CSS (.oculto y .activo).
 * Cero manipulación de style inline.
 * @param {number} paso - Número de paso a mostrar (1, 2 o 3).
 */
function mostrarPaso(paso) {
    const paso1 = document.getElementById('paso1');
    const paso2 = document.getElementById('paso2');
    const paso3 = document.getElementById('paso3');

    const ind1 = document.getElementById('ind-paso1');
    const ind2 = document.getElementById('ind-paso2');
    const ind3 = document.getElementById('ind-paso3');

    paso1?.classList.add('oculto');
    paso2?.classList.add('oculto');
    paso3?.classList.add('oculto');

    ind1?.classList.remove('activo');
    ind2?.classList.remove('activo');
    ind3?.classList.remove('activo');

    if (paso === 1) {
        paso1?.classList.remove('oculto');
        ind1?.classList.add('activo');
    } else if (paso === 2) {
        paso2?.classList.remove('oculto');
        ind2?.classList.add('activo');
    } else if (paso === 3) {
        paso3?.classList.remove('oculto');
        ind3?.classList.add('activo');
    }
}

/* ==========================================================================
   PASO 1: ESPECIALIDADES
   ========================================================================== */
async function cargarPasoEspecialidades() {
    const tbody = document.getElementById('tabla-especialidades-body');
    if (!tbody) return;

    renderizarMensajeEnTabla(tbody, 'tpl-mensaje-tabla', 'Cargando especialidades médicas...');

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/especialidades/activas`);
        if (!respuesta.ok) throw new Error();

        const especialidades = await respuesta.json();

        if (especialidades.length === 0) {
            renderizarMensajeEnTabla(tbody, 'tpl-mensaje-tabla', 'No hay especialidades disponibles.');
            return;
        }

        tbody.replaceChildren();
        const tpl = document.getElementById('tpl-fila-esp');

        especialidades.forEach((esp, index) => {
            const clon = tpl.content.cloneNode(true);
            clon.querySelector('.col-indice').textContent = index + 1;
            clon.querySelector('.col-nombre').textContent = esp.nombre;
            clon.querySelector('.col-descripcion').textContent = esp.descripcion || 'Atención integral especializada.';

            clon.querySelector('.btn-seleccionar').addEventListener('click', () => {
                seleccionarEspecialidad(esp);
            });

            tbody.appendChild(clon);
        });
    } catch {
        renderizarMensajeEnTabla(tbody, 'tpl-mensaje-tabla', 'Error al obtener especialidades.', true);
    }
}

function seleccionarEspecialidad(esp) {
    estadoReserva.especialidad = esp;
    const spanNombre = document.getElementById('nombre-especialidad-sel');
    if (spanNombre) spanNombre.textContent = esp.nombre;

    cargarPasoDoctores(esp.idEspecialidad);
    mostrarPaso(2);
}

/* ==========================================================================
   PASO 2: DOCTORES POR ESPECIALIDAD
   ========================================================================== */
async function cargarPasoDoctores(idEspecialidad) {
    const tbody = document.getElementById('tabla-doctores-body');
    if (!tbody) return;

    renderizarMensajeEnTabla(tbody, 'tpl-mensaje-tabla', 'Buscando médicos disponibles...');

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/doctores/activos`);
        if (!respuesta.ok) throw new Error();

        const todos = await respuesta.json();
        const doctores = todos.filter(d => d.especialidad && d.especialidad.idEspecialidad === idEspecialidad);

        if (doctores.length === 0) {
            renderizarMensajeEnTabla(tbody, 'tpl-mensaje-tabla', 'No hay médicos con turnos en esta especialidad.');
            return;
        }

        tbody.replaceChildren();
        const tpl = document.getElementById('tpl-fila-doc');

        doctores.forEach((doc, index) => {
            const clon = tpl.content.cloneNode(true);
            clon.querySelector('.col-indice').textContent = index + 1;
            clon.querySelector('.col-nombre').textContent = `Dr. ${doc.nombres} ${doc.apellidos}`;
            clon.querySelector('.col-dni').textContent = doc.dni;
            clon.querySelector('.col-telefono').textContent = doc.telefono || '—';

            clon.querySelector('.btn-seleccionar').addEventListener('click', () => {
                seleccionarDoctor(doc);
            });

            tbody.appendChild(clon);
        });
    } catch {
        renderizarMensajeEnTabla(tbody, 'tpl-mensaje-tabla', 'Error al cargar personal médico.', true);
    }
}

function seleccionarDoctor(doc) {
    estadoReserva.doctor = doc;
    const spanNombre = document.getElementById('nombre-doctor-sel');
    if (spanNombre) spanNombre.textContent = `${doc.nombres} ${doc.apellidos}`;

    cargarPasoHorarios(doc.idDoctor);
    mostrarPaso(3);
}

/* ==========================================================================
   PASO 3: HORARIOS DEL MÉDICO
   ========================================================================== */
async function cargarPasoHorarios(idDoctor) {
    const tbody = document.getElementById('tabla-horarios-body');
    if (!tbody) return;

    renderizarMensajeEnTabla(tbody, 'tpl-mensaje-tabla', 'Consultando horarios de atención...');

    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/horarios`);
        if (!respuesta.ok) throw new Error();

        const todos = await respuesta.json();
        const horarios = todos.filter(h => h.doctor && h.doctor.idDoctor === idDoctor && h.activo);

        if (horarios.length === 0) {
            renderizarMensajeEnTabla(tbody, 'tpl-mensaje-tabla', 'El especialista no cuenta con horarios activos.');
            return;
        }

        tbody.replaceChildren();
        const tpl = document.getElementById('tpl-fila-horario');

        horarios.forEach(h => {
            const clon = tpl.content.cloneNode(true);
            clon.querySelector('.col-dia').textContent = h.diaSemana;
            clon.querySelector('.col-inicio').textContent = Formato.horaAmPm(h.horaInicio);
            clon.querySelector('.col-fin').textContent = Formato.horaAmPm(h.horaFin);

            clon.querySelector('.btn-reservar').addEventListener('click', () => {
                abrirModalConfirmacion(h);
            });

            tbody.appendChild(clon);
        });
    } catch {
        renderizarMensajeEnTabla(tbody, 'tpl-mensaje-tabla', 'Error al consultar horarios.', true);
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

function abrirModalConfirmacion(horario) {
    estadoReserva.horario = horario;
    estadoReserva.horaSeleccionada = null;

    // Calcular la fecha más próxima correspondiente a ese día de la semana
    estadoReserva.fechaCita = calcularProximaFechaDia(horario.diaSemana);

    document.getElementById('res-especialidad').textContent = estadoReserva.especialidad.nombre;
    document.getElementById('res-doctor').textContent = `Dr. ${estadoReserva.doctor.nombres} ${estadoReserva.doctor.apellidos}`;
    document.getElementById('res-dia').textContent = `${horario.diaSemana.toUpperCase()} (${estadoReserva.fechaCita})`;
    document.getElementById('res-horario').textContent = `${Formato.horaAmPm(horario.horaInicio)} - ${Formato.horaAmPm(horario.horaFin)}`;

    generarSlotsHorarios(horario.horaInicio, horario.horaFin);
    toggleModal('modal-confirmar-cita');
}

/**
 * Divide el rango del turno en bloques de consulta clonando el <template id="tpl-boton-slot">.
 * Cero inyección de HTML con innerHTML.
 */
function generarSlotsHorarios(horaInicio, horaFin) {
    const contenedor = document.getElementById('slots-horario');
    if (!contenedor) return;

    contenedor.replaceChildren();
    const tpl = document.getElementById('tpl-boton-slot');

    const [hIni, mIni] = horaInicio.split(':').map(Number);
    const [hFin, mFin] = horaFin.split(':').map(Number);

    let actual = hIni * 60 + mIni;
    const limite = hFin * 60 + mFin;
    const duracionSlot = 30; // Minutos estándar por bloque de consulta

    while (actual + duracionSlot <= limite) {
        const hBloque = Math.floor(actual / 60);
        const mBloque = actual % 60;
        const textoHora = `${String(hBloque).padStart(2, '0')}:${String(mBloque).padStart(2, '0')}`;

        const clon = tpl.content.cloneNode(true);
        const boton = clon.querySelector('.slot-horario');
        boton.textContent = Formato.horaAmPm(textoHora);

        boton.addEventListener('click', () => {
            contenedor.querySelectorAll('.slot-horario').forEach(b => b.classList.remove('seleccionado'));
            boton.classList.add('seleccionado');
            estadoReserva.horaSeleccionada = `${textoHora}:00`;
        });

        contenedor.appendChild(clon);
        actual += duracionSlot;
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