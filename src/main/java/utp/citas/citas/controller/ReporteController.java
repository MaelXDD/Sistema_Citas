package utp.citas.citas.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import utp.citas.citas.model.Cita;
import utp.citas.citas.model.PacienteEspecialidadDTO;
import utp.citas.citas.model.ReporteAfluenciaDTO;
import utp.citas.citas.model.DoctorCitasDTO;
import utp.citas.citas.controller.EspecialidadDTO;
import utp.citas.citas.repository.CitaRepository;
import utp.citas.citas.service.ReporteAfluenciaService;
import utp.citas.citas.service.SupabaseStorageService;
import utp.citas.citas.service.impl.ReporteService;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Controlador REST encargado de la generación de reportes y estadísticas del sistema.
 * Integrado con Supabase Storage para alojar los PDFs en la nube.
 */
@RestController
@RequestMapping("/api/reportes")
@CrossOrigin(origins = "*")
public class ReporteController {

    private final ReporteService reporteService;
    private final CitaRepository citaRepository;
    private final ReporteAfluenciaService afluenciaService;
    private final SupabaseStorageService supabaseStorageService;

    /**
     * Constructor con inyección de dependencias.
     */
    public ReporteController(ReporteService reporteService, CitaRepository citaRepository,
                             ReporteAfluenciaService afluenciaService, SupabaseStorageService supabaseStorageService) {
        this.reporteService = reporteService;
        this.citaRepository = citaRepository;
        this.afluenciaService = afluenciaService;
        this.supabaseStorageService = supabaseStorageService;
    }

    @GetMapping("/afluencia")
    public ResponseEntity<List<ReporteAfluenciaDTO>> getAfluencia() {
        return ResponseEntity.ok(afluenciaService.obtenerReporteAfluencia());
    }

    /**
     * Genera el directorio de doctores en PDF, lo sube a Supabase y devuelve la URL.
     */
    @GetMapping("/doctores/pdf")
    public ResponseEntity<byte[]> descargarDirectorioDoctores() {
        try {
            byte[] pdfBytes = reporteService.generarDirectorioDoctoresPDF();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", "Directorio_Doctores.pdf");
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Genera el comprobante de una cita en PDF, lo sube a Supabase y devuelve la URL.
     */
    @GetMapping("/citas/{idCita}/pdf")
    public ResponseEntity<byte[]> descargarReporteCita(@PathVariable Integer idCita) {
        try {
            Cita cita = citaRepository.findById(idCita)
                    .orElseThrow(() -> new RuntimeException("Cita no encontrada"));

            byte[] pdfBytes = reporteService.generarReporteCitaPDF(idCita);

            String nombreArchivo = String.format("Comprobante_%s_%s_Cita%d.pdf",
                    cita.getPaciente().getDni(), cita.getFechaCita(), idCita);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", nombreArchivo);
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Genera el reporte de especialidades en PDF, lo sube a Supabase y devuelve la URL.
     */
    @GetMapping("/especialidades/pdf")
    public ResponseEntity<byte[]> descargarReporteEspecialidades() {
        try {
            byte[] pdfBytes = reporteService.generarReporteEspecialidadesPDF();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", "Reporte_Especialidades.pdf");
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Genera un reporte personalizado, lo sube a Supabase y devuelve la URL.
     */
    @GetMapping("/consulta3/pdf")
    public ResponseEntity<byte[]> descargarReporteConsulta3(
            @RequestParam(value = "dia", defaultValue = "Todos") String dia,
            @RequestParam(value = "turno", defaultValue = "Todos") String turno,
            @RequestParam(value = "especialidad", defaultValue = "Todos") String especialidad) {
        try {
            byte[] pdfBytes = reporteService.generarReporteConsulta3PDF(dia, turno, especialidad);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", "Reporte_Consulta3.pdf");
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/estadisticas/doctores-citas")
    public ResponseEntity<List<DoctorCitasDTO>> estadisticasDoctoresCitas(
            @RequestParam(required = false) Integer idEspecialidad,
            @RequestParam(required = false) String estado) {

        List<Object[]> rows = citaRepository.estadisticasDoctoresCitas(
                idEspecialidad,
                (estado == null || estado.isBlank()) ? null : estado
        );

        List<DoctorCitasDTO> result = rows.stream()
                .map(r -> new DoctorCitasDTO(
                        (String) r[0],
                        (String) r[2],
                        (String) r[3],
                        ((Number) r[4]).longValue(),
                        (BigDecimal) r[5]
                ))
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/estadisticas/pacientes-especialidad")
    public ResponseEntity<List<PacienteEspecialidadDTO>> pacientesPorEspecialidad(
            @RequestParam Integer idEspecialidad) {

        List<Object[]> datos = citaRepository.pacientesPorEspecialidad(idEspecialidad);

        List<PacienteEspecialidadDTO> lista = datos.stream()
                .map(fila -> new PacienteEspecialidadDTO(
                        (String) fila[0],
                        (String) fila[1],
                        (BigDecimal) fila[2],
                        ((Number) fila[3]).longValue()
                ))
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(lista);
    }

    @GetMapping("/estadisticas/ingresos-especialidad")
    public List<EspecialidadDTO> especialidadDTOS() {
        List<Object[]> datos = citaRepository.ingresosEspecialidad();
        List<EspecialidadDTO> lista = new ArrayList<>();

        for (Object[] fila : datos) {
            lista.add(
                    new EspecialidadDTO(
                            fila[0].toString(),
                            ((Number) fila[1]).longValue(),
                            ((Number) fila[2]).longValue(),
                            (BigDecimal) fila[3]
                    )
            );
        }
        return lista;
    }

    /**
     * Genera reporte de pacientes por especialidad, lo sube a Supabase y devuelve la URL.
     */
    @GetMapping("/pacientes-especialidad/{idEspecialidad}/pdf")
    public ResponseEntity<byte[]> descargarReportePacientesEspecialidad(@PathVariable Integer idEspecialidad) {
        try {
            byte[] pdfBytes = reporteService.generarReportePacientesPorEspecialidadPDF(idEspecialidad);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", "Reporte_Pacientes_Especialidad_" + idEspecialidad + ".pdf");
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Genera reporte de doctores y citas, lo sube a Supabase y devuelve la URL.
     */
    @GetMapping("/estadisticas/doctores-citas/pdf")
    public ResponseEntity<byte[]> descargarReporteDoctoresCitas(
            @RequestParam(required = false) Integer idEspecialidad,
            @RequestParam(required = false) String estado) {
        try {
            byte[] pdfBytes = reporteService.generarReporteDoctoresCitasPDF(idEspecialidad, estado);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", "Reporte_Doctores_Citas.pdf");
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}