package utp.citas.citas.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import utp.citas.citas.model.Cita;
import utp.citas.citas.model.Doctor;
import utp.citas.citas.model.Especialidad;
import utp.citas.citas.model.Horario;
import utp.citas.citas.repository.DoctorRepository;
import utp.citas.citas.repository.EspecialidadRepository;
import utp.citas.citas.repository.HorarioRepository;
import utp.citas.citas.service.DoctorService;
import utp.citas.citas.repository.CitaRepository;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class DoctorServiceImpl implements DoctorService {

    private final DoctorRepository doctorRepository;
    private final EspecialidadRepository especialidadRepository;
    private final HorarioRepository horarioRepository;
    private final CitaRepository citaRepository;

    public DoctorServiceImpl(DoctorRepository doctorRepository,
                             EspecialidadRepository especialidadRepository,
                             HorarioRepository horarioRepository,
                             CitaRepository citaRepository) {
        this.doctorRepository = doctorRepository;
        this.especialidadRepository = especialidadRepository;
        this.horarioRepository = horarioRepository;
        this.citaRepository = citaRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Doctor> listarTodos() {
        return doctorRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Doctor> listarActivos() {
        return doctorRepository.findByActivoTrue();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Doctor> listarActivosPorEspecialidad(Integer idEspecialidad) {
        especialidadRepository.findById(idEspecialidad)
                .orElseThrow(() -> new NoSuchElementException(
                        "Especialidad no encontrada con id: " + idEspecialidad));
        return doctorRepository.findActivosByEspecialidad(idEspecialidad);
    }

    @Override
    @Transactional(readOnly = true)
    public Doctor buscarPorId(Integer id) {
        return doctorRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Doctor no encontrado con id: " + id));
    }

    @Override
    public Doctor crear(Doctor doctor) {
        if (doctorRepository.findByDni(doctor.getDni()).isPresent()) {
            throw new IllegalArgumentException(
                    "Ya existe un doctor con el DNI: " + doctor.getDni());
        }
        if (doctorRepository.existsByCorreo(doctor.getCorreo())) {
            throw new IllegalArgumentException(
                    "Ya existe un doctor con el correo: " + doctor.getCorreo());
        }
        Especialidad especialidad = especialidadRepository
                .findById(doctor.getEspecialidad().getIdEspecialidad())
                .orElseThrow(() -> new NoSuchElementException(
                        "Especialidad no encontrada con id: " + doctor.getEspecialidad().getIdEspecialidad()));
        doctor.setEspecialidad(especialidad);
        doctor.setActivo(true);
        return doctorRepository.save(doctor);
    }

    @Override
    public Doctor actualizar(Integer id, Doctor datos) {
        Doctor existente = buscarPorId(id);
        existente.setNombres(datos.getNombres());
        existente.setApellidos(datos.getApellidos());
        existente.setCorreo(datos.getCorreo());
        existente.setTelefono(datos.getTelefono());
        if (datos.getActivo() != null) {
            existente.setActivo(datos.getActivo());
        }
        if (datos.getEspecialidad() != null && datos.getEspecialidad().getIdEspecialidad() != null) {
            Especialidad especialidad = especialidadRepository
                    .findById(datos.getEspecialidad().getIdEspecialidad())
                    .orElseThrow(() -> new NoSuchElementException(
                            "Especialidad no encontrada con id: " + datos.getEspecialidad().getIdEspecialidad()));
            existente.setEspecialidad(especialidad);
        }
        return doctorRepository.save(existente);
    }

    @Override
    public void desactivar(Integer id) {
        buscarPorId(id);

        List<Horario> horariosActivos = horarioRepository.findActivosByDoctor(id);
        if (!horariosActivos.isEmpty()) {
            throw new IllegalArgumentException(
                    "No se puede eliminar al doctor porque tiene horarios de atención activos asignados."
            );
        }

        List<Cita> todasLasCitasDelDoctor = citaRepository.findAll().stream()
                .filter(cita -> cita.getDoctor() != null && id.equals(cita.getDoctor().getIdDoctor()))
                .collect(java.util.stream.Collectors.toList());

        if (!todasLasCitasDelDoctor.isEmpty()) {
            boolean tieneCitasActivas = todasLasCitasDelDoctor.stream()
                    .anyMatch(cita -> cita.getFechaCita() != null
                            && !cita.getFechaCita().isBefore(java.time.LocalDate.now())
                            && ("PENDIENTE".equalsIgnoreCase(cita.getEstado())
                            || "CONFIRMADA".equalsIgnoreCase(cita.getEstado())));

            if (tieneCitasActivas) {
                throw new IllegalArgumentException(
                        "No se puede eliminar al doctor porque cuenta con citas médicas activas pendientes de atención."
                );
            }
        }

        doctorRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Horario> obtenerHorarios(Integer idDoctor) {
        buscarPorId(idDoctor);
        return horarioRepository.findActivosByDoctor(idDoctor);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Horario> obtenerHorariosPorDia(Integer idDoctor, String diaSemana) {
        buscarPorId(idDoctor);
        return horarioRepository.findByDoctor_IdDoctorAndDiaSemanaAndActivoTrue(idDoctor, diaSemana.toUpperCase());
    }

    // Selección multiple
    @Override
    @Transactional
    public void registrarHorariosMultiplesRaw(Map<String, Object> payload) {
        Integer idDoctor = (Integer) payload.get("idDoctor");
        List<String> diasSemana = (List<String>) payload.get("diasSemana");

        LocalTime horaInicio = LocalTime.parse((String) payload.get("horaInicio"));
        LocalTime horaFin = LocalTime.parse((String) payload.get("horaFin"));

        if (diasSemana == null || diasSemana.isEmpty()) {
            throw new IllegalArgumentException("Debe seleccionar al menos un día de la semana.");
        }

        Doctor doctor = buscarPorId(idDoctor);
        for (String dia : diasSemana) {
            List<Horario> existentes = horarioRepository.findByDoctor_IdDoctorAndDiaSemanaAndActivoTrue(
                    doctor.getIdDoctor(),
                    dia
            );

            if (!existentes.isEmpty()) {
                throw new IllegalArgumentException("El especialista médico ya cuenta con un turno asignado para el día: " + dia);
            }

            Horario nuevoHorario = new Horario();
            nuevoHorario.setDoctor(doctor);
            nuevoHorario.setDiaSemana(dia);
            nuevoHorario.setHoraInicio(horaInicio);
            nuevoHorario.setHoraFin(horaFin);
            nuevoHorario.setActivo(true);

            horarioRepository.save(nuevoHorario);
        }
    }
}