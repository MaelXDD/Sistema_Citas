/**
 * Alterna la visibilidad de cualquier modal alternando las clases semánticas .activo y .oculto.
 * @param {string} modalId - Identificador del modal en el HTML.
 */
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    if (modal.classList.contains('activo')) {
        modal.classList.remove('activo');
        modal.classList.add('oculto');
    } else {
        modal.classList.remove('oculto');
        modal.classList.add('activo');
    }
}

/**
 * Los estilos de los botones se rigen por las clases en estilo.css (.swal2-confirm / .swal2-cancel).
 */
const Notificacion = {
    exito: (titulo, mensaje = '') => {
        return Swal.fire({
            icon: 'success',
            title: titulo,
            text: mensaje
        });
    },

    error: (titulo, mensaje = '') => {
        return Swal.fire({
            icon: 'error',
            title: titulo,
            text: mensaje
        });
    },

    advertencia: (titulo, mensaje = '') => {
        return Swal.fire({
            icon: 'warning',
            title: titulo,
            text: mensaje
        });
    },

    confirmar: async (titulo, mensaje, textoBoton = 'Sí, continuar') => {
        const respuesta = await Swal.fire({
            icon: 'warning',
            title: titulo,
            text: mensaje,
            showCancelButton: true,
            confirmButtonText: textoBoton,
            cancelButtonText: 'Cancelar'
        });
        return respuesta.isConfirmed;
    }
};

/**
 * Utilidades de formateo para datos de negocio.
 */
const Formato = {
    /**
     * @param {number|string} valor - Monto numérico entregado por la API.
     */
    moneda: (valor) => {
        const numero = parseFloat(valor || 0);
        return `S/ ${numero.toFixed(2)}`;
    },

    /**
     * Convierte una cadena militar de hora (HH:mm o HH:mm:ss) a formato 12 horas (hh:mm am/pm).
     * @param {string} horaStr - Hora en texto devuelta por la API.
     */
    horaAmPm: (horaStr) => {
        if (!horaStr) return '—';
        const [hh, mm] = horaStr.split(':').map(Number);
        const ampm = hh >= 12 ? 'pm' : 'am';
        const h12 = hh % 12 || 12;
        return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
    }
};

/**
 * Inserta un mensaje de estado o error en cualquier <tbody> clonando su respectivo <template>.
 * Cero concatenación de cadenas HTML.
 * @param {HTMLTableSectionElement} tbody - El elemento <tbody> receptor.
 * @param {string} templateId - ID del <template> definido en el HTML.
 * @param {string} texto - Mensaje a desplegar.
 * @param {boolean} esError - Si es true, añade la clase semántica de error.
 */
function renderizarMensajeEnTabla(tbody, templateId, texto, esError = false) {
    tbody.replaceChildren();
    const tpl = document.getElementById(templateId);
    if (!tpl) return;

    const clon = tpl.content.cloneNode(true);
    const celda = clon.querySelector('.celda-mensaje');
    if (celda) {
        celda.textContent = texto;
        celda.className = esError ? 'celda-mensaje celda-error' : 'celda-mensaje celda-estado';
    }
    tbody.appendChild(clon);
}

// Cierre global al hacer clic en el fondo oscuro
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('capa-fondo-modal') || e.target.classList.contains('modal')) {
        e.target.classList.remove('activo');
        e.target.classList.add('oculto');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-cerrar]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-cerrar');
            toggleModal(modalId);
        });
    });
});