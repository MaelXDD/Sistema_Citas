package utp.citas.citas.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import utp.citas.citas.model.Cita;
import utp.citas.citas.repository.CitaRepository;
import utp.citas.citas.repository.PagoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**

 * Controlador REST encargado de la gestión de citas médicas.
 *
 * <p>Permite crear, consultar, validar disponibilidad de horarios
 * y cancelar citas dentro del sistema.</p>
 *
 * <p>Incluye una lógica automática de expiración de citas pendientes
 * si no se completa el pago en un tiempo determinado.</p>
 *
 * <p><b>Base URL:</b> /api/citas</p>

 */
@RestController
@RequestMapping("/api/citas")
@CrossOrigin(origins = "*")
public class CitaController {

    /**
     * Repositorio para la gestión de citas.
     */
    private final CitaRepository citaRepository;

    /**
     * Repositorio para la gestión de pagos asociados a citas.
     */
    private final PagoRepository pagoRepository;

    /**
     * Constructor para inyección de dependencias.
     *
     * @param citaRepository repositorio de citas
     * @param pagoRepository repositorio de pagos
     */
    public CitaController(CitaRepository citaRepository, PagoRepository pagoRepository) {
        this.citaRepository = citaRepository;
        this.pagoRepository = pagoRepository;
    }

    /**
     * Endpoint para crear una nueva cita.
     *
     * <p>Al crear la cita:
     * <ul>
     *   <li>Se establece el estado inicial como "PENDIENTE".</li>
     *   <li>Se inicia un temporizador de 1 minuto.</li>
     *   <li>Si en ese tiempo no se completa el pago, la cita se cancela automáticamente.</li>
     * </ul>
     * </p>
     *
     * @param cita objeto cita validado
     * @return ResponseEntity con la cita creada y estado HTTP 201
     */
    @PostMapping
    public ResponseEntity<Cita> crear(@Valid @RequestBody Cita cita) {
        cita.setEstado("PENDIENTE");
        Cita nuevaCita = citaRepository.save(cita);

        // Temporizador automático para cancelar citas pendientes
        Executors.newSingleThreadScheduledExecutor().schedule(() -> {
            citaRepository.findById(nuevaCita.getIdCita()).ifPresent(c -> {
                if ("PENDIENTE".equals(c.getEstado())) {
                    c.setEstado("CANCELADA");
                    citaRepository.save(c);
                }
            });
        }, 1, TimeUnit.MINUTES);

        return ResponseEntity.status(HttpStatus.CREATED).body(nuevaCita);
    }

    /**
     * Endpoint para listar todas las citas de un paciente.
     *
     * @param idPaciente identificador del paciente
     * @return lista de citas asociadas al paciente
     */
    @GetMapping("/paciente/{idPaciente}")
    public ResponseEntity<List<Cita>> porPaciente(@PathVariable Integer idPaciente) {
        return ResponseEntity.ok(citaRepository.findByPaciente_IdPaciente(idPaciente));
    }

    /**
     * Endpoint para obtener las horas ocupadas de un doctor en una fecha específica.
     *
     * <p>Se excluyen las citas canceladas para mostrar únicamente
     * los horarios realmente ocupados.</p>
     *
     * @param idDoctor identificador del doctor
     * @param fecha fecha en formato YYYY-MM-DD
     * @return lista de horas ocupadas en formato HH:mm
     */
    @GetMapping("/ocupadas")
    public ResponseEntity<List<String>> horasOcupadas(
            @RequestParam Integer idDoctor,
            @RequestParam String fecha) {

        LocalDate fechaDate = LocalDate.parse(fecha);

        List<String> horas = citaRepository.findByDoctor_IdDoctorAndFechaCita(idDoctor, fechaDate)
                .stream()
                .filter(c -> !"CANCELADA".equalsIgnoreCase(c.getEstado()))
                .map(c -> c.getHoraCita().toString().substring(0, 5))
                .collect(Collectors.toList());

        return ResponseEntity.ok(horas);
    }

    /**
     * Endpoint para cancelar una cita.
     *
     * <p>Al cancelar una cita:
     * <ul>
     *   <li>Se elimina el pago asociado (si existe).</li>
     *   <li>Se cambia el estado de la cita a "CANCELADA".</li>
     * </ul>
     * </p>
     *
     * @param id identificador de la cita
     * @return ResponseEntity sin contenido (HTTP 204)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelar(@PathVariable Integer id) {
        pagoRepository.deleteByCita_IdCita(id);
        citaRepository.findById(id).ifPresent(cita -> {
            cita.setEstado("CANCELADA");
            citaRepository.save(cita);
        });
        return ResponseEntity.noContent().build();
    }

}
