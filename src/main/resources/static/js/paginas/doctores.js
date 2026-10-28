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
    configurarFiltros();
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

const DOCTORES_POR_PAGINA = 5;
let listaDoctores = [];
let doctoresFiltrados = [];
let paginaActual = 1;

/**
 * Muestra un mensaje en la lista y deja la paginación en cero.
 */
function mostrarMensajeDoctores(texto, esError = false) {
    mostrarMensajeLista(document.getElementById('listaDoctores'), texto, esError);

    document.getElementById('paginacion').replaceChildren();
    document.getElementById('textoMostradas').textContent = '0';
    document.getElementById('textoTotal').textContent = '0';
}

/**
 * Obtiene los médicos activos con sus horarios y la tarifa de su especialidad.
 */
async function cargarDoctores() {
    if (!document.getElementById('listaDoctores')) return;

    mostrarMensajeDoctores('Cargando personal médico...');

    try {
        // Los doctores y todos los horarios se piden a la vez, en dos consultas en total
        const [respuesta, horariosPorDoctor] = await Promise.all([
            fetch(`${CONFIG.API_URL}/doctores/activos`),
            consultarHorariosPorDoctor().catch(() => new Map())
        ]);
        if (!respuesta.ok) throw new Error();

        const doctores = await respuesta.json();

        if (doctores.length === 0) {
            listaDoctores = [];
            mostrarResumen();
            mostrarMensajeDoctores('No hay doctores registrados actualmente.');
            return;
        }

        // Una sola consulta de tarifa por especialidad
        const tarifas = new Map();
        const tarifaDe = (idEspecialidad) => {
            if (!tarifas.has(idEspecialidad)) tarifas.set(idEspecialidad, consultarPrecio(idEspecialidad));
            return tarifas.get(idEspecialidad);
        };

        listaDoctores = await Promise.all(doctores.map(async (doc) => ({
            doc,
            horarios: horariosPorDoctor.get(doc.idDoctor) ?? [],
            precio: doc.especialidad ? await tarifaDe(doc.especialidad.idEspecialidad) : null
        })));

        mostrarResumen();
        aplicarFiltros(paginaActual);
    } catch {
        mostrarMensajeDoctores('Error al obtener la lista de médicos desde el servidor.', true);
    }
}

/**
 * Llena los cuadros de arriba con los datos reales de la lista.
 */
function mostrarResumen() {
    const especialidades = new Set(
        listaDoctores.filter(({ doc }) => doc.especialidad).map(({ doc }) => doc.especialidad.idEspecialidad)
    );
    const enTurno = listaDoctores.filter(({ horarios }) => atiendeHoy(horarios)).length;

    document.getElementById('resumenDoctores').textContent      = listaDoctores.length;
    document.getElementById('resumenEspecialidades').textContent = especialidades.size;
    document.getElementById('resumenEnTurno').textContent       = enTurno;
}

/**
 * Vincula el buscador y el filtro de especialidad.
 */
function configurarFiltros() {
    document.getElementById('inputBuscar')?.addEventListener('input', () => aplicarFiltros(1));
    document.getElementById('filtroEspecialidad')?.addEventListener('change', () => aplicarFiltros(1));
}

/**
 * Filtra por texto (nombre, apellido o DNI) y por especialidad, y muestra la página indicada.
 */
function aplicarFiltros(pagina = 1) {
    const texto          = sinTildes(document.getElementById('inputBuscar').value.trim());
    const idEspecialidad = document.getElementById('filtroEspecialidad').value;

    doctoresFiltrados = listaDoctores.filter(({ doc }) => {
        const coincideTexto = sinTildes(`${doc.nombres} ${doc.apellidos} ${doc.dni}`).includes(texto);
        const coincideEsp   = !idEspecialidad || String(doc.especialidad?.idEspecialidad) === idEspecialidad;
        return coincideTexto && coincideEsp;
    });

    if (doctoresFiltrados.length === 0) {
        mostrarMensajeDoctores('No se encontraron doctores con esos filtros.');
        return;
    }

    mostrarPagina(pagina);
}

/**
 * Dibuja las tarjetas de la página indicada.
 */
function mostrarPagina(pagina) {
    const totalPaginas = Math.max(1, Math.ceil(doctoresFiltrados.length / DOCTORES_POR_PAGINA));
    paginaActual = Math.min(Math.max(pagina, 1), totalPaginas);

    const inicio   = (paginaActual - 1) * DOCTORES_POR_PAGINA;
    const visibles = doctoresFiltrados.slice(inicio, inicio + DOCTORES_POR_PAGINA);

    const lista = document.getElementById('listaDoctores');
    const plantilla = document.getElementById('tpl-tarjeta-doctor');
    lista.replaceChildren();

    for (const { doc, horarios, precio } of visibles) {
        const clon = plantilla.content.cloneNode(true);

        // La foto saldrá de la base de datos cuando exista; por ahora van las iniciales
        clon.querySelector('.doctor-foto').textContent         = `${doc.nombres[0]}${doc.apellidos[0]}`.toUpperCase();
        clon.querySelector('.doctor-especialidad').textContent = doc.especialidad ? doc.especialidad.nombre : 'Sin asignar';
        clon.querySelector('.doctor-dni').textContent          = `DNI: ${doc.dni}`;
        clon.querySelector('.doctor-nombre').textContent       = `Dr(a). ${doc.nombres} ${doc.apellidos}`;
        clon.querySelector('.doctor-correo').textContent       = doc.correo;
        clon.querySelector('.doctor-telefono').textContent     = doc.telefono || '—';
        clon.querySelector('.tarifa-precio').textContent       = precio ? Formato.moneda(precio.monto) : 'Sin tarifa';

        const lineas = clon.querySelector('.turnos-lineas');
        const grupos = agruparHorarios(horarios, DIAS_LARGOS);

        if (grupos.length === 0) {
            lineas.textContent = 'Sin horarios registrados';
        }

        for (const { dias, horas } of grupos) {
            const bloque = document.createElement('p');
            const diasTexto = document.createElement('strong');
            const horasTexto = document.createElement('span');

            diasTexto.textContent = dias;
            horasTexto.textContent = horas;
            bloque.append(diasTexto, horasTexto);
            lineas.appendChild(bloque);
        }

        clon.querySelector('.btn-edit').addEventListener('click', () => {
            prepararEdicionDoctor(doc);
        });

        clon.querySelector('.btn-del').addEventListener('click', () => {
            darDeBajaDoctor(doc.idDoctor);
        });

        lista.appendChild(clon);
    }

    document.getElementById('textoMostradas').textContent = visibles.length;
    document.getElementById('textoTotal').textContent     = doctoresFiltrados.length;
    dibujarPaginacion(document.getElementById('paginacion'), paginaActual, totalPaginas, mostrarPagina);
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

        const filtro = document.getElementById('filtroEspecialidad');

        especialidades.forEach(esp => {
            const opt = document.createElement('option');
            opt.value = esp.idEspecialidad;
            opt.textContent = esp.nombre;
            selector.appendChild(opt);

            filtro?.appendChild(opt.cloneNode(true));
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