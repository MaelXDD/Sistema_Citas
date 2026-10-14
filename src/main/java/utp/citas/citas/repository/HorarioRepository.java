package utp.citas.citas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import utp.citas.citas.model.Horario;

import java.util.List;

@Repository
public interface HorarioRepository extends JpaRepository<Horario, Integer> {
    @Query("SELECT h FROM Horario h JOIN FETCH h.doctor d JOIN FETCH d.especialidad e")
    List<Horario> listarHorariosConMedicos();

    @Query("SELECT h FROM Horario h JOIN FETCH h.doctor d WHERE d.idDoctor = :idDoctor AND h.activo = true")
    List<Horario> findActivosByDoctor(@Param("idDoctor") Integer idDoctor);

    @Query("SELECT h FROM Horario h JOIN FETCH h.doctor d JOIN FETCH d.especialidad WHERE h.activo = true")
    List<Horario> findAllActivos();
    List<Horario> findByDoctor_IdDoctorAndDiaSemanaAndActivoTrue(Integer idDoctor, String diaSemana);
}
