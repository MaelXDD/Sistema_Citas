package utp.citas.citas.controller;

import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import utp.citas.citas.model.Cita;
import utp.citas.citas.model.Pago;
import utp.citas.citas.service.PagoService;
import utp.citas.citas.service.StripeService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**

 * Controlador REST encargado de la gestión de pagos en el sistema.
 *
 * <p>Este controlador permite registrar pagos, consultar información
 * de pagos por distintos criterios y actualizar el estado de un pago.</p>
 *
 * <p><b>Base URL:</b> /api/pagos</p>

 */
@RestController
@RequestMapping("/api/pagos")
public class PagoController {

    /**
     * Servicio que contiene la lógica de negocio relacionada con pagos.
     */
    private final PagoService pagoService;

    /**
     * Servicio encargado de procesar pagos mediante Stripe.
     */
    private final StripeService stripeService;

    /**
     * Constructor para la inyección de dependencias.
     *
     * @param pagoService servicio de pagos
     * @param stripeService servicio de procesamiento de pagos con Stripe
     */
    public PagoController(PagoService pagoService, StripeService stripeService) {
        this.pagoService = pagoService;
        this.stripeService = stripeService;
    }

    /**
     * Endpoint para registrar un nuevo pago.
     *
     * <p>Valida los datos recibidos antes de almacenarlos.</p>
     *
     * @param pago objeto pago a registrar
     * @return ResponseEntity con el pago creado y estado HTTP 201 (CREATED)
     */
    @PostMapping
    public ResponseEntity<Pago> registrarPago(@Valid @RequestBody Pago pago) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pagoService.registrarPago(pago));
    }

    /**
     * Endpoint para buscar un pago por su ID.
     *
     * @param id identificador del pago
     * @return ResponseEntity con el pago encontrado
     */
    @GetMapping("/{id}")
    public ResponseEntity<Pago> buscarPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(pagoService.buscarPorId(id));
    }

    /**
     * Endpoint para obtener el pago asociado a una cita específica.
     *
     * @param idCita identificador de la cita
     * @return ResponseEntity con el pago correspondiente
     */
    @GetMapping("/cita/{idCita}")
    public ResponseEntity<Pago> buscarPorCita(@PathVariable Integer idCita) {
        return ResponseEntity.ok(pagoService.buscarPorCita(idCita));
    }

    /**
     * Endpoint para listar todos los pagos realizados por un paciente.
     *
     * @param idPaciente identificador del paciente
     * @return ResponseEntity con la lista de pagos del paciente
     */
    @GetMapping("/paciente/{idPaciente}")
    public ResponseEntity<List<Pago>> listarPorPaciente(@PathVariable Integer idPaciente) {
        return ResponseEntity.ok(pagoService.listarPorPaciente(idPaciente));
    }

    /**
     * Endpoint para listar pagos según su estado.
     *
     * <p>Ejemplo de uso: /api/pagos/estado/COMPLETADO</p>
     *
     * @param estadoPago estado del pago (ej: COMPLETADO, PENDIENTE)
     * @return ResponseEntity con la lista de pagos filtrados por estado
     */
    @GetMapping("/estado/{estadoPago}")
    public ResponseEntity<List<Pago>> listarPorEstado(@PathVariable String estadoPago) {
        return ResponseEntity.ok(pagoService.listarPorEstado(estadoPago));
    }

    /**
     * Endpoint para actualizar el estado de un pago.
     *
     * <p>Recibe un cuerpo JSON con el nuevo estado:
     * { "estado": "COMPLETADO" }</p>
     *
     * @param id identificador del pago
     * @param body mapa que contiene el nuevo estado
     * @return ResponseEntity con el pago actualizado o error 400 si el estado es inválido
     */
    @PatchMapping("/{id}/estado")
    public ResponseEntity<Pago> actualizarEstado(@PathVariable Integer id,
                                                 @RequestBody Map<String, String> body) {
        String nuevoEstado = body.get("estado");
        if (nuevoEstado == null || nuevoEstado.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(pagoService.actualizarEstado(id, nuevoEstado));
    }

    /**
     * Endpoint para procesar un pago mediante Stripe (simulación de pasarela).
     *
     * <p>Recibe un cuerpo JSON con los datos del pago y el identificador
     * del método de pago generado por Stripe:
     * { "idCita": 1, "monto": 50.00, "metodoPago": "TARJETA", "paymentMethodId": "pm_card_visa" }</p>
     *
     * <p>Crea el cargo (PaymentIntent) en Stripe y, según el resultado,
     * registra el pago como COMPLETADO o RECHAZADO usando la lógica
     * existente en {@link PagoService#registrarPago(Pago)}.</p>
     *
     * @param body mapa con idCita, monto, metodoPago y paymentMethodId
     * @return ResponseEntity con el pago registrado, o error 402 si Stripe rechaza el cargo
     */
    @PostMapping("/stripe")
    public ResponseEntity<?> procesarPagoStripe(@RequestBody Map<String, Object> body) {
        Integer idCita = (Integer) body.get("idCita");
        BigDecimal monto = new BigDecimal(body.get("monto").toString());
        String metodoPago = (String) body.get("metodoPago");
        String paymentMethodId = (String) body.get("paymentMethodId");

        try {
            PaymentIntent intent = stripeService.procesarPago(monto, paymentMethodId);

            Cita cita = new Cita();
            cita.setIdCita(idCita);

            Pago pago = new Pago();
            pago.setCita(cita);
            pago.setMonto(monto);
            pago.setMetodoPago(metodoPago);
            pago.setReferencia(intent.getId());
            pago.setEstadoPago("succeeded".equals(intent.getStatus()) ? "COMPLETADO" : "RECHAZADO");

            Pago pagoGuardado = pagoService.registrarPago(pago);
            return ResponseEntity.status(HttpStatus.CREATED).body(pagoGuardado);

        } catch (StripeException e) {
            return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}