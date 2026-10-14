package utp.citas.citas.service.impl;



import org.springframework.stereotype.Service;
import utp.citas.citas.model.ReporteAfluenciaDTO;
import utp.citas.citas.repository.ReporteAfluenciaRepository;
import utp.citas.citas.service.ReporteAfluenciaService;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReporteAfluenciaServiceImpl implements ReporteAfluenciaService {

    private final ReporteAfluenciaRepository repository;

    public ReporteAfluenciaServiceImpl(ReporteAfluenciaRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<ReporteAfluenciaDTO> obtenerReporteAfluencia() {
        return repository.obtenerAfluenciaRaw().stream()
                .map(row -> new ReporteAfluenciaDTO(
                        (String) row[0],
                        (String) row[1],
                        row[2] != null ? ((Number) row[2]).longValue() : 0L,
                        row[3] != null ? ((Number) row[3]).doubleValue() : 0.0,
                        row[4] != null ? (String) row[4] : "Sin especialidades"
                ))
                .collect(Collectors.toList());
    }
}