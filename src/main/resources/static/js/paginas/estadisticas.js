document.addEventListener('DOMContentLoaded', () => {
    // Verificación de perfil administrador
    const usuario = obtenerPacienteSesion();
    if (!usuario || usuario.rol !== 'ADMIN') {
        window.location.href = '/index.html';
        return;
    }

    configurarNavegacionGlobal();
    cargarEspecialidadesFiltros();

    // Inicializar los tres reportes
    inicializarReporteDoctores();
    inicializarReportePacientes();
    inicializarReporteAfluencia();
});

/**
 * Controla el botón de regreso de la cabecera.
 */
function configurarNavegacionGlobal() {
    document.getElementById('btnRegresarHome')?.addEventListener('click', () => {
        window.location.href = '/index.html';
    });
}

/**
 * Llena los selectores de especialidades de los reportes 1 y 2 con datos de la BD.
 */
async function cargarEspecialidadesFiltros() {
    const selDocs = document.getElementById('filtroEspecialidad');
    const selPacs = document.getElementById('filtroEspecialidadPacientes');

    try {
        const res = await fetch(`${CONFIG.API_URL}/especialidades/activas`);
        if (!res.ok) throw new Error();
        const lista = await res.json();

        lista.forEach(esp => {
            if (selDocs) {
                const opt = document.createElement('option');
                opt.value = esp.nombre;
                opt.textContent = esp.nombre;
                selDocs.appendChild(opt);
            }
            if (selPacs) {
                const opt = document.createElement('option');
                opt.value = esp.nombre;
                opt.textContent = esp.nombre;
                selPacs.appendChild(opt);
            }
        });
    } catch {
        // En caso de fallo de conexión se mantienen las opciones iniciales
    }
}

/* ==========================================================================
   REPORTE 1: CITAS E INGRESOS POR DOCTOR
   ========================================================================== */
