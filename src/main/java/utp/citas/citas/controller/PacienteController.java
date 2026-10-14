package utp.citas.citas.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import utp.citas.citas.model.Paciente;
import utp.citas.citas.service.PacienteService;

import java.util.List;
import java.util.Map;

/**

 * Controlador REST encargado de la gestión de pacientes.
 *
 * <p>Proporciona endpoints para:</p>
 * <ul>
 * ```
 <li>Listar todos los pacientes</li>
 ```
 * ```
 <li>Registrar un nuevo paciente</li>
 ```
 * ```
 <li>Autenticar (login) a un paciente</li>
 ```
 * </ul>
 *
 * <p><b>Base URL:</b> /api/pacientes</p>
 *
 * <p>Se permite el acceso desde cualquier origen (CORS habilitado).</p>

 */
@RestController
@RequestMapping("/api/pacientes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PacienteController {

    /**
     * Servicio que contiene la lógica de negocio relacionada con pacientes.
     */
    private final PacienteService pacienteService;

    /**
     * Endpoint para listar todos los pacientes registrados.
     *
     * @return lista de pacientes
     */
    @GetMapping
    public List<Paciente> listar() {
        return pacienteService.listarTodos();
    }

    /**
     * Endpoint para registrar un nuevo paciente.
     *
     * <p>Valida los datos recibidos en el cuerpo de la petición antes de procesarlos.</p>
     *
     * @param paciente objeto paciente con los datos a registrar
     * @return ResponseEntity con el paciente registrado
     */
    @PostMapping("/registrar")
    public ResponseEntity<Paciente> registrar(@Valid @RequestBody Paciente paciente) {
        return ResponseEntity.ok(pacienteService.registrar(paciente));
    }

    /**
     * Endpoint para autenticar a un paciente (login).
     *
     * <p>Recibe un mapa con las credenciales del usuario, específicamente
     * el correo y la contraseña.</p>
     *
     * @param credenciales mapa que contiene "correo" y "password"
     * @return ResponseEntity con el paciente autenticado si las credenciales son correctas,
     *         o un mensaje de error en caso contrario
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciales) {
        try {
            String correo = credenciales.get("correo");
            String password = credenciales.get("password");
            Paciente paciente = pacienteService.login(correo, password);
            return ResponseEntity.ok(paciente);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", e.getMessage()));
        }
    }

}
