/**
 * Widget del asistente. Solo aparece con sesión iniciada (JWT en sessionStorage.botToken).
 * Todo el texto se inserta con textContent: nunca innerHTML con contenido del bot o del usuario.
 */
(() => {
    'use strict';

    const KEY_TOKEN = 'botToken';
    const KEY_CONV = 'botConv';
    const botUrl = () => ((typeof CONFIG !== 'undefined' && CONFIG.BOT_URL) || 'http://localhost:8090').replace(/\/$/, '');
    const token = () => sessionStorage.getItem(KEY_TOKEN);
    const paciente = () => { try { return JSON.parse(sessionStorage.getItem('paciente')); } catch { return null; } };

    let root, panel, launcher, log, input, sendBtn, busy = false;

    const el = (tag, cls, text) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    };

    async function api(path, method, body) {
        let res;
        try {
            res = await fetch(botUrl() + path, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
                body: body ? JSON.stringify(body) : undefined
            });
        } catch {
            throw new Error('No pude conectar con el asistente. Inténtalo en unos minutos.');
        }
        if (res.status === 401) throw new Error('Tu sesión expiró. Inicia sesión de nuevo para usar el asistente.');
        if (res.status === 429) throw new Error('Estás escribiendo muy rápido. Espera unos segundos.');
        if (res.status === 204) return null;
        if (!res.ok) {
            let detalle = '';
            try { detalle = (await res.json()).detail; } catch { /* sin cuerpo */ }
            throw new Error(typeof detalle === 'string' && detalle ? detalle : 'El asistente no pudo responder.');
        }
        return res.json();
    }

    function scrollAbajo() { log.scrollTop = log.scrollHeight; }

    function burbuja(texto, tipo) {
        const b = el('div', 'bot-msg' + (tipo ? ' ' + tipo : ''), texto);
        log.appendChild(b);
        scrollAbajo();
        return b;
    }

    function tarjetaPendiente(accion) {
        const card = el('div', 'bot-accion');
        card.appendChild(el('p', null, accion.summary));
        const fila = el('div', 'fila');
        const si = el('button', 'bot-btn', 'Confirmar');
        const no = el('button', 'bot-btn sec', 'No, dejarlo');
        const resolver = async (aprobar) => {
            si.disabled = no.disabled = true;
            try {
                const r = await api('/actions/' + encodeURIComponent(accion.id) + '/confirm', 'POST', { approve: aprobar });
                card.remove();
                burbuja(r.text);
                (r.ui_actions || []).forEach(tarjetaUi);
            } catch (e) {
                si.disabled = no.disabled = false;
                burbuja(e.message, 'error');
            }
        };
        si.addEventListener('click', () => resolver(true));
        no.addEventListener('click', () => resolver(false));
        fila.append(si, no);
        card.appendChild(fila);
        log.appendChild(card);
        scrollAbajo();
    }

    function tarjetaUi(ui) {
        if (ui.type !== 'open_checkout' || !ui.citaPendiente) return;
        const card = el('div', 'bot-accion');
        const c = ui.citaPendiente;
        // Datos reales del sistema (doctor, especialidad, fecha, hora, precio): no lo que haya escrito el modelo.
        const detalle = ui.resumen || `${c.fechaCita}, ${String(c.horaCita).slice(0, 5)}`;
        card.appendChild(el('p', null, `Reserva lista: ${detalle}. La cita se registra al completar el pago.`));
        const ir = el('button', 'bot-btn', ui.label || 'Ir a pagar');
        ir.addEventListener('click', () => {
            sessionStorage.setItem('citaPendiente', JSON.stringify(c));   // mismo contrato que citas.js
            window.location.href = '/pago.html';
        });
        card.appendChild(ir);
        log.appendChild(card);
        scrollAbajo();
    }

    async function enviar() {
        const texto = input.value.trim();
        if (!texto || busy) return;
        busy = true; sendBtn.disabled = true;
        input.value = ''; autoAltura();
        burbuja(texto, 'yo');
        const espera = burbuja('Escribiendo…', 'espera');
        try {
            const r = await api('/chat', 'POST', { message: texto, conversation_id: sessionStorage.getItem(KEY_CONV) });
            sessionStorage.setItem(KEY_CONV, r.conversation_id);
            espera.remove();
            burbuja(r.text);
            (r.pending_actions || []).forEach(tarjetaPendiente);
            (r.ui_actions || []).forEach(tarjetaUi);
        } catch (e) {
            espera.remove();
            burbuja(e.message, 'error');
        } finally {
            busy = false; sendBtn.disabled = false; input.focus();
        }
    }

    function saludo() {
        const p = paciente();
        burbuja(`Hola${p && p.nombres ? ', ' + p.nombres : ''}. Puedo ayudarte a ver especialidades, horarios y precios, revisar tus citas, reservar o cancelar. ¿Qué necesitas?`);
    }

    function nueva() {
        sessionStorage.removeItem(KEY_CONV);
        log.replaceChildren();
        saludo();
    }

    async function borrarHistorial() {
        if (!window.confirm('Se borrará tu historial y las preferencias que el asistente recuerda de ti. ¿Continuar?')) return;
        try {
            await api('/me/data', 'DELETE');
            nueva();
            burbuja('Listo: borré tu historial y tus preferencias guardadas.');
        } catch (e) {
            burbuja(e.message, 'error');
        }
    }

    function autoAltura() {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 90) + 'px';
    }

    function abrir(v) {
        panel.hidden = !v;
        launcher.setAttribute('aria-expanded', String(v));
        if (v) { if (!log.children.length) saludo(); input.focus(); } else { launcher.focus(); }
    }

    function construir() {
        root = el('div', 'bot-root');
        launcher = el('button', 'bot-launcher', 'Asistente');
        launcher.type = 'button';
        launcher.setAttribute('aria-expanded', 'false');
        launcher.setAttribute('aria-controls', 'bot-panel');

        panel = el('section', 'bot-panel');
        panel.id = 'bot-panel';
        panel.hidden = true;
        panel.setAttribute('aria-label', 'Asistente virtual');

        const head = el('div', 'bot-head');
        head.appendChild(el('h2', null, 'Asistente de citas'));
        const bNueva = el('button', null, 'Nueva'); bNueva.type = 'button'; bNueva.title = 'Empezar una conversación nueva';
        const bBorrar = el('button', null, 'Borrar datos'); bBorrar.type = 'button'; bBorrar.title = 'Borrar mi historial y preferencias';
        const bCerrar = el('button', null, 'Cerrar'); bCerrar.type = 'button';
        head.append(bNueva, bBorrar, bCerrar);

        log = el('div', 'bot-log');
        log.setAttribute('role', 'log');
        log.setAttribute('aria-live', 'polite');

        const form = el('form', 'bot-form');
        input = el('textarea');
        input.rows = 1; input.maxLength = 1500; input.placeholder = 'Escribe tu consulta…';
        input.setAttribute('aria-label', 'Mensaje para el asistente');
        sendBtn = el('button', 'bot-btn', 'Enviar'); sendBtn.type = 'submit';
        form.append(input, sendBtn);

        panel.append(head, log, form);
        root.append(panel, launcher);
        document.body.appendChild(root);

        launcher.addEventListener('click', () => abrir(panel.hidden));
        bCerrar.addEventListener('click', () => abrir(false));
        bNueva.addEventListener('click', nueva);
        bBorrar.addEventListener('click', borrarHistorial);
        form.addEventListener('submit', (e) => { e.preventDefault(); enviar(); });
        input.addEventListener('input', autoAltura);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
        });
        root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) abrir(false); });
    }

    function refresh() {
        const conSesion = !!token();
        if (conSesion && !root) construir();
        if (root) {
            root.hidden = !conSesion;
            if (!conSesion) { abrir(false); log.replaceChildren(); }
        }
    }

    window.BotWidget = { refresh };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
    else refresh();
})();
