package utp.citas.citas.service;

import utp.citas.citas.model.Pago;

import java.util.List;

/**

 * Interfaz de servicio para la gestión de pagos en el sistema de citas médicas.
 *
 * <p>Define las operaciones relacionadas con el registro, consulta y actualización
 * de pagos realizados por los pacientes.</p>
 *
 * <p>También contempla la lógica de negocio asociada a la confirmación de citas
 * cuando un pago es completado.</p>
 */
public interface PagoService {

    /**

     * Registra un nuevo pago en el sistema.
     *
     * @param pago objeto Pago con la información a registrar
     * @return el pago guardado en la base de datos
     */
    Pago registrarPago(Pago pago);

    /**

     * Busca un pago por su identificador único.
     *
     * @param id identificador del pago
     * @return el pago encontrado o null si no existe
     */
    Pago buscarPorId(Integer id);

    /**

     * Busca el pago asociado a una cita específica.
     *
     * @param idCita identificador de la cita
     * @return el pago correspondiente a la cita o null si no existe
     */
    Pago buscarPorCita(Integer idCita);

    /**

     * Lista todos los pagos realizados por un paciente.
     *
     * @param idPaciente identificador del paciente
     * @return lista de pagos asociados al paciente
     */
    List<Pago> listarPorPaciente(Integer idPaciente);

    /**

     * Lista los pagos filtrados por estado.
     *
     * <p>Ejemplos de estados: PENDIENTE, COMPLETADO, CANCELADO.</p>
     *
     * @param estadoPago estado del pago
     * @return lista de pagos que coinciden con el estado indicado
     */
    List<Pago> listarPorEstado(String estadoPago);

    /**

     * Actualiza el estado de un pago existente.
     *
     * <p>Si el nuevo estado es "COMPLETADO", se ejecuta la lógica
     * adicional de confirmación de la cita asociada.</p>
     *
     * @param idPago identificador del pago
     * @param nuevoEstado nuevo estado del pago
     * @return el pago actualizado
     */
    Pago actualizarEstado(Integer idPago, String nuevoEstado);
}
