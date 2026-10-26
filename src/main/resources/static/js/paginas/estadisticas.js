const FILAS_POR_PAGINA = 5;
const ICONOS_TURNO = { 'Mañana': 'bi-sun', 'Tarde': 'bi-moon-stars' };

document.addEventListener('DOMContentLoaded', () => {
    // Verificación de perfil administrador
    const usuario = obtenerPacienteSesion();
    if (!usuario || usuario.rol !== 'ADMIN') {
        window.location.href = '/index.html';
        return;
    }

    configurarNavegacionGlobal();
    cargarEspecialidadesFiltros();

    inicializarReporteDoctores();
    inicializarReportePacientes();
    inicializarReporteAfluencia();
});

function configurarNavegacionGlobal() {
    document.getElementById('btnRegresarHome')?.addEventListener('click', () => {
        window.location.href = '/index.html';
    });
}

/**
 * Llena los selectores de especialidades. El value es el ID (lo que espera el backend).
 */
async function cargarEspecialidadesFiltros() {
    const selDocs = document.getElementById('filtroEspecialidad');
    const selPacs = document.getElementById('filtroEspecialidadPacientes');

    try {
        const res = await fetch(`${CONFIG.API_URL}/especialidades/activas`);
        if (!res.ok) throw new Error();
        const lista = await res.json();

        lista.forEach(esp => {
            const id = esp.idEspecialidad ?? esp.id;
            [selDocs, selPacs].forEach(sel => {
                if (!sel) return;
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = esp.nombre;
                sel.appendChild(opt);
            });
        });
    } catch {
        // Si falla, se mantienen las opciones iniciales
    }
}

/* ==========================================================================
   PIEZAS COMPARTIDAS POR LOS TRES REPORTES
   ========================================================================== */

/** Suma los valores de una lista ya normalizada. */
function sumar(lista, campo) {
    return lista.reduce((total, item) => total + Number(item[campo] ?? 0), 0);
}

/** Escribe un texto dentro de un elemento por su id. */
function escribir(id, texto) {
    document.getElementById(id).textContent = texto;
}

/** Deja las tarjetas en blanco: "—" en las cifras y vacío en los textos de apoyo. */
function limpiarResumen(cifras, apoyos = []) {
    cifras.forEach(id => escribir(id, '—'));
    apoyos.forEach(id => escribir(id, ''));
}

/**
 * Tabla con 5 filas por página. Dibuja las filas, el "Mostrando X de Y" y los botones.
 * @param {Object} config - tbody, plantilla, ids del texto y de los botones, y llenarFila(clon, item, numero).
 */
function crearTablaPaginada({ tbody, plantilla, idMostradas, idTotal, idBotones, llenarFila }) {
    const botones = document.getElementById(idBotones);
    let datos = [];

    const dibujar = (pagina) => {
        const totalPaginas = Math.max(1, Math.ceil(datos.length / FILAS_POR_PAGINA));
        const inicio = (pagina - 1) * FILAS_POR_PAGINA;
        const visibles = datos.slice(inicio, inicio + FILAS_POR_PAGINA);

        tbody.replaceChildren();
        visibles.forEach((item, indice) => {
            const clon = plantilla.content.cloneNode(true);
            llenarFila(clon, item, inicio + indice + 1);
            tbody.appendChild(clon);
        });

        escribir(idMostradas, datos.length === 0 ? 0 : `${inicio + 1} - ${inicio + visibles.length}`);
        escribir(idTotal, datos.length);
        dibujarPaginacion(botones, pagina, totalPaginas, dibujar);
    };

    return {
        mostrar(nuevosDatos) {
            datos = nuevosDatos;
            dibujar(1);
        },
        vaciar() {
            datos = [];
            escribir(idMostradas, 0);
            escribir(idTotal, 0);
            botones.replaceChildren();
        }
    };
}

/* ==========================================================================
   REPORTE 1: CITAS E INGRESOS POR DOCTOR
   ========================================================================== */
