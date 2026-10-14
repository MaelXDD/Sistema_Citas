package utp.citas.citas.model;

public class ReporteAfluenciaDTO {
    private String diaSemana;
    private String turno;
    private Long totalCitas;
    private Double ingresosTurno;
    private String especialidades;


    public ReporteAfluenciaDTO(String diaSemana, String turno, Long totalCitas, Double ingresosTurno, String especialidades) {
        this.diaSemana = diaSemana;
        this.turno = turno;
        this.totalCitas = totalCitas;
        this.ingresosTurno = ingresosTurno;
        this.especialidades = especialidades;
    }


    public String getDiaSemana() { return diaSemana; }
    public void setDiaSemana(String diaSemana) { this.diaSemana = diaSemana; }

    public String getTurno() { return turno; }
    public void setTurno(String turno) { this.turno = turno; }

    public Long getTotalCitas() { return totalCitas; }
    public void setTotalCitas(Long totalCitas) { this.totalCitas = totalCitas; }

    public Double getIngresosTurno() { return ingresosTurno; }
    public void setIngresosTurno(Double ingresosTurno) { this.ingresosTurno = ingresosTurno; }

    public String getEspecialidades() { return especialidades; }
    public void setEspecialidades(String especialidades) { this.especialidades = especialidades; }
}