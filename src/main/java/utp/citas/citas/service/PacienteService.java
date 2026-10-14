package utp.citas.citas.service;

import utp.citas.citas.model.Paciente;
import java.util.List;

/**
 * Servicio encargado de la gestion de los pacientes.
 * Define las operaciones de consulta, registro, actualizacion,
 * eliminacion y autenticacion de pacientes.
 */
public interface PacienteService {

    /**
     * Lista todos los pacientes registrados en el sistema.
     *
     * @return lista completa de pacientes
     */
    List<Paciente> listarTodos();

    /**
     * Busca un paciente a partir de su identificador.
     *
     * @param id identificador del paciente
     * @return paciente encontrado, o {@code null} si no existe
     */
    Paciente buscarPorId(Integer id);

    /**
     * Registra un nuevo paciente en el sistema.
     *
     * @param paciente datos del paciente a registrar
     * @return paciente registrado, con su identificador asignado
     */
    Paciente registrar(Paciente paciente);

    /**
     * Actualiza los datos de un paciente existente.
     *
     * @param id       identificador del paciente a actualizar
     * @param paciente datos nuevos del paciente
     * @return paciente actualizado
     */
    Paciente actualizar(Integer id, Paciente paciente);

    /**
     * Elimina un paciente del sistema a partir de su identificador.
     *
     * @param id identificador del paciente a eliminar
     */
    void eliminar(Integer id);

    /**
     * Autentica a un paciente a partir de su correo y contrasena.
     *
     * @param correo   correo electronico del paciente
     * @param password contrasena del paciente
     * @return paciente autenticado, o {@code null} si las credenciales no son validas
     */
    Paciente login(String correo, String password);
}