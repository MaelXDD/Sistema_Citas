package utp.citas.citas.model;

import java.math.BigDecimal;

public class DoctorCitasDTO {

    private String especialidad;
    private String nombres;
    private String apellidos;
    private Long   totalCitas;
    private BigDecimal ingresos;

    public DoctorCitasDTO(String especialidad, String nombres,
                          String apellidos, Long totalCitas, BigDecimal ingresos) {
        this.especialidad = especialidad;
        this.nombres      = nombres;
        this.apellidos    = apellidos;
        this.totalCitas   = totalCitas;
        this.ingresos     = ingresos;
    }

    public String getEspecialidad() { return especialidad; }
    public String getNombres()      { return nombres; }
    public String getApellidos()    { return apellidos; }
    public Long   getTotalCitas()   { return totalCitas; }
    public BigDecimal getIngresos()     { return ingresos;}
}