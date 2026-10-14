package utp.citas.citas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import utp.citas.citas.model.Precio;

import java.util.List;
import java.util.Optional;

@Repository
public interface PrecioRepository extends JpaRepository<Precio, Integer> {

    // Todos los precios activos con especialidad cargada
    @Query("SELECT p FROM Precio p JOIN FETCH p.especialidad e WHERE p.activo = true")
    List<Precio> findAllActivos();

    // Precio activo de una especialidad específica
    @Query("SELECT p FROM Precio p JOIN FETCH p.especialidad e WHERE e.idEspecialidad = :idEspecialidad AND p.activo = true")
    Optional<Precio> findByEspecialidad(@Param("idEspecialidad") Integer idEspecialidad);

    // Busca el precio activo de una especialidad específica
    Optional<Precio> findByEspecialidad_IdEspecialidadAndActivoTrue(Integer idEspecialidad);
}