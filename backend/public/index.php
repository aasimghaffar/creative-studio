<?php

declare(strict_types=1);

/**
 * AI Creative Studio — API front controller.
 * All HTTP traffic enters here; the router dispatches to controllers.
 */

use App\Config\Config;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use App\Exceptions\HttpException;
use Dotenv\Dotenv;

require dirname(__DIR__) . '/vendor/autoload.php';

// ----- Environment -----
$root = dirname(__DIR__);
if (is_file($root . '/.env')) {
    Dotenv::createImmutable($root)->safeLoad();
}
Config::init();

// ----- Error visibility (never leak in production) -----
error_reporting(E_ALL);
ini_set('display_errors', Config::bool('APP_DEBUG') ? '1' : '0');

$logger = Logger::channel('app');
$request = Request::capture();

// ----- Global exception boundary: every failure becomes a clean JSON response -----
try {
    /** @var Router $router */
    $router = require $root . '/routes/api.php';
    $response = $router->dispatch($request);
} catch (HttpException $e) {
    $response = Response::error($e->getMessage(), $e->getStatusCode(), $e->getErrors());
} catch (\Throwable $e) {
    $logger->error('Unhandled exception', [
        'exception' => $e::class,
        'message'   => $e->getMessage(),
        'file'      => $e->getFile() . ':' . $e->getLine(),
    ]);
    $detail = Config::bool('APP_DEBUG') ? $e->getMessage() : 'Internal server error.';
    $response = Response::error($detail, 500);
}

// ----- Request log line -----
$logger->info(sprintf(
    '%s %s -> %d',
    $request->method(),
    $request->path(),
    $response->statusCode()
), ['ip' => $request->ip(), 'request_id' => $request->id()]);

$response->send($request);
