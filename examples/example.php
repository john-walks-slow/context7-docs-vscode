<?php
// PHP 示例
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Laravel\Framework\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use GuzzleHttp\Client;
use Monolog\Logger;

// 测试选中这些标识符来检测库
class ExampleController
{
    public function index(Request $request): Response
    {
        $client = new Client();
        $response = $client->get('https://api.example.com');
        
        return new Response($response->getBody());
    }
}

// Laravel
Route::get('/users', function () {
    return DB::table('users')->get();
});

// Monolog
$logger = new Logger('app');
$logger->info('Application started');

// Guzzle
$client = new Client(['base_uri' => 'https://api.example.com']);
$response = $client->request('GET', '/users');