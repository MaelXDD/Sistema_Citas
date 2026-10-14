package utp.citas.citas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import utp.citas.citas.model.Doctor;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Integer> {

    // Listar doctores activos
    List<Doctor> findByActivoTrue();

    // Buscar doctores activos por especialidad (para el frontend de disponibilidad)
    @Query("SELECT d FROM Doctor d JOIN FETCH d.especialidad e WHERE e.idEspecialidad = :idEspecialidad AND d.activo = true")
    List<Doctor> findActivosByEspecialidad(@Param("idEspecialidad") Integer idEspecialidad);

    // Buscar por DNI para evitar duplicados
    Optional<Doctor> findByDni(String dni);

    // Buscar por correo para evitar duplicados
    boolean existsByCorreo(String correo);
}
