package utp.citas.citas.controller;

import java.math.BigDecimal;

public class EspecialidadDTO {
    private String nombre;
    private Long totalCitas;
    private Long pacientes;
    private BigDecimal ingresos;


    public EspecialidadDTO(String nombre, Long totalCitas, Long pacientes, BigDecimal ingresos) {
        this.nombre = nombre;
        this.totalCitas = totalCitas;
        this.pacientes = pacientes;
        this.ingresos = ingresos;
    }


    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public Long getTotalCitas() { return totalCitas; }
    public void setTotalCitas(Long totalCitas) { this.totalCitas = totalCitas; }

    public Long getPacientes() { return pacientes; }
    public void setPacientes(Long pacientes) { this.pacientes = pacientes; }

    public BigDecimal getIngresos() { return ingresos; }
    public void setIngresos(BigDecimal ingresos) { this.ingresos = ingresos; }
}