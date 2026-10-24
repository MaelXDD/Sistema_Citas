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
   REPORTE 1: CITAS E INGRESOS POR DOCTOR
   ========================================================================== */
function inicializarReporteDoctores() {
    const tbody = document.getElementById('tablaEstadisticasBody');
    const btnBuscar = document.getElementById('btnBuscarEstadisticas');
    const btnPdf = document.getElementById('btnDescargarReporteDocs');
    const btnLimpiar = document.getElementById('btnLimpiarFiltrosDocs');

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

            tbody.replaceChildren();
            const plantilla = document.getElementById('tpl-fila-reporte-doc');

            datos.forEach((item, index) => {
                const clon = plantilla.content.cloneNode(true);
                clon.querySelector('.col-num').textContent = index + 1;
                clon.querySelector('.col-nombre').textContent = `${item.nombres} ${item.apellidos}`;
                clon.querySelector('.col-esp').textContent = item.especialidad;
                clon.querySelector('.col-total').textContent = item.totalCitas;
                clon.querySelector('.col-ingresos').textContent = Formato.moneda(item.ingresos);
                tbody.appendChild(clon);
            });
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

    const consultar = async () => {
        const idEspecialidad = document.getElementById('filtroEspecialidadPacientes').value;

        if (!idEspecialidad) {
            Notificacion.advertencia('Filtro requerido', 'Por favor selecciona una especialidad para consultar los pacientes.');
            return;
        }

        renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Cargando listado de pacientes...');

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

            tbody.replaceChildren();
            const plantilla = document.getElementById('tpl-fila-reporte-pac');

            datos.forEach((item, index) => {
                const nombre = item.nombrePaciente
                    ?? `${item.nombres ?? ''} ${item.apellidos ?? ''}`.trim();
                const citas = item.cantidadCitas ?? item.totalCitas;
                const total = item.totalPagado ?? item.totalPagos;

                const clon = plantilla.content.cloneNode(true);
                clon.querySelector('.col-num').textContent = index + 1;
                clon.querySelector('.col-nombre').textContent = nombre;
                clon.querySelector('.col-citas').textContent = citas;
                clon.querySelector('.col-total').textContent = Formato.moneda(total);
                tbody.appendChild(clon);
            });
        } catch (e) {
            console.error('Error pacientes-especialidad:', e);
            renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Error al obtener la información de pacientes.', true);
        }
    };

    btnBuscar?.addEventListener('click', consultar);

    btnLimpiar?.addEventListener('click', () => {
        document.getElementById('filtroEspecialidadPacientes').value = '';
        renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'Selecciona una especialidad y haz clic en Buscar.');
    });

    btnPdf?.addEventListener('click', () => {
        const id = document.getElementById('filtroEspecialidadPacientes').value;
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
            const res = await fetch(`${CONFIG.API_URL}/reportes/afluencia`, {
                headers: { 'Accept': 'application/json' }
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);

            let datos = await res.json();

            // El endpoint no filtra, así que se filtra aquí
            if (dia) datos = datos.filter(d => d.diaSemana === dia);
            if (turno) datos = datos.filter(d => d.turno === turno);

            if (datos.length === 0) {
                renderizarMensajeEnTabla(tbody, 'tpl-msg-estadisticas', 'No se encontraron registros de afluencia para este criterio.');
                return;
            }

            tbody.replaceChildren();
            const tplFila = document.getElementById('tpl-fila-afluencia');
            const tplDetalle = document.getElementById('tpl-detalle-afluencia');

            datos.forEach(item => {
                const clonFila = tplFila.content.cloneNode(true);
                const trPrincipal = clonFila.querySelector('tr');

                trPrincipal.querySelector('.col-dia').textContent = item.diaSemana;
                trPrincipal.querySelector('.col-turno').textContent = item.turno;
                trPrincipal.querySelector('.col-citas').textContent = item.citasTotales;
                trPrincipal.querySelector('.col-ingresos').textContent = Formato.moneda(item.ingresosTurno);

                const clonDetalle = tplDetalle.content.cloneNode(true);
                const trDetalle = clonDetalle.querySelector('tr');
                const contenedorBadges = clonDetalle.querySelector('.contenedor-badges-acordeon');

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