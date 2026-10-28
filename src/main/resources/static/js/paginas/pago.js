let citaPendiente = null;
let temporizadorInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Validar autenticación
    const paciente = obtenerPacienteSesion();
    if (!paciente) {
        window.location.href = '/index.html';
        return;
    }

    // 2. Recuperar la cita de la sesión
    const citaGuardada = sessionStorage.getItem('citaPendiente');
    if (!citaGuardada) {
        Swal.fire({
            icon: 'warning',
            title: 'Sin cita seleccionada',
            text: 'No tienes ninguna cita médica pendiente de pago.',
            confirmButtonText: 'Ir a Sacar Cita'
        }).then(() => {
            window.location.href = '/citas.html';
        });
        return;
    }

    try {
        citaPendiente = JSON.parse(citaGuardada);
    } catch {
        sessionStorage.removeItem('citaPendiente');
        window.location.href = '/citas.html';
        return;
    }

    // 3. Pintar los datos y configurar eventos
    cargarDatosResumen();
    configurarMetodosPago();
    configurarBotonPagar();
    configurarBotonCancelar();
    configurarFormularioStripe();
    iniciarTemporizador(5); // 5 minutos de vigencia
});

function cargarDatosResumen() {
    const elEsp    = document.getElementById('pago-especialidad');
    const elDoc    = document.getElementById('pago-doctor');
    const elFecha  = document.getElementById('pago-fecha');
    const elHora   = document.getElementById('pago-hora');
    const elMotivo = document.getElementById('pago-motivo');
    const elTotal  = document.getElementById('pago-monto-total');

    if (elEsp) elEsp.textContent = citaPendiente.especialidad?.nombre || 'General';
    if (elDoc) {
        elDoc.textContent = citaPendiente.doctor
            ? `Dr. ${citaPendiente.doctor.nombres} ${citaPendiente.doctor.apellidos}`
            : 'Por asignar';
    }
    if (elFecha) elFecha.textContent = citaPendiente.fechaCita ? textoFechaLarga(citaPendiente.fechaCita) : '—';
    if (elHora) elHora.textContent = Formato.horaAmPm(citaPendiente.horaCita);
    if (elMotivo) elMotivo.textContent = citaPendiente.motivo || 'Consulta general';

    // La tarifa viene de la tabla precios; la guarda citas.js junto con la cita pendiente
    const monto = Number(citaPendiente.precio?.monto);

    if (Number.isFinite(monto) && monto > 0) {
        citaPendiente.montoTotal = monto;
        if (elTotal) elTotal.textContent = Formato.moneda(monto);
        return;
    }

    if (elTotal) elTotal.textContent = 'Sin tarifa';
    document.getElementById('btnConfirmarPago').disabled = true;
    Notificacion.advertencia('Sin tarifa', 'Esta especialidad todavía no tiene una tarifa registrada, por eso no se puede pagar. Vuelve a Sacar Cita.');
}

function configurarMetodosPago() {
    const tarjetas = document.querySelectorAll('.tarjeta-metodo');
    const inputMetodo = document.getElementById('metodo-seleccionado');

    tarjetas.forEach(tarjeta => {
        tarjeta.addEventListener('click', () => {
            tarjetas.forEach(t => t.classList.remove('seleccionado'));
            tarjeta.classList.add('seleccionado');
            if (inputMetodo) {
                inputMetodo.value = tarjeta.getAttribute('data-metodo');
            }
        });
    });
}

function configurarBotonPagar() {
    const btn = document.getElementById('btnConfirmarPago');
    const inputMetodo = document.getElementById('metodo-seleccionado');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const metodo = inputMetodo ? inputMetodo.value : '';

        if (!metodo) {
            Notificacion.advertencia('Método Requerido', 'Selecciona tu método de pago (Yape, Tarjeta o Efectivo).');
            return;
        }

        // Si elige TARJETA, abrimos el emulador interactivo de Stripe
        if (metodo === 'TARJETA') {
            const inputTitular = document.getElementById('stripe-titular');
            if (inputTitular && citaPendiente.paciente) {
                inputTitular.value = `${citaPendiente.paciente.nombres || ''} ${citaPendiente.paciente.apellidos || ''}`.trim();
            }
            toggleModal('modal-stripe');
            return;
        }

        // Si elige Yape o Efectivo, flujo directo
        const confirmado = await Notificacion.confirmar(
            '¿Confirmar pago y reserva?',
            `Monto: ${Formato.moneda(citaPendiente.montoTotal)} mediante ${metodo}.`,
            'Sí, proceder'
        );

        if (confirmado) {
            await procesarRegistroCitaYDirecto(metodo);
        }
    });
}

