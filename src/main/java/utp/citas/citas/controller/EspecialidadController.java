package utp.citas.citas.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import utp.citas.citas.model.Especialidad;
import utp.citas.citas.service.EspecialidadService;

import java.util.List;

/**

 * Controlador REST encargado de la gestión de especialidades médicas.
 *
 * <p>Permite realizar operaciones CRUD sobre las especialidades,
 * así como activar o desactivar registros mediante baja lógica.</p>
 *
 * <p>Las especialidades son utilizadas para clasificar doctores
 * y organizar la oferta de servicios médicos.</p>
 *
 * <p><b>Base URL:</b> /api/especialidades</p>

 */
@RestController
@RequestMapping("/api/especialidades")
public class EspecialidadController {

    /**
     * Servicio que contiene la lógica de negocio de especialidades.
     */
    private final EspecialidadService especialidadService;

    /**
     * Constructor para la inyección de dependencias.
     *
     * @param especialidadService servicio de especialidades
     */
    public EspecialidadController(EspecialidadService especialidadService) {
        this.especialidadService = especialidadService;
    }

    /**
     * Lista todas las especialidades registradas en el sistema.
     *
     * @return lista de especialidades
     */
    @GetMapping
    public ResponseEntity<List<Especialidad>> listarTodas() {
        return ResponseEntity.ok(especialidadService.listarTodas());
    }

    /**
     * Lista únicamente las especialidades activas.
     *
     * <p>Este endpoint es útil para poblar selectores en el frontend.</p>
     *
     * @return lista de especialidades activas
     */
    @GetMapping("/activas")
    public ResponseEntity<List<Especialidad>> listarActivas() {
        return ResponseEntity.ok(especialidadService.listarActivas());
    }

    /**
     * Busca una especialidad por su identificador.
     *
     * @param id identificador de la especialidad
     * @return especialidad encontrada
     */
    @GetMapping("/{id}")
    public ResponseEntity<Especialidad> buscarPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(especialidadService.buscarPorId(id));
    }

    /**
     * Registra una nueva especialidad.
     *
     * @param especialidad objeto validado
     * @return especialidad creada con estado HTTP 201
     */
    @PostMapping
    public ResponseEntity<Especialidad> crear(@Valid @RequestBody Especialidad especialidad) {
        Especialidad nueva = especialidadService.crear(especialidad);
        return ResponseEntity.status(HttpStatus.CREATED).body(nueva);
    }

    /**
     * Actualiza una especialidad existente.
     *
     * @param id identificador de la especialidad
     * @param especialidad nuevos datos de la especialidad
     * @return especialidad actualizada
     */
    @PutMapping("/{id}")
    public ResponseEntity<Especialidad> actualizar(@PathVariable Integer id,
                                                   @Valid @RequestBody Especialidad especialidad) {
        return ResponseEntity.ok(especialidadService.actualizar(id, especialidad));
    }

    /**
     * Realiza una baja lógica de una especialidad.
     *
     * <p>Se cambia su estado a inactiva (activo = false),
     * sin eliminar el registro de la base de datos.</p>
     *
     * @param id identificador de la especialidad
     * @return respuesta HTTP 204 sin contenido
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable Integer id) {
        especialidadService.desactivar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Reactiva una especialidad previamente desactivada.
     *
     * @param id identificador de la especialidad
     * @return respuesta HTTP 204 sin contenido
     */
    @PutMapping("/{id}/activar")
    public ResponseEntity<Void> activar(@PathVariable Integer id) {
        especialidadService.activar(id);
        return ResponseEntity.noContent().build();
    }

}