package utp.citas.citas.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import utp.citas.citas.model.Pago;

import java.util.List;
import java.util.Optional;

@Repository
public interface PagoRepository extends JpaRepository<Pago, Integer> {

    Optional<Pago> findByCita_IdCita(Integer idCita);

    @Transactional
    void deleteByCita_IdCita(Integer idCita);

    @Query("SELECT p FROM Pago p JOIN FETCH p.cita c JOIN FETCH c.paciente pac WHERE pac.idPaciente = :idPaciente")
    List<Pago> findByPaciente(@Param("idPaciente") Integer idPaciente);

    List<Pago> findByEstadoPago(String estadoPago);
}