/**
 * Controla el formulario interactivo de la tarjeta con validaciones estrictas
 * de fecha vencida y CVC de 3 dígitos exactos.
 */
function configurarFormularioStripe() {
    const form = document.getElementById('form-tarjeta-stripe');
    if (!form) return;

    const inputNumero  = document.getElementById('stripe-num-tarjeta');
    const inputExp     = document.getElementById('stripe-exp');
    const inputCvc     = document.getElementById('stripe-cvc');
    const inputTitular = document.getElementById('stripe-titular');

    // Máscara para número de tarjeta (espacios cada 4 números)
    inputNumero?.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, '');
        valor = valor.replace(/(\d{4})(?=\d)/g, '$1 ');
        e.target.value = valor.substring(0, 19);
    });

    // Máscara para fecha de vencimiento (MM/AA)
    inputExp?.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, '');
        if (valor.length >= 2) {
            valor = valor.substring(0, 2) + '/' + valor.substring(2, 4);
        }
        e.target.value = valor.substring(0, 5);
    });

    // Filtro numérico estricto para CVC (máximo 3 dígitos)
    inputCvc?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 3);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Validación de longitud de tarjeta
        const numeroLimpio = inputNumero.value.replace(/\s+/g, '');
        if (numeroLimpio.length < 13 || numeroLimpio.length > 19) {
            Notificacion.advertencia('Número inválido', 'Ingresa un número de tarjeta válido (13 a 19 dígitos).');
            return;
        }

        // 2. Validación de formato de fecha (MM/AA)
        const expValor = inputExp.value.trim();
        if (!/^\d{2}\/\d{2}$/.test(expValor)) {
            Notificacion.advertencia('Fecha inválida', 'Usa el formato MM/AA (por ejemplo, 12/28).');
            return;
        }

        // 3. Validación de fecha no expirada
        const [mesStr, anioStr] = expValor.split('/');
        const mes = parseInt(mesStr, 10);
        const anio = parseInt('20' + anioStr, 10);

        if (mes < 1 || mes > 12) {
            Notificacion.advertencia('Mes inválido', 'El mes de vencimiento debe estar entre 01 y 12.');
            return;
        }

        const fechaActual = new Date();
        const mesActual = fechaActual.getMonth() + 1; // 1 - 12
        const anioActual = fechaActual.getFullYear();

        if (anio < anioActual || (anio === anioActual && mes < mesActual)) {
            Notificacion.advertencia('Tarjeta vencida', 'La fecha de vencimiento ingresada ya caducó.');
            return;
        }

        // 4. Validación de CVC exactamente de 3 dígitos
        const cvcLimpio = inputCvc.value.trim();
        if (cvcLimpio.length !== 3) {
            Notificacion.advertencia('CVC inválido', 'El código de seguridad debe tener exactamente 3 dígitos.');
            return;
        }

        const btnPagarStripe = document.getElementById('btn-procesar-cargo-stripe');
        btnPagarStripe.disabled = true;
        btnPagarStripe.textContent = 'Procesando cargo...';

        try {
            // 1. Guardar la cita médica en la base de datos
            const citaRegistrada = await guardarCitaEnBD('CONFIRMADA');

            // 2. Token de prueba para Stripe
            const paymentMethodId = numeroLimpio.startsWith('4000')
                ? "pm_card_chargeCustomerFail"
                : "pm_card_visa";

            // 3. Enviar al endpoint en Spring Boot
            const payloadStripe = {
                idCita: citaRegistrada.idCita,
                monto: citaPendiente.montoTotal,
                metodoPago: "TARJETA",
                paymentMethodId: paymentMethodId
            };

            const resStripe = await fetch(`${CONFIG.API_URL}/pagos/stripe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadStripe)
            });

            if (!resStripe.ok) {
                const errStripe = await resStripe.json().catch(() => ({}));
                throw new Error(errStripe.error || 'Stripe rechazó el cargo.');
            }

            toggleModal('modal-stripe');
            clearInterval(temporizadorInterval);
            sessionStorage.removeItem('citaPendiente');

            await Swal.fire({
                icon: 'success',
                title: '¡Pago con Tarjeta Aprobado!',
                confirmButtonText: 'Ver mis citas'
            });

            window.location.href = '/miscitas.html';

        } catch (error) {
            btnPagarStripe.disabled = false;
            btnPagarStripe.textContent = 'Pagar con Stripe';
            Notificacion.error('Fallo en la transacción', error.message || 'Error al procesar la tarjeta.');
        }
    });
}

/**
 * Registra citas para Efectivo o Yape
 */
async function procesarRegistroCitaYDirecto(metodo) {
    const btn = document.getElementById('btnConfirmarPago');
    btn.disabled = true;

    try {
        const estadoCita = metodo === 'EFECTIVO' ? 'PENDIENTE' : 'CONFIRMADA';
        const citaRegistrada = await guardarCitaEnBD(estadoCita);

        const payloadPago = {
            cita: { idCita: citaRegistrada.idCita },
            monto: citaPendiente.montoTotal,
            metodoPago: metodo,
            estado: metodo === 'EFECTIVO' ? 'PENDIENTE' : 'PAGADO',
            fechaPago: new Date().toISOString().split('T')[0]
        };

        await fetch(`${CONFIG.API_URL}/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadPago)
        });

        clearInterval(temporizadorInterval);
        sessionStorage.removeItem('citaPendiente');

        await Swal.fire({
            icon: 'success',
            title: '¡Cita Confirmada!',
            text: `Tu cita #${citaRegistrada.idCita} ha sido registrada con éxito.`,
            confirmButtonText: 'Ver mis citas'
        });

        window.location.href = '/miscitas.html';
    } catch (error) {
        btn.disabled = false;
        Notificacion.error('Error al procesar', error.message || 'Error al procesar la cita.');
    }
}

