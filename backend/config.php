<?php
// backend/config.php
class PushConfig {
    private $vapidKeys;
    
    public function __construct() {
        // ESTAS CLAVES DEBEN GENERARSE UNA VEZ Y USARSE SIEMPRE
        // Pueden generar unas nuevas en: https://web-push-codelab.glitch.me/
        $this->vapidKeys = [
            'publicKey' => 'BJMGlJP7boc2RO85-depDOwz_7Un8bqcCibjl5vNnsJeKp_joMDngpyWdYeBBRvcTjEamLR-cpJacAmVJSHRvAk',
            'privateKey' => '7zgqBnzCgJYL8pAwyUYo3ayULzQY7mZ1fG61Gu6RU40'
        ];
    }
    
    public function getVapidKeys() {
        return $this->vapidKeys;
    }
    
    public function getAuthHeaders() {
        return [
            'Authorization: Bearer ' . $this->generateAuthToken(),
            'Content-Type: application/json'
        ];
    }
    
    private function generateAuthToken() {
        // En un entorno real, aquí implementarías tu lógica de autenticación
        return 'server-auth-token';
    }
}
?>