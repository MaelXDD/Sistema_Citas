package utp.citas.citas.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import utp.citas.citas.model.Doctor;
import utp.citas.citas.model.Horario;
import utp.citas.citas.service.DoctorService;

import java.util.List;

/**

 * Controlador REST encargado de la gestión de doctores.
 *
 * <p>Permite realizar operaciones como:
 * <ul>
 * <li>Listar doctores (todos o solo activos)</li>
 * <li>Filtrar doctores por especialidad</li>
 * <li>Consultar información individual</li>
 * <li>Gestionar horarios de atención</li>
 * <li>Registrar, actualizar y desactivar doctores</li>
 * </ul>
 * </p>
 *
 * <p><b>Base URL:</b> /api/doctores</p>

 */
@RestController
@RequestMapping("/api/doctores")
public class DoctorController {

    /**
     * Servicio que contiene la lógica de negocio para doctores.
     */
    private final DoctorService doctorService;

    /**
     * Constructor para la inyección de dependencias.
     *
     * @param doctorService servicio de doctores
     */
    public DoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    /**
     * Lista todos los doctores registrados en el sistema.
     *
     * @return lista de doctores
     */
    @GetMapping
    public ResponseEntity<List<Doctor>> listarTodos() {
        return ResponseEntity.ok(doctorService.listarTodos());
    }

    /**
     * Lista únicamente los doctores activos.
     *
     * @return lista de doctores activos
     */
    @GetMapping("/activos")
    public ResponseEntity<List<Doctor>> listarActivos() {
        return ResponseEntity.ok(doctorService.listarActivos());
    }

    /**
     * Lista doctores activos filtrados por especialidad.
     *
     * @param idEspecialidad identificador de la especialidad
     * @return lista de doctores activos que pertenecen a la especialidad
     */
    @GetMapping("/especialidad/{idEspecialidad}")
    public ResponseEntity<List<Doctor>> listarPorEspecialidad(
            @PathVariable Integer idEspecialidad) {
        return ResponseEntity.ok(doctorService.listarActivosPorEspecialidad(idEspecialidad));
    }

    /**
     * Busca un doctor por su identificador.
     *
     * @param id identificador del doctor
     * @return doctor encontrado
     */
    @GetMapping("/{id}")
    public ResponseEntity<Doctor> buscarPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(doctorService.buscarPorId(id));
    }

    /**
     * Obtiene los horarios activos de un doctor.
     *
     * @param id identificador del doctor
     * @return lista de horarios disponibles
     */
    @GetMapping("/{id}/horarios")
    public ResponseEntity<List<Horario>> obtenerHorarios(@PathVariable Integer id) {
        return ResponseEntity.ok(doctorService.obtenerHorarios(id));
    }

    /**
     * Obtiene los horarios de un doctor filtrados por día.
     *
     * @param id identificador del doctor
     * @param dia día de la semana (ejemplo: LUNES, MARTES)
     * @return lista de horarios disponibles en ese día
     */
    @GetMapping("/{id}/horarios/{dia}")
    public ResponseEntity<List<Horario>> obtenerHorariosPorDia(
            @PathVariable Integer id,
            @PathVariable String dia) {
        return ResponseEntity.ok(doctorService.obtenerHorariosPorDia(id, dia));
    }

    /**
     * Registra un nuevo doctor en el sistema.
     *
     * @param doctor objeto doctor validado
     * @return doctor creado con estado HTTP 201
     */
    @PostMapping
    public ResponseEntity<Doctor> crear(@Valid @RequestBody Doctor doctor) {
        return ResponseEntity.status(HttpStatus.CREATED).body(doctorService.crear(doctor));
    }

    /**
     * Actualiza la información de un doctor existente.
     *
     * @param id identificador del doctor
     * @param doctor nuevos datos del doctor
     * @return doctor actualizado
     */
    @PutMapping("/{id}")
    public ResponseEntity<Doctor> actualizar(@PathVariable Integer id,
                                             @Valid @RequestBody Doctor doctor) {
        return ResponseEntity.ok(doctorService.actualizar(id, doctor));
    }

    /**
     * Realiza una baja lógica de un doctor.
     *
     * <p>No elimina el registro de la base de datos, sino que lo marca como inactivo.</p>
     *
     * @param id identificador del doctor
     * @return respuesta HTTP 204 sin contenido
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable Integer id) {
        doctorService.desactivar(id);
        return ResponseEntity.noContent().build();
    }

}
