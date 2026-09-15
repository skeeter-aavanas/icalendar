<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: text/calendar; charset=utf-8");

if (!empty($_GET['url'])) {
    $url = $_GET['url'];

    // Simulation d'un navigateur pour éviter le blocage 403
    $options = [
        "http" => [
            "method" => "GET",
            "header" => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\n"
        ]
    ];

    $context = stream_context_create($options);
    $data = @file_get_contents($url, false, $context);

    if ($data !== false) {
        echo $data;
    } else {
        http_response_code(502);
        echo "Impossible de récupérer le fichier iCal.";
    }
}
?>