async function guardarCitaEnBD(estado) {
    const payloadCita = {
        paciente: { idPaciente: citaPendiente.paciente.idPaciente },
        doctor: { idDoctor: citaPendiente.doctor.idDoctor },
        especialidad: { idEspecialidad: citaPendiente.especialidad.idEspecialidad },
        fechaCita: citaPendiente.fechaCita,
        horaCita: citaPendiente.horaCita,
        motivo: citaPendiente.motivo || 'Consulta general',
        estado: estado
    };

    const res = await fetch(`${CONFIG.API_URL}/citas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadCita)
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.mensaje || 'No se pudo reservar la cita médica.');
    }

    return await res.json();
}

function configurarBotonCancelar() {
    document.getElementById('btnCancelarPago')?.addEventListener('click', async () => {
        const salir = await Notificacion.confirmar(
            '¿Cancelar reserva?',
            'Si regresas, perderás el turno seleccionado.',
            'Sí, cancelar'
        );

        if (salir) {
            clearInterval(temporizadorInterval);
            sessionStorage.removeItem('citaPendiente');
            window.location.href = '/citas.html';
        }
    });
}

function iniciarTemporizador(minutos) {
    const elContador = document.getElementById('tiempo-restante');
    if (!elContador) return;

    let segundosTotales = minutos * 60;

    const actualizar = () => {
        const m = Math.floor(segundosTotales / 60);
        const s = segundosTotales % 60;
        elContador.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        if (segundosTotales <= 0) {
            clearInterval(temporizadorInterval);
            sessionStorage.removeItem('citaPendiente');
            Swal.fire({
                icon: 'error',
                title: 'Tiempo agotado',
                text: 'El tiempo límite para pagar la reserva expiró.',
                confirmButtonText: 'Volver a intentar'
            }).then(() => {
                window.location.href = '/citas.html';
            });
        }
        segundosTotales--;
    };

    actualizar();
    temporizadorInterval = setInterval(actualizar, 1000);
}