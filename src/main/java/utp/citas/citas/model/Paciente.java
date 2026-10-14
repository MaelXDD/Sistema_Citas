package utp.citas.citas.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Entity
@Table(name = "pacientes")
@Data
public class Paciente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_paciente")
    private Integer idPaciente;

    @NotBlank(message = "Los nombres son obligatorios.")
    private String nombres;

    @NotBlank(message = "Los apellidos son obligatorios.")
    private String apellidos;

    @NotBlank(message = "El correo es obligatorio.")
    @Email(message = "Ingresa un correo electrónico válido.")
    @Column(unique = true)
    private String correo;

    @NotBlank(message = "El DNI es obligatorio.")
    @Size(min = 8, max = 15, message = "El DNI debe tener entre 8 y 15 dígitos.")
    @Column(unique = true)
    private String dni;

    private String telefono;

    @NotNull(message = "La fecha de nacimiento es obligatoria")
    @Column(name = "fecha_nac", nullable = false)
    private LocalDate fechaNac;

    @NotBlank(message = "La dirección es obligatoria")
    @Column(name = "direccion", nullable = false)
    private String direccion;

    @NotBlank(message = "La contraseña es obligatoria.")
    @Size(max = 255)
    @Column(name = "contraseña", nullable = false)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    @Column(name = "activo")
    private Boolean activo = true;

    @Column(name = "rol", nullable = false, length = 20)
    private String rol = "PACIENTE";
}