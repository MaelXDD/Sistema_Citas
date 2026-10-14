package utp.citas.citas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import utp.citas.citas.model.Especialidad;

import java.util.List;

@Repository
public interface EspecialidadRepository extends JpaRepository<Especialidad, Integer> {

    // Listar solo las especialidades activas
    List<Especialidad> findByActivoTrue();

    // Verificar si el nombre ya existe (útil para validar duplicados al crear)
    boolean existsByNombreIgnoreCase(String nombre);
}
