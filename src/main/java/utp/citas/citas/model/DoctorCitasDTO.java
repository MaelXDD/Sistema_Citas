package utp.citas.citas.model;

import java.math.BigDecimal;

public class DoctorCitasDTO {

    private String especialidad;
    private String nombres;
    private String apellidos;
    private Long   totalCitas;
    private BigDecimal ingresos;
    private String fotoUrl;

    public DoctorCitasDTO(String especialidad, String nombres,
                          String apellidos, Long totalCitas, BigDecimal ingresos) {
        this(especialidad, nombres, apellidos, totalCitas, ingresos, null);
    }

    public DoctorCitasDTO(String especialidad, String nombres,
                          String apellidos, Long totalCitas, BigDecimal ingresos,
                          String fotoUrl) {
        this.especialidad = especialidad;
        this.nombres      = nombres;
        this.apellidos    = apellidos;
        this.totalCitas   = totalCitas;
        this.ingresos     = ingresos;
        this.fotoUrl      = fotoUrl;
    }

    public String getEspecialidad() { return especialidad; }
    public String getNombres()      { return nombres; }
    public String getApellidos()    { return apellidos; }
    public Long   getTotalCitas()   { return totalCitas; }
    public BigDecimal getIngresos() { return ingresos; }
    public String getFotoUrl()      { return fotoUrl; }
}