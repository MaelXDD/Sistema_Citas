package utp.citas.citas.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import utp.citas.citas.model.*;
import utp.citas.citas.repository.*;
import utp.citas.citas.security.UsuarioAutenticado;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * API dedicada al asistente (bot). Todas las rutas exigen JWT (ver SecurityConfig) y
 * toman la identidad del paciente DEL TOKEN, nunca de parámetros de la petición.
 *
 * Los errores se lanzan como IllegalArgumentException (400), NoSuchElementException (404)
 * o IllegalStateException (409) y los formatea GlobalExceptionHandler ({"mensaje": ...}).
 */
@RestController
@RequestMapping("/api/bot")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BotController {

    private static final ZoneId LIMA = ZoneId.of("America/Lima");
    private static final String[] DIAS = {"Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"};
    private static final int SLOT_MIN = 30;           // igual que citas.js
    private static final int DIAS_MAX_ANTICIPACION = 60;

    private final CitaRepository citaRepository;
    private final DoctorRepository doctorRepository;
    private final EspecialidadRepository especialidadRepository;
    private final HorarioRepository horarioRepository;
    private final PrecioRepository precioRepository;
    private final PacienteRepository pacienteRepository;
    private final PagoRepository pagoRepository;

    public record ReservaRequest(Integer idDoctor, String fecha, String hora, String motivo) {
    }

    // ------------------------------------------------------------------ catálogo

    @GetMapping("/catalogo")
    public List<Map<String, Object>> catalogo() {
        Map<Integer, BigDecimal> precios = precioRepository.findAllActivos().stream()
                .collect(Collectors.toMap(p -> p.getEspecialidad().getIdEspecialidad(), Precio::getMonto, (a, b) -> a));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Especialidad e : especialidadRepository.findByActivoTrue()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("idEspecialidad", e.getIdEspecialidad());
            m.put("nombre", e.getNombre());
            m.put("descripcion", e.getDescripcion());
            m.put("precioSoles", precios.get(e.getIdEspecialidad()));
            out.add(m);
        }
        return out;
    }

    @GetMapping("/doctores")
    public List<Map<String, Object>> doctores(@RequestParam Integer idEspecialidad) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Doctor d : doctorRepository.findActivosByEspecialidad(idEspecialidad)) {
            List<Map<String, Object>> turnos = horarioRepository.findActivosByDoctor(d.getIdDoctor()).stream()
                    .map(h -> {
                        Map<String, Object> t = new LinkedHashMap<>();
                        t.put("dia", h.getDiaSemana());
                        t.put("desde", hhmm(h.getHoraInicio()));
                        t.put("hasta", hhmm(h.getHoraFin()));
                        return t;
                    }).toList();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("idDoctor", d.getIdDoctor());
            m.put("nombre", nombreDoctor(d));
            m.put("especialidad", d.getEspecialidad().getNombre());
            m.put("horarios", turnos);
            out.add(m);
        }
        return out;
    }

    @GetMapping("/disponibilidad")
    public Map<String, Object> disponibilidad(@RequestParam Integer idDoctor, @RequestParam String fecha) {
        LocalDate f = parseFecha(fecha);
        Doctor d = doctorActivo(idDoctor);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("idDoctor", idDoctor);
        m.put("doctor", nombreDoctor(d));
        m.put("fecha", f.toString());
        m.put("dia", DIAS[f.getDayOfWeek().getValue() - 1]);
        m.put("horasLibres", horasLibres(idDoctor, f).stream().map(BotController::hhmm).toList());
        return m;
    }

    // ------------------------------------------------------------------ reservar (valida; el pago crea la cita)

    @PostMapping("/reservas/validar")
    public Map<String, Object> validarReserva(@AuthenticationPrincipal UsuarioAutenticado user,
                                              @RequestBody ReservaRequest req) {
        if (req == null || req.idDoctor() == null) throw new IllegalArgumentException("Falta el doctor.");
        LocalDate fecha = parseFecha(req.fecha());
        LocalTime hora = parseHora(req.hora());
        Doctor doctor = doctorActivo(req.idDoctor());
        Paciente paciente = pacienteRepository.findById(user.id())
                .orElseThrow(() -> new NoSuchElementException("Paciente no encontrado."));

        if (!horasLibres(doctor.getIdDoctor(), fecha).contains(hora)) {
            throw new IllegalStateException("Ese horario ya no está disponible. Elige otra hora.");
        }
        Especialidad esp = doctor.getEspecialidad();
        BigDecimal precio = precioRepository.findByEspecialidad_IdEspecialidadAndActivoTrue(esp.getIdEspecialidad())
                .map(Precio::getMonto)
                .orElseThrow(() -> new IllegalArgumentException("Esta especialidad no tiene precio configurado."));
        Horario turno = horarioRepository
                .findByDoctor_IdDoctorAndDiaSemanaAndActivoTrue(doctor.getIdDoctor(), diaDe(fecha)).stream()
                .filter(h -> !hora.isBefore(h.getHoraInicio()) && !hora.plusMinutes(SLOT_MIN).isAfter(h.getHoraFin()))
                .findFirst().orElseThrow(() -> new IllegalStateException("Horario no disponible."));

        // Misma forma que arma citas.js para pago.html (sessionStorage.citaPendiente)
        Map<String, Object> pac = new LinkedHashMap<>();
        pac.put("idPaciente", paciente.getIdPaciente());
        pac.put("nombres", paciente.getNombres());
        pac.put("apellidos", paciente.getApellidos());
        pac.put("correo", paciente.getCorreo());
        pac.put("rol", paciente.getRol());
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("idDoctor", doctor.getIdDoctor());
        doc.put("nombres", doctor.getNombres());
        doc.put("apellidos", doctor.getApellidos());
        Map<String, Object> espMap = new LinkedHashMap<>();
        espMap.put("idEspecialidad", esp.getIdEspecialidad());
        espMap.put("nombre", esp.getNombre());
        espMap.put("precioConsulta", precio);
        Map<String, Object> hor = new LinkedHashMap<>();
        hor.put("idHorario", turno.getIdHorario());
        hor.put("diaSemana", turno.getDiaSemana());
        hor.put("horaInicio", turno.getHoraInicio().toString());
        hor.put("horaFin", turno.getHoraFin().toString());

        Map<String, Object> cita = new LinkedHashMap<>();
        cita.put("paciente", pac);
        cita.put("doctor", doc);
        cita.put("especialidad", espMap);
        cita.put("horario", hor);
        cita.put("fechaCita", fecha.toString());
        cita.put("horaCita", hora + ":00");
        cita.put("motivo", (req.motivo() == null || req.motivo().isBlank()) ? "Consulta general" : req.motivo().trim());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("resumen", String.format("%s (%s), %s %s a las %s, S/ %s",
                nombreDoctor(doctor), esp.getNombre(), DIAS[fecha.getDayOfWeek().getValue() - 1].toLowerCase(),
                formatoFecha(fecha), hhmm(hora), precio.setScale(2, RoundingMode.HALF_UP)));
        out.put("citaPendiente", cita);
        return out;
    }

    // ------------------------------------------------------------------ citas del paciente

    @GetMapping("/mis-citas")
    public List<Map<String, Object>> misCitas(@AuthenticationPrincipal UsuarioAutenticado user) {
        return citaRepository.findByPaciente_IdPaciente(user.id()).stream()
                .sorted(Comparator.comparing(Cita::getFechaCita).thenComparing(Cita::getHoraCita).reversed())
                .limit(15)
                .map(c -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("idCita", c.getIdCita());
                    m.put("fecha", c.getFechaCita().toString());
                    m.put("hora", hhmm(c.getHoraCita()));
                    m.put("doctor", nombreDoctor(c.getDoctor()));
                    m.put("especialidad", c.getDoctor().getEspecialidad().getNombre());
                    m.put("estado", c.getEstado());
                    m.put("motivo", c.getMotivo());
                    pagoRepository.findByCita_IdCita(c.getIdCita()).ifPresent(p -> {
                        Map<String, Object> pm = new LinkedHashMap<>();
                        pm.put("estado", p.getEstadoPago());
                        pm.put("montoSoles", p.getMonto());
                        m.put("pago", pm);
                    });
                    return m;
                }).toList();
    }

    @DeleteMapping("/citas/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> cancelar(@AuthenticationPrincipal UsuarioAutenticado user,
                                                        @PathVariable Integer id) {
        // Misma respuesta si no existe o es de otro paciente: no se revela qué ids existen.
        Cita c = citaRepository.findById(id)
                .filter(x -> x.getPaciente().getIdPaciente().equals(user.id()))
                .orElseThrow(() -> new NoSuchElementException("No encontré esa cita en tu cuenta."));
        String estado = c.getEstado();
        if ("CANCELADA".equalsIgnoreCase(estado)) throw new IllegalStateException("Esa cita ya estaba cancelada.");
        if (!List.of("PENDIENTE", "CONFIRMADA").contains(estado.toUpperCase())) {
            throw new IllegalStateException("Esa cita ya fue atendida y no se puede cancelar.");
        }
        if (!LocalDateTime.of(c.getFechaCita(), c.getHoraCita()).isAfter(LocalDateTime.now(LIMA))) {
            throw new IllegalStateException("Esa cita ya pasó y no se puede cancelar.");
        }
        c.setEstado("CANCELADA");
        citaRepository.save(c);
        // A diferencia de DELETE /api/citas/{id}, aquí NO se borra el pago: se conserva para la devolución.
        boolean pagada = pagoRepository.findByCita_IdCita(id)
                .map(p -> "COMPLETADO".equalsIgnoreCase(p.getEstadoPago())).orElse(false);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("idCita", id);
        out.put("estado", "CANCELADA");
        out.put("mensaje", pagada
                ? "Tu cita fue cancelada. Como ya estaba pagada, consulta con la clínica sobre la devolución."
                : "Tu cita fue cancelada.");
        return ResponseEntity.ok(out);
    }

    // ------------------------------------------------------------------ contexto para personalizar

    @GetMapping("/contexto")
    public Map<String, Object> contexto(@AuthenticationPrincipal UsuarioAutenticado user) {
        List<Cita> citas = citaRepository.findByPaciente_IdPaciente(user.id());
        LocalDateTime ahora = LocalDateTime.now(LIMA);
        List<Cita> vigentes = citas.stream().filter(c -> !"CANCELADA".equalsIgnoreCase(c.getEstado())).toList();

        Map<String, Object> m = new LinkedHashMap<>();
        vigentes.stream()
                .filter(c -> List.of("PENDIENTE", "CONFIRMADA").contains(c.getEstado().toUpperCase()))
                .filter(c -> LocalDateTime.of(c.getFechaCita(), c.getHoraCita()).isAfter(ahora))
                .min(Comparator.comparing(c -> LocalDateTime.of(c.getFechaCita(), c.getHoraCita())))
                .ifPresent(c -> m.put("proximaCita", String.format("n.º %d, %s %s a las %s con %s (%s)",
                        c.getIdCita(), DIAS[c.getFechaCita().getDayOfWeek().getValue() - 1].toLowerCase(),
                        formatoFecha(c.getFechaCita()), hhmm(c.getHoraCita()), nombreDoctor(c.getDoctor()),
                        c.getDoctor().getEspecialidad().getNombre())));
        masFrecuente(vigentes, c -> c.getDoctor().getEspecialidad().getNombre())
                .ifPresent(v -> m.put("especialidadFrecuente", v));
        masFrecuente(vigentes, c -> nombreDoctor(c.getDoctor()))
                .ifPresent(v -> m.put("doctorFrecuente", v));
        m.put("citasAtendidas", citas.stream()
                .filter(c -> List.of("ATENDIDA", "COMPLETADA").contains(c.getEstado().toUpperCase())).count());
        m.put("citasCanceladas", citas.stream().filter(c -> "CANCELADA".equalsIgnoreCase(c.getEstado())).count());
        m.put("pagosPendientes", vigentes.stream()
                .filter(c -> pagoRepository.findByCita_IdCita(c.getIdCita())
                        .map(p -> "PENDIENTE".equalsIgnoreCase(p.getEstadoPago())).orElse(false))
                .count());
        return m;
    }

    // ------------------------------------------------------------------ helpers

    private List<LocalTime> horasLibres(Integer idDoctor, LocalDate fecha) {
        Set<LocalTime> ocupadas = citaRepository.findByDoctor_IdDoctorAndFechaCita(idDoctor, fecha).stream()
                .filter(c -> !"CANCELADA".equalsIgnoreCase(c.getEstado()))
                .map(c -> c.getHoraCita().withSecond(0).withNano(0))
                .collect(Collectors.toSet());
        LocalDateTime ahora = LocalDateTime.now(LIMA);
        TreeSet<LocalTime> libres = new TreeSet<>();
        for (Horario h : horarioRepository.findByDoctor_IdDoctorAndDiaSemanaAndActivoTrue(idDoctor, diaDe(fecha))) {
            LocalTime t = h.getHoraInicio();
            while (!t.plusMinutes(SLOT_MIN).isAfter(h.getHoraFin())) {
                if (!ocupadas.contains(t) && LocalDateTime.of(fecha, t).isAfter(ahora)) libres.add(t);
                LocalTime sig = t.plusMinutes(SLOT_MIN);
                if (sig.isBefore(t)) break;          // protección al cruzar medianoche
                t = sig;
            }
        }
        return new ArrayList<>(libres);
    }

    private Doctor doctorActivo(Integer id) {
        Doctor d = doctorRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Doctor no encontrado."));
        if (!Boolean.TRUE.equals(d.getActivo())) throw new IllegalArgumentException("Ese doctor no está disponible.");
        return d;
    }

    private static LocalDate parseFecha(String s) {
        try {
            LocalDate f = LocalDate.parse(s);
            LocalDate hoy = LocalDate.now(LIMA);
            if (f.isBefore(hoy)) throw new IllegalArgumentException("Esa fecha ya pasó.");
            if (f.isAfter(hoy.plusDays(DIAS_MAX_ANTICIPACION)))
                throw new IllegalArgumentException("Solo se puede reservar con hasta " + DIAS_MAX_ANTICIPACION + " días de anticipación.");
            return f;
        } catch (DateTimeParseException | NullPointerException e) {
            throw new IllegalArgumentException("Fecha inválida (usa AAAA-MM-DD).");
        }
    }

    private static LocalTime parseHora(String s) {
        try {
            return LocalTime.parse(s).withSecond(0).withNano(0);
        } catch (DateTimeParseException | NullPointerException e) {
            throw new IllegalArgumentException("Hora inválida (usa HH:MM).");
        }
    }

    private static String diaDe(LocalDate f) {
        return DIAS[f.getDayOfWeek().getValue() - 1];
    }

    private static String nombreDoctor(Doctor d) {
        return "Dr. " + d.getNombres() + " " + d.getApellidos();
    }

    private static String hhmm(LocalTime t) {
        return String.format("%02d:%02d", t.getHour(), t.getMinute());
    }

    private static String formatoFecha(LocalDate f) {
        return String.format("%02d/%02d/%d", f.getDayOfMonth(), f.getMonthValue(), f.getYear());
    }

    private static Optional<String> masFrecuente(List<Cita> citas, Function<Cita, String> campo) {
        return citas.stream().map(campo)
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()))
                .entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey);
    }
}
