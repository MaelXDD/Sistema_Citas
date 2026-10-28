function obtenerPacienteSesion() {
    try {
        return JSON.parse(sessionStorage.getItem('paciente'));
    } catch {
        return null;
    }
}

/**
 * Cierra la sesión activa y redirige al inicio.
 */
function cerrarSesion() {
    sessionStorage.removeItem('paciente');
    sessionStorage.removeItem('citaPendiente');
    sessionStorage.removeItem('botToken');
    sessionStorage.removeItem('botConv');
    sessionStorage.removeItem('botLog');
    sessionStorage.removeItem('botOpen');
    window.location.href = '/index.html';
}

/**
 * Controla la visibilidad del menú de navegación y del panel de usuario según el rol.
 */
function renderizarHeaderSesion() {
    const paciente = obtenerPacienteSesion();

    const cajaInvitado = document.getElementById('caja-sesion-invitado');
    const cajaUsuario  = document.getElementById('caja-sesion-usuario');
    const spanNombre   = document.getElementById('nombre-usuario-sesion');

    // Referencias a los grupos semánticos de navegación
    const enlacesPublicos  = document.querySelectorAll('.nav-publico');
    const enlacesPacientes = document.querySelectorAll('.nav-paciente');
    const enlacesAdmin     = document.querySelectorAll('.nav-admin');

    if (paciente) {
        cajaInvitado?.classList.add('oculto');
        cajaUsuario?.classList.remove('oculto');
        if (spanNombre) spanNombre.textContent = `Hola, ${paciente.nombres}`;

        if (paciente.rol === 'ADMIN') {
            enlacesPublicos.forEach(el => el.classList.add('oculto'));
            enlacesPacientes.forEach(el => el.classList.add('oculto'));
            enlacesAdmin.forEach(el => el.classList.remove('oculto'));
        } else {
            enlacesPublicos.forEach(el => el.classList.remove('oculto'));
            enlacesPacientes.forEach(el => el.classList.remove('oculto'));
            enlacesAdmin.forEach(el => el.classList.add('oculto'));
        }
    } else {
        cajaUsuario?.classList.add('oculto');
        cajaInvitado?.classList.remove('oculto');
        enlacesPublicos.forEach(el => el.classList.remove('oculto'));
        enlacesPacientes.forEach(el => el.classList.add('oculto'));
        enlacesAdmin.forEach(el => el.classList.add('oculto'));
    }
}

/**
 * Inicializa escuchadores de login, registro y cierre de modales.
 */
function inicializarAutenticacion() {
    // Abrir modales
    document.getElementById('btn-abrir-login')?.addEventListener('click', () => {
        toggleModal('modal-login');
    });

    document.getElementById('btn-abrir-registro')?.addEventListener('click', () => {
        toggleModal('modal-registro');
    });

    // Cerrar modales con la X
    document.getElementById('btn-cerrar-login')?.addEventListener('click', () => {
        toggleModal('modal-login');
    });

    document.getElementById('btn-cerrar-registro')?.addEventListener('click', () => {
        toggleModal('modal-registro');
    });

    // Cerrar sesión
    document.getElementById('btn-cerrar-sesion')?.addEventListener('click', cerrarSesion);

    // Formulario de Inicio de Sesión
    const formLogin = document.getElementById('loginForm');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const credenciales = Object.fromEntries(new FormData(formLogin).entries());

            try {
                const res = await fetch(`${CONFIG.API_URL}/pacientes/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credenciales)
                });

                if (res.ok) {
                    const paciente = await res.json();
                    // El JWT va aparte: no se guarda dentro del objeto paciente.
                    if (paciente.token) sessionStorage.setItem('botToken', paciente.token);
                    delete paciente.token;
                    sessionStorage.setItem('paciente', JSON.stringify(paciente));
                    toggleModal('modal-login');
                    formLogin.reset();
                    renderizarHeaderSesion();
                    window.BotWidget?.refresh();

                    await Swal.fire({
                        icon: 'success',
                        title: '¡Bienvenido!',
                        text: `Has iniciado sesión como ${paciente.nombres}.`,
                        confirmButtonColor: '#004a99',
                        timer: 1800,
                        showConfirmButton: false
                    });
                } else {
                    const err = await res.json().catch(() => ({}));
                    Notificacion.error('Acceso denegado', err.mensaje || 'Credenciales incorrectas.');
                }
            } catch {
                Notificacion.error('Error de conexión', 'No se pudo contactar al servidor.');
            }
        });
    }

    // Formulario de Registro
    const formRegistro = document.getElementById('registerForm');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const datos = Object.fromEntries(new FormData(formRegistro).entries());

            try {
                const res = await fetch(`${CONFIG.API_URL}/pacientes/registrar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                });

                if (res.ok) {
                    toggleModal('modal-registro');
                    formRegistro.reset();
                    Notificacion.exito('¡Registro Exitoso!', 'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.');
                } else {
                    const err = await res.json().catch(() => ({}));
                    Notificacion.error('Error al registrar', err.mensaje || 'No fue posible registrar la cuenta.');
                }
            } catch {
                Notificacion.error('Error de red', 'No hubo respuesta del servidor.');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderizarHeaderSesion();
    inicializarAutenticacion();

    // Redirección global al inicio haciendo clic en cualquier logotipo
    document.querySelectorAll('.logotipo').forEach(logo => {
        logo.addEventListener('click', () => {
            window.location.href = '/index.html';
        });
    });
});