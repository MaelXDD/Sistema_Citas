package utp.citas.citas.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import utp.citas.citas.model.Paciente;
import utp.citas.citas.repository.PacienteRepository;
import utp.citas.citas.service.PacienteService;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class PacienteServiceImpl implements PacienteService {

    private final PacienteRepository pacienteRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public List<Paciente> listarTodos() {
        return pacienteRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Paciente buscarPorId(Integer id) {
        return pacienteRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Paciente no encontrado con ID: " + id));
    }

    @Override
    @Transactional
    public Paciente registrar(Paciente paciente) {
        // El teléfono es obligatorio solo al registrarse (hay pacientes antiguos sin teléfono)
        String telefono = paciente.getTelefono() == null ? "" : paciente.getTelefono().trim();
        if (!telefono.matches("\\d{9}")) {
            throw new IllegalArgumentException("El teléfono es obligatorio y debe tener 9 dígitos.");
        }
        paciente.setTelefono(telefono);

        if (pacienteRepository.existsByCorreo(paciente.getCorreo())) {
            throw new IllegalArgumentException("El correo ya está registrado.");
        }
        if (pacienteRepository.findByDni(paciente.getDni()).isPresent()) {
            throw new IllegalArgumentException("El DNI ingresado ya se encuentra registrado.");
        }

        String passwordHasheada = passwordEncoder.encode(paciente.getPassword());
        paciente.setPassword(passwordHasheada);

        return pacienteRepository.save(paciente);
    }
    @Override
    @Transactional
    public Paciente actualizar(Integer id, Paciente paciente) {
        Paciente pacienteExistente = buscarPorId(id);

        pacienteExistente.setNombres(paciente.getNombres());
        pacienteExistente.setApellidos(paciente.getApellidos());
        pacienteExistente.setTelefono(paciente.getTelefono());

        if (paciente.getPassword() != null && !paciente.getPassword().isEmpty()) {
            pacienteExistente.setPassword(passwordEncoder.encode(paciente.getPassword()));
        }

        return pacienteRepository.save(pacienteExistente);
    }
    @Override
    @Transactional
    public void eliminar(Integer id) {
        Paciente paciente = buscarPorId(id);
        paciente.setActivo(false);
        pacienteRepository.save(paciente);
    }

    @Override
    @Transactional(readOnly = true)
    public Paciente login(String correo, String password) {
        Paciente paciente = pacienteRepository.findByCorreo(correo)
                .orElseThrow(() -> new IllegalArgumentException("Correo o contraseña incorrectos."));

        if (!passwordEncoder.matches(password, paciente.getPassword())) {
            throw new IllegalArgumentException("Correo o contraseña incorrectos.");
        }

        return paciente;
    }
}