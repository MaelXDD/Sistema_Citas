package utp.citas.citas.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import utp.citas.citas.model.Paciente;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

/**
 * Emite y valida el JWT (HS256) que comparten este backend y el servicio del bot (Python).
 *
 * Si {@code bot.jwt.secret} no está configurado el servicio queda desactivado:
 * el login sigue funcionando igual que antes (sin token) y /api/bot/** responde 401.
 */
@Service
public class JwtService {

    private final SecretKey key;
    private final String issuer;
    private final long ttlHoras;

    public JwtService(@Value("${bot.jwt.secret:}") String secret,
                      @Value("${bot.jwt.issuer:citas-api}") String issuer,
                      @Value("${bot.jwt.ttl-hours:8}") long ttlHoras) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length == 0) {
            this.key = null;
        } else if (bytes.length < 32) {
            throw new IllegalStateException("bot.jwt.secret debe tener al menos 32 caracteres");
        } else {
            this.key = Keys.hmacShaKeyFor(bytes);
        }
        this.issuer = issuer;
        this.ttlHoras = ttlHoras;
    }

    public boolean habilitado() {
        return key != null;
    }

    /** @return el token, o null si el servicio está desactivado. */
    public String emitir(Paciente p) {
        if (!habilitado()) return null;
        Instant ahora = Instant.now();
        return Jwts.builder()
                .setSubject(String.valueOf(p.getIdPaciente()))
                .setIssuer(issuer)
                .setIssuedAt(Date.from(ahora))
                .setExpiration(Date.from(ahora.plusSeconds(ttlHoras * 3600)))
                .claim("rol", p.getRol())
                .claim("nombre", p.getNombres())
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Optional<UsuarioAutenticado> validar(String token) {
        if (!habilitado() || token == null || token.isBlank()) return Optional.empty();
        try {
            Claims c = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .requireIssuer(issuer)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            return Optional.of(new UsuarioAutenticado(
                    Integer.valueOf(c.getSubject()),
                    c.get("rol", String.class),
                    c.get("nombre", String.class)));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
