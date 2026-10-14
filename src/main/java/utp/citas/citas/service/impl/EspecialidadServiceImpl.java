package utp.citas.citas.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import utp.citas.citas.model.Especialidad;
import utp.citas.citas.repository.EspecialidadRepository;
import utp.citas.citas.service.EspecialidadService;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@Transactional
public class EspecialidadServiceImpl implements EspecialidadService {

    private final EspecialidadRepository especialidadRepository;

    // Inyección por constructor (mejor práctica Spring Boot)
    public EspecialidadServiceImpl(EspecialidadRepository especialidadRepository) {
        this.especialidadRepository = especialidadRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Especialidad> listarTodas() {
        return especialidadRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Especialidad> listarActivas() {
        return especialidadRepository.findByActivoTrue();
    }

    @Override
    @Transactional(readOnly = true)
    public Especialidad buscarPorId(Integer id) {
        return especialidadRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Especialidad no encontrada con id: " + id));
    }

    @Override
    public Especialidad crear(Especialidad especialidad) {
        if (especialidadRepository.existsByNombreIgnoreCase(especialidad.getNombre())) {
            throw new IllegalArgumentException(
                    "Ya existe una especialidad con el nombre: " + especialidad.getNombre());
        }
        especialidad.setActivo(true);
        return especialidadRepository.save(especialidad);
    }

    @Override
    public Especialidad actualizar(Integer id, Especialidad datos) {
        Especialidad existente = buscarPorId(id);
        existente.setNombre(datos.getNombre());
        existente.setDescripcion(datos.getDescripcion());
        if (datos.getActivo() != null) {
            existente.setActivo(datos.getActivo());
        }
        return especialidadRepository.save(existente);
    }

    @Override
    public void desactivar(Integer id) {
        Especialidad especialidad = buscarPorId(id);
        especialidad.setActivo(false);
        especialidadRepository.save(especialidad);
    }
    @Override
    public void activar(Integer id) {
        Especialidad especialidad = especialidadRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Especialidad no encontrada"));
        especialidad.setActivo(true);
        especialidadRepository.save(especialidad);
    }
}
