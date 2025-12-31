<?php
/**
 * Simple CORS proxy for fetching Project Gutenberg books
 * 
 * Usage: proxy.php?url=https://www.gutenberg.org/cache/epub/84/pg84.txt
 * 
 * Run locally with: php -S localhost:8080
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!isset($_GET['url'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing url parameter']);
    exit;
}

$url = $_GET['url'];

// Only allow Project Gutenberg URLs
if (!preg_match('/^https?:\/\/(www\.)?gutenberg\.org\//', $url)) {
    http_response_code(403);
    echo json_encode(['error' => 'Only Project Gutenberg URLs are allowed']);
    exit;
}

$context = stream_context_create([
    'http' => [
        'timeout' => 30,
        'user_agent' => 'Mozilla/5.0 (compatible; GutenbergReader/1.0)'
    ]
]);

$content = @file_get_contents($url, false, $context);

if ($content === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to fetch content']);
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
echo $content;
