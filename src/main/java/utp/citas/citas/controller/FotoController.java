package utp.citas.citas.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

@RestController
@RequestMapping("/api/fotos")
public class FotoController {

    @Value("${supabase.url}")
    private String supabaseUrl;

    // Clave clásica (JWT eyJ...) exclusiva para el Storage
    @Value("${supabase.storage.key}")
    private String storageKey;

    @Value("${supabase.bucket.doctores}")
    private String bucket;

    private final HttpClient http = HttpClient.newHttpClient();

    private HttpRequest.Builder peticion(String ruta) {
        return HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/storage/v1/object/" + ruta))
                .header("apikey", storageKey)
                .header("Authorization", "Bearer " + storageKey);
    }

    @PostMapping("/doctores")
    public ResponseEntity<Map<String, String>> subir(@RequestParam("archivo") MultipartFile archivo)
            throws Exception {
        String tipo = archivo.getContentType();
        if (tipo == null || !tipo.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "El archivo debe ser una imagen"));
        }

        String original = archivo.getOriginalFilename();
        String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf('.') + 1).toLowerCase() : "jpg";
        String nombre = System.currentTimeMillis() + "." + ext;

        HttpRequest req = peticion(bucket + "/" + nombre)
                .header("Content-Type", tipo)
                .POST(HttpRequest.BodyPublishers.ofByteArray(archivo.getBytes()))
                .build();

        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() >= 300) {
            System.err.println("Error Supabase Storage: " + res.statusCode() + " " + res.body());
            return ResponseEntity.status(502).body(Map.of(
                    "mensaje", "No se pudo subir la imagen",
                    "detalle", res.statusCode() + " " + res.body()));
        }

        return ResponseEntity.ok(Map.of("url",
                supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + nombre));
    }

    @DeleteMapping("/doctores")
    public ResponseEntity<Void> borrar(@RequestParam("url") String url) throws Exception {
        String nombre = url.substring(url.lastIndexOf('/') + 1);
        if (!nombre.matches("[\\w.-]+")) {
            return ResponseEntity.badRequest().build();
        }

        HttpRequest req = peticion(bucket + "/" + nombre).DELETE().build();
        http.send(req, HttpResponse.BodyHandlers.ofString());
        return ResponseEntity.noContent().build();
    }
}