package utp.citas.citas.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import utp.citas.citas.model.Paciente;
import utp.citas.citas.security.JwtService;
import utp.citas.citas.service.PacienteService;

import java.util.LinkedHashMap;
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

    /** Emite el JWT que usa el bot. */
    private final JwtService jwtService;

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

            // Misma forma que antes (los campos del paciente) + "token" para el bot.
            // Si bot.jwt.secret no está configurado, token = null y todo sigue como antes.
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("idPaciente", paciente.getIdPaciente());
            body.put("nombres", paciente.getNombres());
            body.put("apellidos", paciente.getApellidos());
            body.put("correo", paciente.getCorreo());
            body.put("dni", paciente.getDni());
            body.put("telefono", paciente.getTelefono());
            body.put("fechaNac", paciente.getFechaNac());
            body.put("direccion", paciente.getDireccion());
            body.put("activo", paciente.getActivo());
            body.put("rol", paciente.getRol());
            body.put("token", jwtService.emitir(paciente));
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", e.getMessage()));
        }
    }

}