function inicializarReporteDoctores() {
    const tbody = document.getElementById('tablaEstadisticasBody');
    const btnBuscar = document.getElementById('btnBuscarEstadisticas');
    const btnPdf = document.getElementById('btnDescargarReporteDocs');
    const btnLimpiar = document.getElementById('btnLimpiarFiltrosDocs');

    const consultar = async () => {
        const especialidad = document.getElementById('filtroEspecialidad').value;
        const estado = document.getElementById('filtroEstado').value;

        renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Consultando estadísticas de médicos...');

        try {
            const params = new URLSearchParams();
            if (especialidad) params.append('especialidad', especialidad);
            if (estado) params.append('estado', estado);

            const url = `${CONFIG.API_URL}/estadisticas/doctores-citas${params.toString() ? '?' + params.toString() : ''}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error();

            const datos = await res.json();

            if (datos.length === 0) {
                renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'No se encontraron resultados para los filtros aplicados.');
                return;
            }

            tbody.replaceChildren();
            const plantilla = document.getElementById('tpl-fila-reporte-doc');

            datos.forEach((item, index) => {
                const clon = plantilla.content.cloneNode(true);
                clon.querySelector('.col-num').textContent = index + 1;
                clon.querySelector('.col-nombre').textContent = item.nombreDoctor;
                clon.querySelector('.col-esp').textContent = item.especialidad;
                clon.querySelector('.col-total').textContent = item.totalCitas;
                clon.querySelector('.col-ingresos').textContent = Formato.moneda(item.ingresosTotales);
                tbody.appendChild(clon);
            });
        } catch {
            renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Error al cargar las estadísticas de doctores.', true);
        }
    };

    btnBuscar?.addEventListener('click', consultar);

    btnLimpiar?.addEventListener('click', () => {
        document.getElementById('filtroEspecialidad').value = '';
        document.getElementById('filtroEstado').value = '';
        renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Aplica los filtros y haz clic en Buscar.');
    });

    btnPdf?.addEventListener('click', () => {
        const esp = document.getElementById('filtroEspecialidad').value;
        const est = document.getElementById('filtroEstado').value;
        const params = new URLSearchParams();
        if (esp) params.append('especialidad', esp);
        if (est) params.append('estado', est);
        window.open(`${CONFIG.API_URL}/reportes/doctores-citas/pdf${params.toString() ? '?' + params.toString() : ''}`, '_blank');
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

    const consultar = async () => {
        const especialidad = document.getElementById('filtroEspecialidadPacientes').value;

        if (!especialidad) {
            Notificacion.advertencia('Filtro requerido', 'Por favor selecciona una especialidad para consultar los pacientes.');
            return;
        }

        renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Cargando listado de pacientes...');

        try {
            const res = await fetch(`${CONFIG.API_URL}/estadisticas/pacientes-especialidad?especialidad=${encodeURIComponent(especialidad)}`);
            if (!res.ok) throw new Error();

            const datos = await res.json();

            if (datos.length === 0) {
                renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'No hay pacientes registrados en esta especialidad.');
                return;
            }

            tbody.replaceChildren();
            const plantilla = document.getElementById('tpl-fila-reporte-pac');

            datos.forEach((item, index) => {
                const clon = plantilla.content.cloneNode(true);
                clon.querySelector('.col-num').textContent = index + 1;
                clon.querySelector('.col-nombre').textContent = item.nombrePaciente;
                clon.querySelector('.col-citas').textContent = item.cantidadCitas;
                clon.querySelector('.col-total').textContent = Formato.moneda(item.totalPagado);
                tbody.appendChild(clon);
            });
        } catch {
            renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Error al obtener la información de pacientes.', true);
        }
    };

    btnBuscar?.addEventListener('click', consultar);

    btnLimpiar?.addEventListener('click', () => {
        document.getElementById('filtroEspecialidadPacientes').value = '';
        renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Selecciona una especialidad y haz clic en Buscar.');
    });

    btnPdf?.addEventListener('click', () => {
        const esp = document.getElementById('filtroEspecialidadPacientes').value;
        const params = esp ? `?especialidad=${encodeURIComponent(esp)}` : '';
        window.open(`${CONFIG.API_URL}/reportes/pacientes-especialidad/pdf${params}`, '_blank');
    });
}

/* ==========================================================================
   REPORTE 3: CONTROL DE FLUJO Y HORARIOS CRÍTICOS (ACORDEÓN)
   ========================================================================== */
function inicializarReporteAfluencia() {
    const tbody = document.getElementById('tablaAfluenciaBody');
    const btnFiltrar = document.getElementById('btnFiltrarAfluencia');
    const btnPdf = document.getElementById('btnDescargarReporteAfluencia');
    const btnLimpiar = document.getElementById('btnLimpiarAfluencia');

    const consultar = async () => {
        const dia = document.getElementById('filtroDiaSemana').value;
        const turno = document.getElementById('filtroTurno').value;

        renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Analizando afluencia de citas y horarios...');

        try {
            const params = new URLSearchParams();
            if (dia) params.append('diaSemana', dia);
            if (turno) params.append('turno', turno);

            const url = `${CONFIG.API_URL}/estadisticas/afluencia-horarios${params.toString() ? '?' + params.toString() : ''}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error();

            const datos = await res.json();

            if (datos.length === 0) {
                renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'No se encontraron registros de afluencia para este criterio.');
                return;
            }

            tbody.replaceChildren();
            const tplFila = document.getElementById('tpl-fila-afluencia');
            const tplDetalle = document.getElementById('tpl-detalle-afluencia');

            datos.forEach(item => {
                // Clonar fila principal
                const clonFila = tplFila.content.cloneNode(true);
                const trPrincipal = clonFila.querySelector('tr');

                trPrincipal.querySelector('.col-dia').textContent = item.diaSemana;
                trPrincipal.querySelector('.col-turno').textContent = item.turno;
                trPrincipal.querySelector('.col-citas').textContent = item.citasTotales;
                trPrincipal.querySelector('.col-ingresos').textContent = Formato.moneda(item.ingresosTurno);

                // Clonar fila acordeón de detalle
                const clonDetalle = tplDetalle.content.cloneNode(true);
                const trDetalle = clonDetalle.querySelector('tr');
                const contenedorBadges = clonDetalle.querySelector('.contenedor-badges-acordeon');

                // Poblar especialidades atendidas en ese horario
                if (item.especialidadesAtendidas && item.especialidadesAtendidas.length > 0) {
                    item.especialidadesAtendidas.forEach(nombreEsp => {
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
                });

                tbody.appendChild(trPrincipal);
                tbody.appendChild(trDetalle);
            });
        } catch {
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
        if (dia) params.append('diaSemana', dia);
        if (turno) params.append('turno', turno);
        window.open(`${CONFIG.API_URL}/reportes/afluencia-horarios/pdf${params.toString() ? '?' + params.toString() : ''}`, '_blank');
    });

    consultar();
}