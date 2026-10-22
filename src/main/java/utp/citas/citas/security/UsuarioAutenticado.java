package utp.citas.citas.security;

/** Identidad extraída del JWT. Es lo único en lo que confía el módulo del bot. */
public record UsuarioAutenticado(Integer id, String rol, String nombre) {
}
