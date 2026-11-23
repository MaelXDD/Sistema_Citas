package utp.citas.citas.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // 404 → Recurso no encontrado
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NoSuchElementException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    // 404 → Ruta o archivo que no existe
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResource(NoResourceFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, "No se encontró el recurso solicitado.");
    }

    // 400 → Regla de negocio violada (DNI duplicado, cita ya pagada, etc.)
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    // 409 → Estado inválido (pago ya registrado para esa cita)
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(IllegalStateException ex) {
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage());
    }

    // 400 → Validaciones de @Valid (@NotBlank, @Email, etc.)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String errores = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return buildResponse(HttpStatus.BAD_REQUEST, errores);
    }

    // Atrapa los errores que saltan directamente de la base de datos (como el de tu captura)
    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(jakarta.validation.ConstraintViolationException ex) {
        String errores = ex.getConstraintViolations().stream()
                .map(cv -> cv.getMessage())
                .collect(Collectors.joining(", "));
        return buildResponse(HttpStatus.BAD_REQUEST, errores);
    }

    // 400 → JSON mal formado o con valores que no se pueden convertir (fechas inválidas, etc.)
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleJsonIlegible(HttpMessageNotReadableException ex) {
        log.warn("Cuerpo de la petición ilegible: {}", ex.getMessage());

        String detalle = ex.getMessage() == null ? "" : ex.getMessage();
        String mensaje = detalle.contains("LocalDate") || detalle.contains("LocalTime")
                ? "La fecha u hora ingresada no es válida."
                : "Los datos enviados no son válidos. Revisa los campos e inténtalo de nuevo.";
        return buildResponse(HttpStatus.BAD_REQUEST, mensaje);
    }

    // 400 → Parámetro de la URL con un tipo incorrecto (por ejemplo, un id que no es número)
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTipoIncorrecto(MethodArgumentTypeMismatchException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "El valor del parámetro '" + ex.getName() + "' no es válido.");
    }

    // 500 → Error inesperado (el detalle técnico queda solo en el log del servidor)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        log.error("Error inesperado", ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                "Ocurrió un error inesperado. Inténtalo de nuevo más tarde.");
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String mensaje) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("mensaje", mensaje);
        return ResponseEntity.status(status).body(body);
    }
}