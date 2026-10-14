package utp.citas.citas.service;

import utp.citas.citas.model.Especialidad;

import java.util.List;

/**
 * Servicio encargado de la gestion de las especialidades medicas.
 * Define las operaciones de consulta, registro, actualizacion,
 * activacion y desactivacion de especialidades.
 */
public interface EspecialidadService {

    /**
     * Lista todas las especialidades registradas, sin importar su estado.
     *
     * @return lista completa de especialidades
     */
    List<Especialidad> listarTodas();

    /**
     * Lista unicamente las especialidades que se encuentran activas.
     *
     * @return lista de especialidades activas
     */
    List<Especialidad> listarActivas();

    /**
     * Busca una especialidad a partir de su identificador.
     *
     * @param id identificador de la especialidad
     * @return especialidad encontrada, o {@code null} si no existe
     */
    Especialidad buscarPorId(Integer id);

    /**
     * Registra una nueva especialidad en el sistema.
     *
     * @param especialidad datos de la especialidad a crear
     * @return especialidad creada, con su identificador asignado
     */
    Especialidad crear(Especialidad especialidad);

    /**
     * Actualiza los datos de una especialidad existente.
     *
     * @param id            identificador de la especialidad a actualizar
     * @param especialidad  datos nuevos de la especialidad
     * @return especialidad actualizada
     */
    Especialidad actualizar(Integer id, Especialidad especialidad);

    /**
     * Desactiva una especialidad, impidiendo que sea utilizada para
     * nuevos registros de doctores o citas.
     *
     * @param id identificador de la especialidad a desactivar
     */
    void desactivar(Integer id);

    /**
     * Activa una especialidad previamente desactivada.
     *
     * @param id identificador de la especialidad a activar
     */
    void activar(Integer id);
}