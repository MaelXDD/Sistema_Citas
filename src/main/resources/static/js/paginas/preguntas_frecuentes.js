document.addEventListener('DOMContentLoaded', () => {
    configurarAcordeon();
    configurarBuscador();
    configurarBotonSubir();
});

/**
 * Acordeón: al abrir una pregunta se cierran las demás.
 */
function configurarAcordeon() {
    const preguntas = document.querySelectorAll('.faq-item');

    preguntas.forEach(pregunta => {
        pregunta.addEventListener('toggle', () => {
            if (!pregunta.open) return;

            preguntas.forEach(otra => {
                if (otra !== pregunta) otra.open = false;
            });
        });
    });
}

/**
 * Buscador: filtra las preguntas mientras se escribe, sin importar
 * tildes ni mayúsculas, y oculta los temas que quedan vacíos.
 */
function configurarBuscador() {
    const campo = document.getElementById('faq-buscar');
    const sinResultados = document.getElementById('faq-sin-resultados');
    if (!campo) return;

    const normalizar = texto => (texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');

    const preguntas = Array.from(document.querySelectorAll('.faq-item'))
        .map(item => ({ item, texto: normalizar(item.textContent) }));
    const temas = document.querySelectorAll('[data-tema]');

    campo.addEventListener('input', () => {
        const termino = normalizar(campo.value.trim());
        let visibles = 0;

        preguntas.forEach(({ item, texto }) => {
            const coincide = !termino || texto.includes(termino);
            item.classList.toggle('oculto', !coincide);
            if (coincide) visibles++;
        });

        temas.forEach(tema => {
            const hayVisibles = tema.querySelector('.faq-item:not(.oculto)');
            tema.classList.toggle('oculto', !hayVisibles);
        });

        sinResultados?.classList.toggle('oculto', visibles > 0);
    });
}

/**
 * Botón de volver arriba: aparece solo después de bajar un poco.
 */
function configurarBotonSubir() {
    const boton = document.getElementById('btn-subir');
    if (!boton) return;

    const DISTANCIA_MINIMA = 400;

    const actualizar = () => {
        boton.classList.toggle('oculto', window.scrollY < DISTANCIA_MINIMA);
    };

    window.addEventListener('scroll', actualizar, { passive: true });
    boton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    actualizar();
}