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
 * Lógica de la fecha de nacimiento del registro (listas de día, mes y año).
 * El HTML de las listas está escrito en cada página (#reg-dia, #reg-mes, #reg-anio);
 * aquí solo se llenan los días y los años, y se calcula la fecha en AAAA-MM-DD
 * dentro del campo oculto #reg-fecha (name="fechaNac"), que es el que se envía.
 * @param {HTMLFormElement} formulario - Formulario de registro.
 */
function configurarFechaNacimiento(formulario) {
    const dia = formulario.querySelector('#reg-dia');
    const mes = formulario.querySelector('#reg-mes');
    const anio = formulario.querySelector('#reg-anio');
    const campo = formulario.querySelector('#reg-fecha');
    if (!dia || !mes || !anio || !campo) return;

    const LIMITE_ANIOS = 120;
    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;

    for (let a = anioActual; a >= anioActual - LIMITE_ANIOS; a--) {
        anio.appendChild(new Option(a, a));
    }

    // No se pueden elegir meses futuros del año actual
    const actualizarMeses = () => {
        const esAnioActual = Number(anio.value) === anioActual;
        Array.from(mes.options).forEach(opcion => {
            opcion.disabled = esAnioActual && Number(opcion.value) > mesActual;
        });
        if (mes.selectedOptions[0]?.disabled) mes.value = '';
    };

    // Ajusta los días según el mes y el año (28, 29, 30 o 31) y no admite días futuros
    const actualizarDias = () => {
        const anioBase = Number(anio.value) || 2000;
        const mesElegido = Number(mes.value);
        let limite = mesElegido ? new Date(anioBase, mesElegido, 0).getDate() : 31;

        if (Number(anio.value) === anioActual && mesElegido === mesActual) {
            limite = Math.min(limite, hoy.getDate());
        }

        const seleccionado = Number(dia.value);
        dia.replaceChildren(new Option('Día', ''));
        for (let d = 1; d <= limite; d++) dia.appendChild(new Option(d, d));
        if (seleccionado && seleccionado <= limite) dia.value = seleccionado;
    };

    const sincronizar = () => {
        campo.value = (dia.value && mes.value && anio.value)
            ? `${anio.value}-${String(mes.value).padStart(2, '0')}-${String(dia.value).padStart(2, '0')}`
            : '';
    };

    anio.addEventListener('change', () => {
        actualizarMeses();
        actualizarDias();
        sincronizar();
    });
    mes.addEventListener('change', () => {
        actualizarDias();
        sincronizar();
    });
    dia.addEventListener('change', sincronizar);

    formulario.addEventListener('reset', () => {
        campo.value = '';
        setTimeout(() => {
            actualizarMeses();
            actualizarDias();
        }, 0);
    });

    actualizarDias();
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
                    const mensaje = await leerMensajeError(res, 'Credenciales incorrectas.');
                    Notificacion.error('Acceso denegado', mensaje);
                }
            } catch {
                Notificacion.error('Error de conexión', 'No se pudo contactar al servidor.');
            }
        });
    }

    // Formulario de Registro
    const formRegistro = document.getElementById('registerForm');
    if (formRegistro) {
        configurarFechaNacimiento(formRegistro);

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
                    const mensaje = await leerMensajeError(res, 'No fue posible registrar la cuenta. Revisa tus datos e inténtalo de nuevo.');
                    Notificacion.error('Error al registrar', mensaje);
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