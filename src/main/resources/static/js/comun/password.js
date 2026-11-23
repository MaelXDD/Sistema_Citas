(function () {
    const REQUISITOS = {
        longitud:  p => p.length >= 8,
        mayuscula: p => /[A-ZÁÉÍÓÚÑ]/.test(p),
        minuscula: p => /[a-záéíóúñ]/.test(p),
        numero:    p => /\d/.test(p),
        simbolo:   p => /[^A-Za-z0-9áéíóúñÁÉÍÓÚÑ\s]/.test(p)
    };

    function evaluar(password) {
        const resultado = {};
        for (const [clave, regla] of Object.entries(REQUISITOS)) {
            resultado[clave] = regla(password);
        }
        return resultado;
    }

    function cumpleTodo(password) {
        return Object.values(evaluar(password)).every(Boolean);
    }

    function ocultarPasswords() {
        document.querySelectorAll('.campo-password input').forEach(i => i.type = 'password');
        document.querySelectorAll('.btn-ver-password i').forEach(i => i.className = 'bi bi-eye');
        document.querySelectorAll('.btn-ver-password').forEach(b => b.setAttribute('aria-label', 'Mostrar contraseña'));
    }

    // Botón ver / ocultar contraseña
    document.addEventListener('click', (e) => {
        const boton = e.target.closest('.btn-ver-password');
        if (!boton) return;

        const input = boton.parentElement.querySelector('input');
        const icono = boton.querySelector('i');
        const mostrar = input.type === 'password';

        input.type = mostrar ? 'text' : 'password';
        icono.className = mostrar ? 'bi bi-eye-slash' : 'bi bi-eye';
        boton.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });

    // Validación en vivo: check verde por cada requisito cumplido
    document.addEventListener('input', (e) => {
        if (e.target.id !== 'reg-password') return;

        const estado = evaluar(e.target.value);
        document.querySelectorAll('#requisitos-password li').forEach(li => {
            li.classList.toggle('cumplido', estado[li.dataset.req]);
        });
    });

    // Si no cumple, se bloquea el envío SIN limpiar el formulario.
    document.addEventListener('submit', (e) => {
        if (e.target.id !== 'registerForm') return;

        const input = document.getElementById('reg-password');
        if (cumpleTodo(input.value)) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        input.focus();

        if (typeof Notificacion !== 'undefined') {
            Notificacion.advertencia('Contraseña no válida', 'Revisa los requisitos marcados debajo del campo.');
        }
    }, true);

    // Tras un login o registro exitoso, se limpian los checks
    document.addEventListener('reset', (e) => {
        if (e.target.id === 'registerForm' || e.target.id === 'loginForm') {
            document.querySelectorAll('#requisitos-password li').forEach(li => li.classList.remove('cumplido'));
            ocultarPasswords();
        }
    });

    // Al cerrar un modal con la X, se vuelve a ocultar la contraseña
    document.addEventListener('click', (e) => {
        if (e.target.closest('.cerrar-ventana')) ocultarPasswords();
    });
})();