function inicializarReporteDoctores() {
    const tbody = document.getElementById('tablaEstadisticasBody');
    const btnBuscar = document.getElementById('btnBuscarEstadisticas');
    const btnPdf = document.getElementById('btnDescargarReporteDocs');
    const btnLimpiar = document.getElementById('btnLimpiarFiltrosDocs');

    const CIFRAS = ['resumenCitas', 'resumenIngresos', 'resumenMayorDemanda', 'resumenDoctores'];
    const APOYOS = ['resumenMayorDemandaDetalle'];

    const tabla = crearTablaPaginada({
        tbody,
        plantilla: document.getElementById('tpl-fila-reporte-doc'),
        idMostradas: 'textoMostradasDoctores',
        idTotal: 'textoTotalDoctores',
        idBotones: 'paginacionDoctores',
        llenarFila: (clon, item, numero) => {
            clon.querySelector('.col-num').textContent = numero;
            clon.querySelector('.col-iniciales').textContent = `${item.nombres?.[0] ?? ''}${item.apellidos?.[0] ?? ''}`.toUpperCase();
            clon.querySelector('.col-nombre').textContent = `${item.nombres} ${item.apellidos}`;
            clon.querySelector('.col-esp').textContent = item.especialidad;
            clon.querySelector('.col-total').textContent = item.totalCitas;
            clon.querySelector('.col-ingresos').textContent = Formato.moneda(item.ingresos);
        }
    });

    const mostrarResumen = (datos) => {
        escribir('resumenCitas', sumar(datos, 'totalCitas'));
        escribir('resumenIngresos', Formato.moneda(sumar(datos, 'ingresos')));
        escribir('resumenDoctores', datos.length);

        const mayor = datos.reduce((a, b) => (b.totalCitas > a.totalCitas ? b : a), datos[0]);
        if (mayor.totalCitas > 0) {
            escribir('resumenMayorDemanda', `${mayor.nombres} ${mayor.apellidos}`);
            escribir('resumenMayorDemandaDetalle', `${mayor.especialidad} · ${mayor.totalCitas} citas`);
        } else {
            limpiarResumen(['resumenMayorDemanda'], APOYOS);
        }
    };

    const armarParametros = () => {
        const idEspecialidad = document.getElementById('filtroEspecialidad').value;
        const estado = document.getElementById('filtroEstado').value;
        const params = new URLSearchParams();
        if (idEspecialidad) params.append('idEspecialidad', idEspecialidad);
        if (estado) params.append('estado', estado);
        return params.toString() ? '?' + params.toString() : '';
    };

    const consultar = async () => {
        renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Consultando estadísticas de médicos...');
        tabla.vaciar();
        limpiarResumen(CIFRAS, APOYOS);

        try {
            const res = await fetch(`${CONFIG.API_URL}/reportes/estadisticas/doctores-citas${armarParametros()}`, {
                headers: { 'Accept': 'application/json' }
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);

            const datos = await res.json();

            if (datos.length === 0) {
                renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'No se encontraron resultados para los filtros aplicados.');
                return;
            }

            mostrarResumen(datos);
            tabla.mostrar(datos);
        } catch (e) {
            console.error('Error doctores-citas:', e);
            renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Error al cargar las estadísticas de doctores.', true);
        }
    };

    btnBuscar?.addEventListener('click', consultar);

    btnLimpiar?.addEventListener('click', () => {
        document.getElementById('filtroEspecialidad').value = '';
        document.getElementById('filtroEstado').value = '';
        renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Aplica los filtros y haz clic en Buscar.');
        tabla.vaciar();
        limpiarResumen(CIFRAS, APOYOS);
    });

    btnPdf?.addEventListener('click', () => {
        window.open(`${CONFIG.API_URL}/reportes/estadisticas/doctores-citas/pdf${armarParametros()}`, '_blank');
    });
}

/* ==========================================================================
   REPORTE 2: PACIENTES POR ESPECIALIDAD
   ========================================================================== */
