package utp.citas.citas.service.impl;

import net.sf.jasperreports.engine.*;
import org.springframework.stereotype.Service;
import org.springframework.core.io.ClassPathResource;

import javax.sql.DataSource;
import java.io.InputStream;
import java.sql.Connection;
import java.util.HashMap;
import java.util.Map;

@Service
public class ReporteService {

    private final DataSource dataSource;

    public ReporteService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public byte[] generarDirectorioDoctoresPDF() throws Exception {
        InputStream jrxmlInput = new ClassPathResource("reportes/reporte_doctores.jrxml").getInputStream();
        JasperReport jasperReport = JasperCompileManager.compileReport(jrxmlInput);

        InputStream logoInput = new ClassPathResource("https://hynuxxkgxzjjcpkowfhz.supabase.co/storage/v1/object/public/recursos/logomunicipalidad.png").getInputStream();

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("logo", logoInput);

        try (Connection conn = dataSource.getConnection()) {
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, conn);
            return JasperExportManager.exportReportToPdf(jasperPrint);
        }
    }

    public byte[] generarReporteCitaPDF(Integer idCita) throws Exception {
        InputStream jrxmlInput = new ClassPathResource("reportes/ReporteCita.jrxml").getInputStream();
        JasperReport jasperReport = JasperCompileManager.compileReport(jrxmlInput);

        InputStream logoInput = new ClassPathResource("https://hynuxxkgxzjjcpkowfhz.supabase.co/storage/v1/object/public/recursos/logomunicipalidad.png").getInputStream();

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("id_cita", idCita);
        parameters.put("logo", logoInput);

        try (Connection conn = dataSource.getConnection()) {
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, conn);
            return JasperExportManager.exportReportToPdf(jasperPrint);
        }
    }

    public byte[] generarReporteConsulta3PDF(String dia, String turno, String especialidad) throws Exception {
        InputStream reportStream = getClass().getResourceAsStream("/reportes/Consulta3.jrxml");
        JasperReport jasperReport = JasperCompileManager.compileReport(reportStream);
        InputStream logoInput = new ClassPathResource("static/imagenes/logomunicipalidad.png").getInputStream();

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("p_dia_semana", dia);
        parameters.put("p_turno", turno);
        parameters.put("p_especialidad", especialidad);
        parameters.put("logo", logoInput);

        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource.getConnection());

        return JasperExportManager.exportReportToPdf(jasperPrint);
    }

    public byte[] generarReporteEspecialidadesPDF() throws Exception {
        InputStream jrxmlInput = new ClassPathResource("reportes/Reporte.jrxml").getInputStream();
        JasperReport jasperReport = JasperCompileManager.compileReport(jrxmlInput);

        InputStream logoInput = new ClassPathResource("https://hynuxxkgxzjjcpkowfhz.supabase.co/storage/v1/object/public/recursos/logomunicipalidad.png").getInputStream();

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("logo", logoInput);

        try (Connection conn = dataSource.getConnection()) {
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, conn);
            return JasperExportManager.exportReportToPdf(jasperPrint);
        }
    }
    public byte[] generarReportePacientesPorEspecialidadPDF(Integer idEspecialidad) throws Exception {
        InputStream jrxmlInput = new ClassPathResource("reportes/ReportePacientes.jrxml").getInputStream();
        JasperReport jasperReport = JasperCompileManager.compileReport(jrxmlInput);

        InputStream logoInput = new ClassPathResource("https://hynuxxkgxzjjcpkowfhz.supabase.co/storage/v1/object/public/recursos/logomunicipalidad.png").getInputStream();

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("id_especialidad", idEspecialidad);
        parameters.put("logo", logoInput);

        try (Connection conn = dataSource.getConnection()) {
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, conn);
            return JasperExportManager.exportReportToPdf(jasperPrint);
        }
    }
    public byte[] generarReporteDoctoresCitasPDF(Integer idEspecialidad, String estado) throws Exception {
        InputStream jrxmlInput = new ClassPathResource("reportes/ReporteConsultaEspecialidad.jrxml").getInputStream();
        JasperReport jasperReport = JasperCompileManager.compileReport(jrxmlInput);

        InputStream logoInput = new ClassPathResource("https://hynuxxkgxzjjcpkowfhz.supabase.co/storage/v1/object/public/recursos/logomunicipalidad.png").getInputStream();

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("idEspecialidad", idEspecialidad);
        parameters.put("estado", (estado == null || estado.isBlank()) ? null : estado);
        parameters.put("logo", logoInput);

        try (Connection conn = dataSource.getConnection()) {
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, conn);
            return JasperExportManager.exportReportToPdf(jasperPrint);
        }
    }
}