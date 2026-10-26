/**
 * Funciones compartidas por las páginas de gestión (especialidades, doctores, ...):
 * horarios, tarifas, mensajes en listas y paginación.
 */
const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_LARGOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/**
 * Quita tildes y pasa a minúsculas (Miércoles -> miercoles).
 */
function sinTildes(texto) {
    return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Convierte "08:00:00" en "8:00 am".
 */
function formatearHora(hora) {
    const [horas, minutos] = String(hora).split(':').map(Number);
    const sufijo = horas >= 12 ? 'pm' : 'am';
    return `${horas % 12 || 12}:${String(minutos).padStart(2, '0')} ${sufijo}`;
}

/**
 * Convierte índices de días en texto: "Lun a Vie", "Mar, Jue y Sáb" o "Lun y Mié".
 */
function textoDeDias(indices, nombresDias) {
    const nombres = indices.map((i) => nombresDias[i]);
    const consecutivos = indices.every((dia, i) => i === 0 || dia === indices[i - 1] + 1);

    if (nombres.length >= 3 && consecutivos) return `${nombres[0]} a ${nombres[nombres.length - 1]}`;
    if (nombres.length <= 2) return nombres.join(' y ');
    return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * Agrupa los días que tienen las mismas horas.
 * Ejemplo: [{ dias: "Lun a Sáb", horas: "8:00 am - 1:00 pm / 2:00 pm - 7:00 pm" }]
 * @param {Array} horarios - Horarios con diaSemana, horaInicio y horaFin.
 * @param {Array} nombresDias - DIAS_CORTOS (por defecto) o DIAS_LARGOS.
 */
function agruparHorarios(horarios, nombresDias = DIAS_CORTOS) {
    const rangosPorDia = new Map();

    for (const h of horarios) {
        const dia = DIAS_SEMANA.indexOf(sinTildes(h.diaSemana).toUpperCase());
        if (dia === -1) continue;
        if (!rangosPorDia.has(dia)) rangosPorDia.set(dia, []);
        rangosPorDia.get(dia).push({ inicio: h.horaInicio, fin: h.horaFin });
    }

    const grupos = new Map();
    for (const dia of [...rangosPorDia.keys()].sort((a, b) => a - b)) {
        const rangos = rangosPorDia.get(dia)
            .sort((a, b) => a.inicio.localeCompare(b.inicio))
            .map((r) => `${formatearHora(r.inicio)} - ${formatearHora(r.fin)}`)
            .join(' / ');

        if (!grupos.has(rangos)) grupos.set(rangos, []);
        grupos.get(rangos).push(dia);
    }

    return [...grupos].map(([horas, dias]) => ({ dias: textoDeDias(dias, nombresDias), horas }));
}

/**
 * Igual que agruparHorarios, pero como texto: ["Lun a Sáb: 8:00 am - 1:00 pm"]
 */
function armarLineasHorario(horarios, nombresDias = DIAS_CORTOS) {
    return agruparHorarios(horarios, nombresDias).map(({ dias, horas }) => `${dias}: ${horas}`);
}

/**
 * Indica si un doctor atiende hoy según sus horarios.
 */
function atiendeHoy(horarios) {
    const hoy = DIAS_SEMANA[(new Date().getDay() + 6) % 7];
    return horarios.some((h) => sinTildes(h.diaSemana).toUpperCase() === hoy);
}

/**
 * Consulta la tarifa de una especialidad en la tabla precios.
 * @returns {Promise<Object|null>} El precio, o null si no tiene tarifa.
 */
async function consultarPrecio(idEspecialidad) {
    try {
        const respuesta = await fetch(`${CONFIG.API_URL}/precios/especialidad/${idEspecialidad}`);
        return respuesta.ok ? await respuesta.json() : null;
    } catch {
        return null;
    }
}

/**
 * Pide todos los horarios en una sola consulta y los agrupa por doctor.
 * Evita pedir los horarios de cada doctor por separado.
 * @returns {Promise<Map>} Mapa idDoctor -> lista de horarios activos.
 */
async function consultarHorariosPorDoctor() {
    const respuesta = await fetch(`${CONFIG.API_URL}/horarios`);
    if (!respuesta.ok) throw new Error();

    const porDoctor = new Map();

    (await respuesta.json()).filter(h => h.doctor && h.activo).forEach((h) => {
        const id = h.doctor.idDoctor;
        if (!porDoctor.has(id)) porDoctor.set(id, []);
        porDoctor.get(id).push(h);
    });

    return porDoctor;
}

/**
 * Muestra un mensaje dentro de una lista de tarjetas (cargando, vacío o error).
 */
function mostrarMensajeLista(lista, texto, esError = false) {
    const mensaje = document.createElement('li');
    mensaje.className = 'panel mensaje-lista';
    mensaje.classList.toggle('mensaje-error', esError);
    mensaje.textContent = texto;
    lista.replaceChildren(mensaje);
}

/**
 * Dibuja los botones Anterior, números y Siguiente.
 * @param {HTMLElement} contenedor - Donde se dibujan los botones.
 * @param {number} paginaActual - Página que se está viendo.
 * @param {number} totalPaginas - Cantidad total de páginas.
 * @param {Function} alElegir - Se llama con el número de página elegido.
 */
function dibujarPaginacion(contenedor, paginaActual, totalPaginas, alElegir) {
    contenedor.replaceChildren();

    const crearBoton = (texto, pagina, { activo = false, deshabilitado = false } = {}) => {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'pagina-boton';
        boton.textContent = texto;
        boton.disabled = deshabilitado;
        boton.classList.toggle('pagina-activa', activo);
        boton.addEventListener('click', () => alElegir(pagina));
        contenedor.appendChild(boton);
    };

    crearBoton('‹ Anterior', paginaActual - 1, { deshabilitado: paginaActual === 1 });

    for (let numero = 1; numero <= totalPaginas; numero++) {
        crearBoton(numero, numero, { activo: numero === paginaActual });
    }

    crearBoton('Siguiente ›', paginaActual + 1, { deshabilitado: paginaActual === totalPaginas });
}

/* ---------- Fechas ---------- */

/**
 * Convierte "2026-10-31" en una fecha local (sin desfase de zona horaria).
 */
function fechaDesdeIso(fechaIso) {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
}

// Minutos que dura cada cita. Es el mismo para todos: el backend solo guarda la hora de inicio
const DURACION_CITA_MINUTOS = 30;

/**
 * Indica si una cita ya terminó: pasó su hora de inicio más lo que dura la consulta.
 */
function citaYaTermino(fechaIso, hora) {
    const inicio = fechaDesdeIso(fechaIso);
    const [horas, minutos] = hora.split(':').map(Number);

    inicio.setHours(horas, minutos + DURACION_CITA_MINUTOS);
    return inicio < new Date();
}

/**
 * Convierte "2026-10-31" en "31 de octubre".
 */
function textoFecha(fechaIso) {
    return fechaDesdeIso(fechaIso).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
}

/**
 * Convierte "2026-10-31" en "Sábado 31 de octubre".
 */
function textoFechaLarga(fechaIso) {
    const texto = fechaDesdeIso(fechaIso)
        .toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
        .replace(',', '');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/* ---------- Íconos de las especialidades ---------- */
const RECURSOS_URL = 'https://hynuxxkgxzjjcpkowfhz.supabase.co/storage/v1/object/public/recursos';

// Especialidades que ya tienen ícono en Supabase (son las del index)
const ICONOS_SUPABASE = {
    cardiologia: 'cardiologia.png',
    pediatria: 'pediatria.png',
    traumatologia: 'traumatologia.png',
    dermatologia: 'dermatologia.png',
    neurologia: 'neurologia.png',
    geriatria: 'geriatria.png'
};

// Para las demás se usa un ícono de Bootstrap según una parte del nombre.
// Se toma la primera coincidencia, por eso "psico" (psicología y psicopatología) va antes que "patologia".
const ICONOS_BOOTSTRAP = {
    ginecologia: 'bi-gender-female',
    obstetricia: 'bi-gender-female',
    mastologia: 'bi-heart',
    oftalmologia: 'bi-eye',
    urologia: 'bi-droplet',
    nefrologia: 'bi-droplet',
    hematologia: 'bi-droplet-half',
    nutricion: 'bi-egg-fried',
    psico: 'bi-chat-heart',
    psiquiatria: 'bi-chat-heart',
    odontologia: 'bi-emoji-smile',
    endocrinologia: 'bi-activity',
    gastro: 'bi-capsule',
    neumologia: 'bi-lungs',
    neurocirugia: 'bi-diagram-3',
    cirugia: 'bi-scissors',
    oncologia: 'bi-radioactive',
    epidemiologia: 'bi-virus',
    infectologia: 'bi-virus2',
    patologia: 'bi-eyedropper',
    laboratorio: 'bi-eyedropper',
    reumatologia: 'bi-bandaid',
    otorrino: 'bi-soundwave',
    radiologia: 'bi-image',
    emergencia: 'bi-exclamation-triangle',
    rehabilitacion: 'bi-person-wheelchair',
    fisica: 'bi-person-wheelchair',
    familiar: 'bi-people',
    paliativ: 'bi-hearts',
    general: 'bi-clipboard2-pulse'
};

const ICONO_POR_DEFECTO = 'bi-heart-pulse';

/**
 * Pone el ícono de una especialidad dentro de su caja (.icono-caja con un <i>):
 * imagen de Supabase si existe, si no uno de Bootstrap.
 */
function mostrarIcono(caja, nombre) {
    const clave = sinTildes(nombre);

    const conImagen = Object.keys(ICONOS_SUPABASE).find((nombreIcono) => clave.includes(nombreIcono));
    if (conImagen) {
        const imagen = document.createElement('img');
        imagen.src = `${RECURSOS_URL}/${ICONOS_SUPABASE[conImagen]}`;
        imagen.alt = '';
        caja.replaceChildren(imagen);
        return;
    }

    const conBootstrap = Object.keys(ICONOS_BOOTSTRAP).find((nombreIcono) => clave.includes(nombreIcono));
    caja.querySelector('i').className = `bi ${conBootstrap ? ICONOS_BOOTSTRAP[conBootstrap] : ICONO_POR_DEFECTO}`;
}