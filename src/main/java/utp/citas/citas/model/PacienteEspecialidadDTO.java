package utp.citas.citas.model;

import java.math.BigDecimal;

public class PacienteEspecialidadDTO {
    private String nombres;
    private String apellidos;
    private BigDecimal totalPagos;
    private Long cantidadCitas;

    public PacienteEspecialidadDTO() {
    }

    public PacienteEspecialidadDTO(String nombres, String apellidos,
                                   BigDecimal totalPagos, Long cantidadCitas) {
        this.nombres       = nombres;
        this.apellidos     = apellidos;
        this.totalPagos    = totalPagos;
        this.cantidadCitas = cantidadCitas;
    }

    public String getNombres() { return nombres; }
    public void setNombres(String nombres) { this.nombres = nombres; }

    public String getApellidos() { return apellidos; }
    public void setApellidos(String apellidos) { this.apellidos = apellidos; }

    public BigDecimal getTotalPagos() { return totalPagos; }
    public void setTotalPagos(BigDecimal totalPagos) { this.totalPagos = totalPagos; }

    public Long getCantidadCitas() { return cantidadCitas; }
    public void setCantidadCitas(Long cantidadCitas) { this.cantidadCitas = cantidadCitas; }
}

