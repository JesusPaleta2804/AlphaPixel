<?php
// backend/suscribir.php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['suscripcion'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos de suscripción faltantes']);
    exit;
}

$suscripcion = $input['suscripcion'];
$categoria = $input['categoria'] ?? 'general';

// Guardar la suscripción en un archivo (en producción usarías una base de datos)
$suscripciones = [];
if (file_exists('suscripciones.json')) {
    $suscripciones = json_decode(file_get_contents('suscripciones.json'), true);
}

// Generar ID único para esta suscripción
$id = uniqid();
$suscripciones[$id] = [
    'suscripcion' => $suscripcion,
    'categoria' => $categoria,
    'fecha' => date('Y-m-d H:i:s')
];

if (file_put_contents('suscripciones.json', json_encode($suscripciones, JSON_PRETTY_PRINT))) {
    error_log("Suscripción guardada: " . $id);
    echo json_encode([
        'success' => true,
        'message' => 'Suscripción guardada correctamente',
        'id' => $id
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al guardar la suscripción']);
}
?>