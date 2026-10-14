package utp.citas.citas.service;

import utp.citas.citas.model.Doctor;
import utp.citas.citas.model.Horario;

import java.util.List;
import java.util.Map;

/**
 * Servicio encargado de la gestion de doctores y sus horarios de atencion.
 * Define las operaciones de consulta, registro, actualizacion y desactivacion
 * de doctores, asi como la administracion de sus horarios.
 */
public interface DoctorService {

    /**
     * Lista todos los doctores registrados en el sistema, sin importar su estado.
     *
     * @return lista completa de doctores
     */
    List<Doctor> listarTodos();

    /**
     * Lista unicamente los doctores que se encuentran activos.
     *
     * @return lista de doctores activos
     */
    List<Doctor> listarActivos();

    /**
     * Lista los doctores activos que pertenecen a una especialidad especifica.
     *
     * @param idEspecialidad identificador de la especialidad
     * @return lista de doctores activos asociados a la especialidad
     */
    List<Doctor> listarActivosPorEspecialidad(Integer idEspecialidad);

    /**
     * Busca un doctor a partir de su identificador.
     *
     * @param id identificador del doctor
     * @return doctor encontrado, o {@code null} si no existe
     */
    Doctor buscarPorId(Integer id);

    /**
     * Registra un nuevo doctor en el sistema.
     *
     * @param doctor datos del doctor a crear
     * @return doctor creado, con su identificador asignado
     */
    Doctor crear(Doctor doctor);

    /**
     * Actualiza los datos de un doctor existente.
     *
     * @param id     identificador del doctor a actualizar
     * @param doctor datos nuevos del doctor
     * @return doctor actualizado
     */
    Doctor actualizar(Integer id, Doctor doctor);

    /**
     * Desactiva un doctor, impidiendo que siga siendo asignado a nuevas citas.
     *
     * @param id identificador del doctor a desactivar
     */
    void desactivar(Integer id);

    /**
     * Registra multiples horarios de un doctor a partir de un payload
     * en formato libre (clave-valor).
     *
     * @param payload datos crudos con la informacion de los horarios a registrar
     */
    void registrarHorariosMultiplesRaw(Map<String, Object> payload);

    // Horarios del doctor

    /**
     * Obtiene todos los horarios registrados de un doctor.
     *
     * @param idDoctor identificador del doctor
     * @return lista de horarios del doctor
     */
    List<Horario> obtenerHorarios(Integer idDoctor);

    /**
     * Obtiene los horarios de un doctor filtrados por dia de la semana.
     *
     * @param idDoctor  identificador del doctor
     * @param diaSemana dia de la semana a filtrar (ej. "LUNES", "MARTES")
     * @return lista de horarios del doctor para el dia indicado
     */
    List<Horario> obtenerHorariosPorDia(Integer idDoctor, String diaSemana);
}