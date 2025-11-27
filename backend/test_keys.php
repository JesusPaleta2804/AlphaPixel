<?php
// backend/test_keys.php
require_once 'config.php';
require_once 'enviar-notificacion.php'; // Para cargar la clase VapidHelper

echo "<h1>Diagnóstico de Llaves VAPID</h1>";

try {
    $config = new PushConfig();
    $keys = $config->getVapidKeys();
    $priv = $keys['privateKey'];
    
    echo "<strong>Llave Privada leída (longitud " . strlen($priv) . "):</strong><br>";
    echo "<pre>" . $priv . "</pre>";
    
    // Intentar firmar un dato tonto para ver si OpenSSL la acepta
    $testData = "prueba";
    $signature = "";
    
    // Usamos el convertidor interno de VapidHelper
    // Nota: Necesitamos hacer pública la función convertToPem temporalmente o copiarla aquí
    // Para este test, copio la lógica de conversión aquí:
    
    $privateKeyBase64 = str_replace(['-', '_'], ['+', '/'], $priv);
    $len = strlen($privateKeyBase64);
    if ($len % 4 !== 0) $privateKeyBase64 .= str_repeat('=', 4 - ($len % 4));
    $keyBytes = base64_decode($privateKeyBase64);
    
    if (!$keyBytes) {
        throw new Exception("🔴 Error: La llave no es Base64 válido.");
    }
    
    echo "✅ Base64 Decodificado correctamente.<br>";
    
    $derHeader = hex2bin('30770201010420');
    $derFooter = hex2bin('a00a06082a8648ce3d030107a144034200');
    $der = $derHeader . $keyBytes . $derFooter;
    $pem = "-----BEGIN EC PRIVATE KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END EC PRIVATE KEY-----";
    
    echo "<strong>PEM Generado:</strong><br><pre>$pem</pre>";
    
    if (openssl_sign($testData, $signature, $pem, OPENSSL_ALGO_SHA256)) {
        echo "<h2 style='color:green'>✅ ¡ÉXITO! Tu llave es válida y OpenSSL la acepta.</h2>";
        echo "Si las notificaciones fallan, es problema de Google/Red, no de tu llave.";
    } else {
        echo "<h2 style='color:red'>❌ FALLO: OpenSSL rechazó la llave.</h2>";
        echo "Error OpenSSL: " . openssl_error_string();
    }

} catch (Exception $e) {
    echo "<h2 style='color:red'>❌ Error Crítico: " . $e->getMessage() . "</h2>";
}
?>