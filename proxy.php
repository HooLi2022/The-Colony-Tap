<?php
// proxy.php — пересылает запросы к игре, обходя CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');  // для теста; лучше указать свой домен
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['url']) || empty($input['body'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing url or body']);
    exit;
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $input['url']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $input['body']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/x-www-form-urlencoded',
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Origin: https://prod-app6754112-57f261547534.pages-ac.vk-apps.ru',
    'Referer: https://prod-app6754112-57f261547534.pages-ac.vk-apps.ru/index.html',
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    http_response_code(500);
    echo json_encode(['error' => $error]);
    exit;
}

http_response_code($httpCode);
echo $response;
