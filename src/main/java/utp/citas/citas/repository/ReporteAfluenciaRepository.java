package utp.citas.citas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import utp.citas.citas.model.Cita;

import java.util.List;

@Repository
public interface ReporteAfluenciaRepository extends JpaRepository<Cita, Long> {

    @Query(value = """
        SELECT
            v.dia_semana AS diaSemana,
            v.turno AS turno,
            v.total_citas AS totalCitas,
            v.ingresos_turno AS ingresosTurno,
            (SELECT STRING_AGG(DISTINCT e.nombre, ', ')
               FROM citas c
               JOIN doctores d ON c.id_doctor = d.id_doctor
               JOIN especialidades e ON d.id_especialidad = e.id_especialidad
              WHERE c.estado != 'CANCELADA'
                AND (CASE EXTRACT(DOW FROM c.fecha_cita)
                         WHEN 0 THEN 'Domingo' WHEN 1 THEN 'Lunes' WHEN 2 THEN 'Martes'
                         WHEN 3 THEN 'Miércoles' WHEN 4 THEN 'Jueves' WHEN 5 THEN 'Viernes'
                         WHEN 6 THEN 'Sábado'
                     END) = v.dia_semana
                AND (CASE WHEN c.hora_cita < TIME '12:00:00' THEN 'Mañana' ELSE 'Tarde' END) = v.turno
            ) AS especialidades
        FROM (
            SELECT
                CASE EXTRACT(DOW FROM c2.fecha_cita)
                    WHEN 0 THEN 'Domingo' WHEN 1 THEN 'Lunes' WHEN 2 THEN 'Martes'
                    WHEN 3 THEN 'Miércoles' WHEN 4 THEN 'Jueves' WHEN 5 THEN 'Viernes'
                    WHEN 6 THEN 'Sábado'
                END AS dia_semana,
                CASE WHEN c2.hora_cita < TIME '12:00:00' THEN 'Mañana' ELSE 'Tarde' END AS turno,
                COUNT(c2.id_cita) AS total_citas,
                COALESCE(SUM(pa.monto), 0) AS ingresos_turno
            FROM citas c2
            LEFT JOIN pagos pa
                   ON pa.id_cita = c2.id_cita
                  AND pa.estado_pago = 'COMPLETADO'
            WHERE c2.estado != 'CANCELADA'
            GROUP BY 1, 2
        ) v
        ORDER BY
            CASE v.dia_semana
                WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miércoles' THEN 3
                WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 WHEN 'Sábado' THEN 6
                WHEN 'Domingo' THEN 7
            END,
            v.turno DESC
        """, nativeQuery = true)
    List<Object[]> obtenerAfluenciaRaw();
}