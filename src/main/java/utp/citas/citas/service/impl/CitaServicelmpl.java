package utp.citas.citas.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import utp.citas.citas.model.Cita;
import utp.citas.citas.repository.CitaRepository;
import utp.citas.citas.service.CitaService;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CitaServicelmpl implements CitaService {

    private final CitaRepository citaRepository;

    @Override
    public List<Cita> obtenerPorPaciente(Integer idPaciente) {
        return citaRepository.findByPaciente_IdPaciente(idPaciente);
    }

    @Override
    public void eliminarCita(Integer idCita) {

    }
}
