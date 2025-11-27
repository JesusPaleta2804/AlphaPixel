<?php
// backend/enviar-notificacion.php (Versión PRODUCCIÓN - Linux/Hospedando)

ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once 'config.php';
header('Content-Type: application/json');

// 1. VALIDACIONES BÁSICAS
$inputRaw = file_get_contents('php://input');
$input = json_decode($inputRaw, true);
$archivo_json = __DIR__ . '/suscripciones.json';

if (!file_exists($archivo_json)) exit(json_encode(['success'=>false, 'message'=>'No hay suscriptores.']));
$suscripciones = json_decode(file_get_contents($archivo_json), true);
if (empty($suscripciones)) exit(json_encode(['success'=>false, 'message'=>'Lista vacía.']));

// 2. OBTENER LLAVES
try {
    $configObj = new PushConfig();
    $keys = $configObj->getVapidKeys();
} catch (Exception $e) {
    exit(json_encode(['success'=>false, 'message'=>'Error Config']));
}

$enviadas = 0;
$log = [];

// 3. BUCLE DE ENVÍO
foreach ($suscripciones as $id => $user) {
    if (!isset($user['suscripcion']['endpoint'])) continue;

    $payload = json_encode([
        'title' => $input['titulo'] ?? 'Alpha Pixel',
        'body'  => $input['mensaje'] ?? 'Nueva notificación',
        'icon'  => 'img/logo.jpeg',
        'data'  => ['url' => $input['url'] ?? '/']
    ]);

    try {
        $headers = VapidHelper::getHeaders($user['suscripcion']['endpoint'], $keys['publicKey'], $keys['privateKey']);
        
        $ch = curl_init($user['suscripcion']['endpoint']);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: ' . $headers['Authorization'],
            'Content-Type: application/json',
            'TTL: 60'
        ]);

        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code >= 200 && $code < 300) $enviadas++;
        else $log[] = "Error $code";

    } catch (Exception $e) {
        $log[] = $e->getMessage();
    }
}

echo json_encode(['success' => ($enviadas > 0), 'enviadas' => $enviadas, 'debug' => $log]);

// CLASE VAPID ESTÁNDAR (Limpia para Linux)
class VapidHelper {
    public static function getHeaders($endpoint, $pk, $sk) {
        $origin = parse_url($endpoint, PHP_URL_SCHEME) . '://' . parse_url($endpoint, PHP_URL_HOST);
        $header = self::base64Url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
        $claim = self::base64Url(json_encode(['aud' => $origin, 'exp' => time()+3600, 'sub' => 'mailto:admin@alphapixel.com']));
        $payload = "$header.$claim";
        $sig = self::sign($payload, $sk);
        return ['Authorization' => 'vapid t=' . "$payload.$sig" . ', k=' . $pk];
    }

    private static function sign($data, $key) {
        // Formato PEM estándar que funciona en Hosting Linux
        $key = str_replace(['-','_'], ['+','/'], $key);
        $key .= str_repeat('=', (4 - strlen($key)%4)%4);
        $der = hex2bin('30770201010420') . base64_decode($key) . hex2bin('a00a06082a8648ce3d030107a144034200');
        $pem = "-----BEGIN EC PRIVATE KEY-----\n".chunk_split(base64_encode($der),64,"\n")."-----END EC PRIVATE KEY-----";
        
        if(!openssl_sign($data, $signature, $pem, OPENSSL_ALGO_SHA256)) throw new Exception("Error firmando");
        return self::base64Url($signature);
    }

    private static function base64Url($d) { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
}
?>