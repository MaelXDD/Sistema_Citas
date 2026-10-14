package utp.citas.citas;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import utp.citas.citas.model.Doctor;
import utp.citas.citas.model.Especialidad;
import utp.citas.citas.model.Paciente;
import utp.citas.citas.repository.DoctorRepository;
import utp.citas.citas.repository.EspecialidadRepository;
import utp.citas.citas.repository.PacienteRepository;
import utp.citas.citas.service.impl.DoctorServiceImpl;
import utp.citas.citas.service.impl.PacienteServiceImpl;

@ExtendWith(MockitoExtension.class)
public class RelacionesIntegridadTest {

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private EspecialidadRepository especialidadRepository;

    @Mock
    private PacienteRepository pacienteRepository;

    @Mock
    private BCryptPasswordEncoder passwordEncoder;

    @InjectMocks
    private DoctorServiceImpl doctorService;

    @InjectMocks
    private PacienteServiceImpl pacienteService;

    /**
     * PRUEBA 1: Registrar un nuevo doctor con un DNI ya registrado.
     * Objetivo: Verificar que el sistema bloquee el registro si el DNI ya existe.
     */
    @Test
    void cuandoRegistrarDoctorConDniDuplicado_entoncesLanzarIllegalArgumentException() {
        Doctor doctorExistente = new Doctor();
        doctorExistente.setDni("12345678");

        Doctor nuevoDoctorInput = new Doctor();
        nuevoDoctorInput.setDni("12345678");

        // Simulamos que el repositorio ya encuentra un doctor con ese DNI
        when(doctorRepository.findByDni("12345678")).thenReturn(Optional.of(doctorExistente));

        assertThrows(IllegalArgumentException.class, () -> {
            doctorService.crear(nuevoDoctorInput);
        }, "Debería lanzar IllegalArgumentException porque el DNI ya está registrado.");

        verify(doctorRepository, never()).save(any(Doctor.class));
    }

    /**
     * PRUEBA 2: Crear un doctor correctamente asignándole una especialidad existente.
     * Objetivo: Validar el flujo ideal ("Camino Feliz") de registro de personal médico.
     */
    @Test
    void cuandoRegistrarDoctorCorrecto_entoncesGuardarExitosamente() {
        Especialidad especialidadExistente = new Especialidad();
        especialidadExistente.setIdEspecialidad(2);
        especialidadExistente.setNombre("Pediatría");

        Doctor doctorInput = new Doctor();
        doctorInput.setDni("87654321");
        doctorInput.setNombres("Carlos");
        doctorInput.setApellidos("Mendoza");
        doctorInput.setCorreo("carlos.mendoza@solidaridad.pe");
        doctorInput.setEspecialidad(especialidadExistente);

        when(doctorRepository.findByDni("87654321")).thenReturn(Optional.empty());
        when(doctorRepository.existsByCorreo("carlos.mendoza@solidaridad.pe")).thenReturn(false);
        when(especialidadRepository.findById(2)).thenReturn(Optional.of(especialidadExistente));
        when(doctorRepository.save(any(Doctor.class))).thenReturn(doctorInput);

        Doctor resultado = doctorService.crear(doctorInput);

        assertNotNull(resultado);
        assertTrue(resultado.getActivo(), "El doctor debería registrarse con estado activo = true.");
        assertEquals("Pediatría", resultado.getEspecialidad().getNombre());
        verify(doctorRepository, times(1)).save(doctorInput);
    }

    /**
     * PRUEBA 3: Registrar un paciente nuevo.
     * Objetivo: Validar la creación de una cuenta de paciente y la correcta encriptación de su clave.
     */
    @Test
    void cuandoRegistrarPacienteNuevo_entoncesHashearPasswordYGuardar() {
        Paciente nuevoPaciente = new Paciente();
        nuevoPaciente.setDni("44556677");
        nuevoPaciente.setCorreo("alejandro@mail.com");
        nuevoPaciente.setPassword("clave123");

        when(pacienteRepository.existsByCorreo("alejandro@mail.com")).thenReturn(false);
        when(pacienteRepository.findByDni("44556677")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("clave123")).thenReturn("passwordHasheadaXYZ");
        when(pacienteRepository.save(any(Paciente.class))).thenReturn(nuevoPaciente);

        Paciente resultado = pacienteService.registrar(nuevoPaciente);

        assertNotNull(resultado);
        verify(passwordEncoder, times(1)).encode("clave123");
        verify(pacienteRepository, times(1)).save(nuevoPaciente);
    }

    /**
     * PRUEBA 4: Intentar un login con las credenciales incorrectas.
     * Objetivo: Asegurar que el sistema rechace el acceso si la contraseña no coincide.
     */
    @Test
    void cuandoLoginConClaveIncorrecta_entoncesLanzarIllegalArgumentException() {
        Paciente pacienteEnBD = new Paciente();
        pacienteEnBD.setCorreo("user@test.com");
        pacienteEnBD.setPassword("passwordHasheadaCorrecta");

        when(pacienteRepository.findByCorreo("user@test.com")).thenReturn(Optional.of(pacienteEnBD));
        // Simulamos que la contraseña ingresada no coincide con el hash guardado
        when(passwordEncoder.matches("claveErronea", "passwordHasheadaCorrecta")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> {
            pacienteService.login("user@test.com", "claveErronea");
        }, "Debería rechazar el acceso arrojando IllegalArgumentException debido a contraseña incorrecta.");
    }
}