package utp.citas.citas;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.NoSuchElementException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import utp.citas.citas.model.Cita;
import utp.citas.citas.model.Pago;
import utp.citas.citas.repository.CitaRepository;
import utp.citas.citas.repository.PagoRepository;
import utp.citas.citas.service.impl.PagoServiceImpl;

@ExtendWith(MockitoExtension.class)
public class PagoServiceTest {

    @Mock
    private PagoRepository pagoRepository;

    @Mock
    private CitaRepository citaRepository;

    @InjectMocks
    private PagoServiceImpl pagoService;

    /**
     * PRUEBA 1: Si el pago tiene estado 'COMPLETADO', la cita asociada debe pasar a 'CONFIRMADA'.
     */
    @Test
    void cuandoRegistrarPagoExitosoYCompletado_entoncesConfirmarCita() {
        // ARRANGE
        Cita citaSimulada = new Cita();
        citaSimulada.setIdCita(1);
        citaSimulada.setEstado("PENDIENTE");

        Pago pagoInput = new Pago();
        pagoInput.setCita(citaSimulada);
        pagoInput.setMonto(new BigDecimal("30.00"));
        pagoInput.setMetodoPago("YAPE");
        pagoInput.setEstadoPago("COMPLETADO");

        when(citaRepository.findById(1)).thenReturn(Optional.of(citaSimulada));
        when(pagoRepository.findByCita_IdCita(1)).thenReturn(Optional.empty());
        when(pagoRepository.save(any(Pago.class))).thenReturn(pagoInput);

        Pago resultado = pagoService.registrarPago(pagoInput);

        assertNotNull(resultado);
        assertEquals("CONFIRMADA", citaSimulada.getEstado());
        verify(citaRepository, times(1)).save(citaSimulada);
        verify(pagoRepository, times(1)).save(pagoInput);
    }


    /**
     * Prueba 2: Validamos los duplicados intentando registrar un pago para una cita que
     * ya tiene un pago previo, por lo tanto el sistema nos lanzará IllegalStateException
     */
    @Test
    void cuandoRegistrarPagoDeCitaConPagoExistente_entoncesLanzarIllegalStateException() {
        Cita citaConPago = new Cita();
        citaConPago.setIdCita(5);

        Pago pagoExistenteEnBD = new Pago();
        pagoExistenteEnBD.setIdPago(100);
        pagoExistenteEnBD.setCita(citaConPago);

        Pago nuevoPagoInput = new Pago();
        nuevoPagoInput.setCita(citaConPago);

        when(citaRepository.findById(5)).thenReturn(Optional.of(citaConPago));
        when(pagoRepository.findByCita_IdCita(5)).thenReturn(Optional.of(pagoExistenteEnBD));

        assertThrows(IllegalStateException.class, () -> {
            pagoService.registrarPago(nuevoPagoInput);
        });

        verify(pagoRepository, never()).save(any(Pago.class));
    }
}

