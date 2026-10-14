package utp.citas.citas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import utp.citas.citas.model.Cita;

import java.util.List;

@Repository
public interface ReporteAfluenciaRepository extends JpaRepository<Cita, Long> {

    @Query(value = "SELECT " +
            "  v.dia_semana AS diaSemana, " +
            "  v.turno AS turno, " +
            "  v.total_citas AS totalCitas, " +
            "  v.ingresos_turno AS ingresosTurno, " +
            "  (SELECT STRING_AGG(DISTINCT e.nombre, ', ') " +
            "   FROM citas c " +
            "   JOIN doctores d ON c.id_doctor = d.id_doctor " +
            "   JOIN especialidades e ON d.id_especialidad = e.id_especialidad " +
            "   WHERE c.estado != 'CANCELADA' " +
            "     AND EXTRACT(DOW FROM c.fecha_cita) = " +
            "         CASE v.dia_semana " +
            "           WHEN 'Domingo' THEN 0 WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 " +
            "           WHEN 'Miércoles' THEN 3 WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 WHEN 'Sábado' THEN 6 " +
            "         END " +
            "     AND ( " +
            "         (v.turno LIKE 'Mañana%' AND c.hora_cita < '12:00:00') OR " +
            "         (v.turno LIKE 'Tarde%' AND c.hora_cita >= '12:00:00') " +
            "     ) " +
            "  ) AS especialidades " +
            "FROM public.vista_reporte_afluencia v " +
            "ORDER BY " +
            "  CASE v.dia_semana " +
            "    WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miércoles' THEN 3 " +
            "    WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 WHEN 'Sábado' THEN 6 WHEN 'Domingo' THEN 7 " +
            "  END, " +
            "  v.turno DESC", nativeQuery = true)
    List<Object[]> obtenerAfluenciaRaw();
}