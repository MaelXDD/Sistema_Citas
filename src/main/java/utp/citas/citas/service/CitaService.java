package utp.citas.citas.service;

import utp.citas.citas.model.Cita;

import java.util.List;

/**
 * Servicio encargado de la gestion de las citas medicas.
 * Define las operaciones de consulta y eliminacion sobre las citas
 * registradas en el sistema.
 */
public interface CitaService {

    /**
     * Obtiene todas las citas registradas para un paciente especifico.
     *
     * @param idPaciente identificador del paciente
     * @return lista de citas asociadas al paciente
     */
    List<Cita> obtenerPorPaciente(Integer idPaciente);

    /**
     * Elimina una cita del sistema a partir de su identificador.
     *
     * @param idCita identificador de la cita a eliminar
     */
    void eliminarCita(Integer idCita);
}