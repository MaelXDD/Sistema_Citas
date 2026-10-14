package utp.citas.citas.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import utp.citas.citas.model.Horario;
import utp.citas.citas.repository.HorarioRepository;
import utp.citas.citas.service.DoctorService;

import java.util.List;
import java.util.Map;

/**

 * Controlador REST encargado de la gestión de horarios de atención médica.
 *
 * <p>Este controlador expone endpoints para administrar los horarios de los doctores,
 * permitiendo listar, consultar por doctor, asignar y eliminar horarios.</p>
 *
 * <p><b>Base URL:</b> /api/horarios</p>
 *
 * <p>Se permite el acceso desde cualquier origen mediante CORS.</p>

 */
@RestController
@RequestMapping("/api/horarios")
@CrossOrigin(origins = "*")
public class HorarioController {

    /**
     * Repositorio para el acceso y manipulación de datos de horarios.
     */
    private final HorarioRepository horarioRepository;

    /**
     * Servicio que contiene la lógica de negocio relacionada con doctores.
     */
    private final DoctorService doctorService;

    /**
     * Constructor que inicializa las dependencias del controlador.
     *
     * @param horarioRepository repositorio de horarios
     * @param doctorService servicio de doctores
     */
    public HorarioController(HorarioRepository horarioRepository, DoctorService doctorService) {
        this.horarioRepository = horarioRepository;
        this.doctorService = doctorService;
    }

    /**
     * Endpoint para obtener todos los horarios activos.
     *
     * @return una respuesta HTTP con la lista de horarios activos
     */
    @GetMapping
    public ResponseEntity<List<Horario>> listarTodos() {
        return ResponseEntity.ok(horarioRepository.findAllActivos());
    }

    /**
     * Endpoint para obtener los horarios activos de un doctor específico.
     *
     * @param idDoctor ID del doctor
     * @return una respuesta HTTP con la lista de horarios del doctor
     */
    @GetMapping("/doctor/{idDoctor}")
    public ResponseEntity<List<Horario>> porDoctor(@PathVariable Integer idDoctor) {
        return ResponseEntity.ok(horarioRepository.findActivosByDoctor(idDoctor));
    }

    /**
     * Endpoint para asignar uno o múltiples horarios a un doctor.
     *
     * <p>Recibe un payload en formato JSON con los datos necesarios para registrar
     * los horarios. La lógica de procesamiento se delega al servicio de doctores.</p>
     *
     * @param payload mapa con los datos de entrada
     * @return respuesta HTTP 200 (OK) si la operación fue exitosa
     */
    @PostMapping
    public ResponseEntity<?> asignarHorario(@RequestBody Map<String, Object> payload) {
        doctorService.registrarHorariosMultiplesRaw(payload);
        return ResponseEntity.ok().build();
    }

    /**
     * Endpoint para eliminar un horario por su ID.
     *
     * @param id ID del horario a eliminar
     * @return respuesta HTTP 204 (No Content) si la eliminación fue exitosa
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarHorario(@PathVariable Integer id) {
        horarioRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

}
