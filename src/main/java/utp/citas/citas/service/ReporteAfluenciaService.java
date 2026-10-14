package utp.citas.citas.service;

import utp.citas.citas.model.ReporteAfluenciaDTO;
import java.util.List;

/**

 * Interfaz de servicio para la generación del reporte de afluencia.
 *
 * <p>Este servicio se encarga de obtener información estadística
 * sobre la cantidad de citas o pacientes atendidos en determinados
 * periodos de tiempo, permitiendo analizar el flujo del sistema.</p>
 *
 * <p>Los datos generados son utilizados para visualizaciones,
 * dashboards o análisis de carga operativa.</p>
 */
public interface ReporteAfluenciaService {

    /**

     * Obtiene el reporte de afluencia de citas o pacientes.
     *
     * <p>La información retornada puede incluir datos como:
     * días con mayor demanda, horarios más concurridos,
     * o distribución de citas.</p>
     *
     * @return lista de objetos {@link ReporteAfluenciaDTO}
     * que contienen la información del reporte
     */
    List<ReporteAfluenciaDTO> obtenerReporteAfluencia();
}