function inicializarReportePacientes() {
    const tbody = document.getElementById('tablaIngresosBody');
    const btnBuscar = document.getElementById('btnBuscarPacientesEspecialidad');
    const btnPdf = document.getElementById('btnDescargarReportePac');
    const btnLimpiar = document.getElementById('btnLimpiarFiltroPacientes');
    const selector = document.getElementById('filtroEspecialidadPacientes');

    const CIFRAS = ['resumenEspecialidadActiva', 'resumenPacientes', 'resumenCitasPacientes', 'resumenPagosPacientes'];
    const APOYOS = ['resumenTarifaBase'];

    const tabla = crearTablaPaginada({
        tbody,
        plantilla: document.getElementById('tpl-fila-reporte-pac'),
        idMostradas: 'textoMostradasPacientes',
        idTotal: 'textoTotalPacientes',
        idBotones: 'paginacionPacientes',
        llenarFila: (clon, paciente, numero) => {
            clon.querySelector('.col-num').textContent = numero;
            clon.querySelector('.col-nombre').textContent = paciente.nombre;
            clon.querySelector('.col-citas').textContent = paciente.citas;
            clon.querySelector('.col-total').textContent = Formato.moneda(paciente.total);
        }
    });

    const mostrarResumen = async (idEspecialidad, pacientes) => {
        escribir('resumenEspecialidadActiva', selector.options[selector.selectedIndex].textContent);
        escribir('resumenPacientes', pacientes.length);
        escribir('resumenCitasPacientes', sumar(pacientes, 'citas'));
        escribir('resumenPagosPacientes', Formato.moneda(sumar(pacientes, 'total')));

        const precio = await consultarPrecio(idEspecialidad);
        escribir('resumenTarifaBase', precio ? `Tarifa base: ${Formato.moneda(precio.monto)}` : 'Sin tarifa');
    };

    const consultar = async () => {
        const idEspecialidad = selector.value;

        if (!idEspecialidad) {
            Notificacion.advertencia('Filtro requerido', 'Por favor selecciona una especialidad para consultar los pacientes.');
            return;
        }

        renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Cargando listado de pacientes...');
        tabla.vaciar();
        limpiarResumen(CIFRAS, APOYOS);

        try {
            const res = await fetch(`${CONFIG.API_URL}/reportes/estadisticas/pacientes-especialidad?idEspecialidad=${encodeURIComponent(idEspecialidad)}`, {
                headers: { 'Accept': 'application/json' }
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);

            const datos = await res.json();

            if (datos.length === 0) {
                renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'No hay pacientes registrados en esta especialidad.');
                return;
            }

            const pacientes = datos.map(item => ({
                nombre: item.nombrePaciente ?? `${item.nombres ?? ''} ${item.apellidos ?? ''}`.trim(),
                citas: item.cantidadCitas ?? item.totalCitas,
                total: item.totalPagado ?? item.totalPagos
            }));

            tabla.mostrar(pacientes);
            mostrarResumen(idEspecialidad, pacientes);
        } catch (e) {
            console.error('Error pacientes-especialidad:', e);
            renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Error al obtener la información de pacientes.', true);
        }
    };

    btnBuscar?.addEventListener('click', consultar);

    btnLimpiar?.addEventListener('click', () => {
        selector.value = '';
        renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Selecciona una especialidad y haz clic en Buscar.');
        tabla.vaciar();
        limpiarResumen(CIFRAS, APOYOS);
    });

    btnPdf?.addEventListener('click', () => {
        const id = selector.value;
        if (!id) {
            Notificacion.advertencia('Filtro requerido', 'Selecciona una especialidad para descargar el PDF.');
            return;
        }
        window.open(`${CONFIG.API_URL}/reportes/pacientes-especialidad/${encodeURIComponent(id)}/pdf`, '_blank');
    });
}

/* ==========================================================================
   REPORTE 3: CONTROL DE FLUJO Y HORARIOS CRÍTICOS (ACORDEÓN)
   ========================================================================== */

/** El backend manda las especialidades como un solo texto separado por comas. */
function especialidadesDe(item) {
    return String(item.especialidades ?? '')
        .split(',')
        .map(nombre => nombre.trim())
        .filter(Boolean);
}

