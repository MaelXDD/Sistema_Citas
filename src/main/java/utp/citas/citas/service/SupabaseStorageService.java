package utp.citas.citas.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.key}")
    private String supabaseKey;

    // ESTE ES EL MÉTODO QUE FALTA O TIENE OTRO NOMBRE
    public String subirReporte(String nombreArchivo, byte[] archivoBytes) {
        RestTemplate restTemplate = new RestTemplate();
        // Endpoint para el bucket "recursos"
        String url = supabaseUrl + "/storage/v1/object/recursos/" + nombreArchivo;

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + supabaseKey);
        headers.set("apikey", supabaseKey);
        headers.setContentType(MediaType.parseMediaType("application/pdf"));

        headers.set("x-upsert", "true");

        HttpEntity<byte[]> entity = new HttpEntity<>(archivoBytes, headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

        if (response.getStatusCode().is2xxSuccessful()) {
            return supabaseUrl + "/storage/v1/object/public/recursos/" + nombreArchivo;
        } else {
            throw new RuntimeException("Error al subir el PDF a Supabase");
        }
    }
}