package utp.citas.citas.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import utp.citas.citas.model.Cita;
import utp.citas.citas.model.Pago;
import utp.citas.citas.repository.CitaRepository;
import utp.citas.citas.repository.PagoRepository;
import utp.citas.citas.service.PagoService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@Transactional
public class PagoServiceImpl implements PagoService {

    // Estados como constantes para evitar typos (sin usar enums externos)
    private static final String ESTADO_PAGO_COMPLETADO = "COMPLETADO";
    private static final String ESTADO_CITA_PENDIENTE  = "PENDIENTE";
    private static final String ESTADO_CITA_CONFIRMADA = "CONFIRMADA";

    private final PagoRepository pagoRepository;
    private final CitaRepository citaRepository;

    // Inyección por constructor
    public PagoServiceImpl(PagoRepository pagoRepository,
                           CitaRepository citaRepository) {
        this.pagoRepository = pagoRepository;
        this.citaRepository = citaRepository;
    }

    /**
     * Registra un nuevo pago.
     * LÓGICA DE NEGOCIO CLAVE: Si el pago llega con estadoPago = 'COMPLETADO',
     * busca la Cita asociada y cambia su estado de 'PENDIENTE' a 'CONFIRMADA'.
     */
    @Override
    public Pago registrarPago(Pago pago) {
        // 1. Validar que la Cita existe
        Cita cita = citaRepository.findById(pago.getCita().getIdCita())
                .orElseThrow(() -> new NoSuchElementException(
                        "Cita no encontrada con id: " + pago.getCita().getIdCita()));

        // 2. Verificar que la cita no tenga ya un pago registrado
        pagoRepository.findByCita_IdCita(cita.getIdCita()).ifPresent(p -> {
            throw new IllegalStateException(
                    "La cita con id " + cita.getIdCita() + " ya tiene un pago registrado (id pago: " + p.getIdPago() + ")");
        });

        // 3. Asociar la entidad Cita completa al pago
        pago.setCita(cita);
        pago.setFechaPago(LocalDateTime.now());

        // 4. LÓGICA OMNICANAL: Si el pago viene COMPLETADO, confirmar la cita
        if (ESTADO_PAGO_COMPLETADO.equalsIgnoreCase(pago.getEstadoPago())) {
            confirmarCitaSiPendiente(cita);
        }

        return pagoRepository.save(pago);
    }

    @Override
    @Transactional(readOnly = true)
    public Pago buscarPorId(Integer id) {
        return pagoRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Pago no encontrado con id: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public Pago buscarPorCita(Integer idCita) {
        return pagoRepository.findByCita_IdCita(idCita)
                .orElseThrow(() -> new NoSuchElementException(
                        "No se encontró pago para la cita con id: " + idCita));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Pago> listarPorPaciente(Integer idPaciente) {
        return pagoRepository.findByPaciente(idPaciente);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Pago> listarPorEstado(String estadoPago) {
        return pagoRepository.findByEstadoPago(estadoPago.toUpperCase());
    }

    /**
     * Permite actualizar el estado de un pago existente (ej: webhook de Yape/Pasarela).
     * Si el nuevo estado es 'COMPLETADO', también confirma la cita.
     */
    @Override
    public Pago actualizarEstado(Integer idPago, String nuevoEstado) {
        Pago pago = buscarPorId(idPago);
        String estadoAnterior = pago.getEstadoPago();

        pago.setEstadoPago(nuevoEstado.toUpperCase());
        pago.setFechaPago(LocalDateTime.now());

        // Solo confirmar la cita si AHORA pasa a COMPLETADO (evitar doble confirmación)
        if (ESTADO_PAGO_COMPLETADO.equalsIgnoreCase(nuevoEstado)
                && !ESTADO_PAGO_COMPLETADO.equalsIgnoreCase(estadoAnterior)) {
            confirmarCitaSiPendiente(pago.getCita());
        }

        return pagoRepository.save(pago);
    }

    // ─── Método privado reutilizable ─────────────────────────────────────────

    /**
     * Cambia el estado de la Cita a 'CONFIRMADA' solo si actualmente está 'PENDIENTE'.
     * Esto protege contra cambios de estado incorrectos (ej: no se puede "confirmar"
     * una cita ya CANCELADA o ATENDIDA).
     */
    private void confirmarCitaSiPendiente(Cita cita) {
        if (ESTADO_CITA_PENDIENTE.equalsIgnoreCase(cita.getEstado())) {
            cita.setEstado(ESTADO_CITA_CONFIRMADA);
            citaRepository.save(cita);
        }
        // Si la cita ya estaba en otro estado, no lanzamos error — el pago igual se guarda.
        // Esta decisión de negocio puede ajustarse según requerimiento del hospital.
    }
}