function inicializarReporteAfluencia() {
    const tbody = document.getElementById('tablaAfluenciaBody');
    const btnFiltrar = document.getElementById('btnFiltrarAfluencia');
    const btnPdf = document.getElementById('btnDescargarReporteAfluencia');
    const btnLimpiar = document.getElementById('btnLimpiarAfluencia');

    const CIFRAS = ['resumenTurnoConcurrido', 'resumenCitasTurnos', 'resumenEspecialidadesTurnos', 'resumenIngresosTurnos'];
    const APOYOS = ['resumenTurnoConcurridoDetalle'];

    const mostrarResumen = (datos) => {
        const concurrido = datos.reduce((a, b) => (b.totalCitas > a.totalCitas ? b : a), datos[0]);
        const especialidades = new Set(datos.flatMap(especialidadesDe));

        escribir('resumenTurnoConcurrido', `${concurrido.diaSemana} ${concurrido.turno}`);
        escribir('resumenTurnoConcurridoDetalle', `${concurrido.totalCitas} citas`);
        escribir('resumenCitasTurnos', sumar(datos, 'totalCitas'));
        escribir('resumenEspecialidadesTurnos', especialidades.size);
        escribir('resumenIngresosTurnos', Formato.moneda(sumar(datos, 'ingresosTurno')));
    };

    const consultar = async () => {
        const dia = document.getElementById('filtroDiaSemana').value;
        const turno = document.getElementById('filtroTurno').value;

        renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Analizando afluencia de citas y horarios...');
        limpiarResumen(CIFRAS, APOYOS);

        try {
            const res = await fetch(`${CONFIG.API_URL}/reportes/afluencia`, {
                headers: { 'Accept': 'application/json' }
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);

            let datos = await res.json();

            // Se compara sin tildes ni mayúsculas (Sábado = SABADO) para no perder filas
            if (dia) datos = datos.filter(d => sinTildes(d.diaSemana) === sinTildes(dia));
            if (turno) datos = datos.filter(d => sinTildes(d.turno) === sinTildes(turno));

            if (datos.length === 0) {
                renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'No se encontraron registros de afluencia para este criterio.');
                return;
            }

            mostrarResumen(datos);

            tbody.replaceChildren();
            const tplFila = document.getElementById('tpl-fila-afluencia');
            const tplDetalle = document.getElementById('tpl-detalle-afluencia');

            datos.forEach(item => {
                const clonFila = tplFila.content.cloneNode(true);
                const trPrincipal = clonFila.querySelector('tr');

                trPrincipal.querySelector('.col-dia').textContent = item.diaSemana;
                trPrincipal.querySelector('.col-turno').textContent = item.turno;
                trPrincipal.querySelector('.col-icono-turno').classList.add(ICONOS_TURNO[item.turno] ?? 'bi-clock');
                trPrincipal.querySelector('.col-citas').textContent = item.totalCitas;
                trPrincipal.querySelector('.col-ingresos').textContent = Formato.moneda(item.ingresosTurno);
                const clonDetalle = tplDetalle.content.cloneNode(true);
                const trDetalle = clonDetalle.querySelector('tr');
                const contenedorBadges = clonDetalle.querySelector('.detalle-especialidades');

                const especialidades = especialidadesDe(item);

                if (especialidades.length > 0) {
                    especialidades.forEach(nombreEsp => {
                const listaEsp = item.especialidades
                    ? item.especialidades.split(', ')
                    : [];

                if (listaEsp.length > 0) {
                    listaEsp.forEach(nombreEsp => {
                        const span = document.createElement('span');
                        span.className = 'badge-especialidad';
                        span.textContent = nombreEsp;
                        contenedorBadges.appendChild(span);
                    });
                } else {
                    const spanVacio = document.createElement('span');
                    spanVacio.className = 'texto-atenuado';
                    spanVacio.textContent = 'Sin especialidades registradas en este turno';
                    contenedorBadges.appendChild(spanVacio);
                }

                trPrincipal.addEventListener('click', () => {
                    trDetalle.classList.toggle('oculto');
                    trPrincipal.classList.toggle('abierta');
                });

                tbody.appendChild(trPrincipal);
                tbody.appendChild(trDetalle);
            });
        } catch (e) {
            console.error('Error afluencia:', e);
            renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Error al consultar el reporte de afluencia.', true);
        }
    };

    btnFiltrar?.addEventListener('click', consultar);

    btnLimpiar?.addEventListener('click', () => {
        document.getElementById('filtroDiaSemana').value = '';
        document.getElementById('filtroTurno').value = '';
        consultar();
    });

    btnPdf?.addEventListener('click', () => {
        const dia = document.getElementById('filtroDiaSemana').value;
        const turno = document.getElementById('filtroTurno').value;
        const params = new URLSearchParams();
        if (dia) params.append('dia', dia);
        if (turno) params.append('turno', turno);
        window.open(`${CONFIG.API_URL}/reportes/consulta3/pdf${params.toString() ? '?' + params.toString() : ''}`, '_blank');
    });

    consultar();
}