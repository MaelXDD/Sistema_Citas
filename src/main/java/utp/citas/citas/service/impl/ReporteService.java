package utp.citas.citas.service.impl;

import net.sf.jasperreports.engine.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.sql.Connection;
import java.util.HashMap;
import java.util.Map;

@Service
public class ReporteService {

    private static final Logger log = LoggerFactory.getLogger(ReporteService.class);

    private static final String LOGO_URL =
            "https://hynuxxkgxzjjcpkowfhz.supabase.co/storage/v1/object/public/recursos/logomunicipalidad.png";

    private final DataSource dataSource;
    private volatile byte[] logoCache;

    public ReporteService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    // ---------- helpers ----------

    private JasperReport compilar(String rutaJrxml) throws Exception {
        try (InputStream in = new ClassPathResource(rutaJrxml).getInputStream()) {
            return JasperCompileManager.compileReport(in);
        }
    }

    private InputStream cargarLogo() throws IOException {
        if (logoCache == null) {
            try (InputStream in = new UrlResource(LOGO_URL).getInputStream()) {
                logoCache = in.readAllBytes();
                log.info("Logo descargado y cacheado ({} bytes)", logoCache.length);
            }
        }
        return new ByteArrayInputStream(logoCache);
    }

    private byte[] generar(String rutaJrxml, Map<String, Object> params) throws Exception {
        log.info("Generando reporte: {}", rutaJrxml);
        JasperReport report = compilar(rutaJrxml);
        params.put("logo", cargarLogo());
        try (Connection conn = dataSource.getConnection()) {
            JasperPrint print = JasperFillManager.fillReport(report, params, conn);
            return JasperExportManager.exportReportToPdf(print);
        }
    }

    // ---------- reportes ----------

    public byte[] generarDirectorioDoctoresPDF() throws Exception {
        return generar("reportes/reporte_doctores.jrxml", new HashMap<>());
    }

    public byte[] generarReporteCitaPDF(Integer idCita) throws Exception {
        Map<String, Object> p = new HashMap<>();
        p.put("id_cita", idCita);
        return generar("reportes/ReporteCita.jrxml", p);
    }

    public byte[] generarReporteConsulta3PDF(String dia, String turno, String especialidad) throws Exception {
        Map<String, Object> p = new HashMap<>();
        p.put("p_dia_semana", dia);
        p.put("p_turno", turno);
        p.put("p_especialidad", especialidad);
        return generar("reportes/Consulta3.jrxml", p);
    }

    public byte[] generarReporteEspecialidadesPDF() throws Exception {
        return generar("reportes/Reporte.jrxml", new HashMap<>());
    }

    public byte[] generarReportePacientesPorEspecialidadPDF(Integer idEspecialidad) throws Exception {
        Map<String, Object> p = new HashMap<>();
        p.put("id_especialidad", idEspecialidad);
        return generar("reportes/ReportePacientes.jrxml", p);
    }

    public byte[] generarReporteDoctoresCitasPDF(Integer idEspecialidad, String estado) throws Exception {
        Map<String, Object> p = new HashMap<>();
        p.put("idEspecialidad", idEspecialidad);
        p.put("estado", (estado == null || estado.isBlank()) ? null : estado);
        return generar("reportes/ReporteConsultaEspecialidad.jrxml", p);
    }
}
