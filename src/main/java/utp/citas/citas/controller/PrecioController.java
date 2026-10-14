package utp.citas.citas.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import utp.citas.citas.model.Precio;
import utp.citas.citas.repository.PrecioRepository;

import java.util.List;

/**

 * Controlador REST encargado de la gestión de precios por especialidad.
 *
 * <p>Este controlador permite consultar, crear y actualizar precios
 * asociados a diferentes especialidades médicas.</p>
 *
 * <p><b>Base URL:</b> /api/precios</p>
 *
 * <p>Se permite el acceso desde cualquier origen (CORS habilitado).</p>

 */
@RestController
@RequestMapping("/api/precios")
@CrossOrigin(origins = "*")
public class PrecioController {

    /**
     * Repositorio para el acceso y manipulación de datos de precios.
     */
    private final PrecioRepository precioRepository;

    /**
     * Constructor para la inyección de dependencias.
     *
     * @param precioRepository repositorio de precios
     */
    public PrecioController(PrecioRepository precioRepository) {
        this.precioRepository = precioRepository;
    }

    /**
     * Endpoint para listar todos los precios activos.
     *
     * @return ResponseEntity con la lista de precios activos
     */
    @GetMapping
    public ResponseEntity<List<Precio>> listarTodos() {
        return ResponseEntity.ok(precioRepository.findAllActivos());
    }

    /**
     * Endpoint para obtener el precio asociado a una especialidad específica.
     *
     * @param id identificador de la especialidad
     * @return ResponseEntity con el precio encontrado o 404 si no existe
     */
    @GetMapping("/especialidad/{id}")
    public ResponseEntity<Precio> porEspecialidad(@PathVariable Integer id) {
        return precioRepository.findByEspecialidad(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Endpoint para registrar un nuevo precio.
     *
     * @param precio objeto precio a crear
     * @return ResponseEntity con el precio creado y estado HTTP 201 (CREATED)
     */
    @PostMapping
    public ResponseEntity<Precio> crear(@RequestBody Precio precio) {
        return ResponseEntity.status(HttpStatus.CREATED).body(precioRepository.save(precio));
    }

    /**
     * Endpoint para actualizar un precio existente.
     *
     * <p>Se asigna el ID recibido en la URL al objeto precio antes de guardarlo.</p>
     *
     * @param id identificador del precio a actualizar
     * @param precio objeto con los nuevos datos
     * @return ResponseEntity con el precio actualizado
     */
    @PutMapping("/{id}")
    public ResponseEntity<Precio> actualizar(@PathVariable Integer id, @RequestBody Precio precio) {
        precio.setIdPrecio(id);
        return ResponseEntity.ok(precioRepository.save(precio));
    }

}
