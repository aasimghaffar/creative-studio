<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\HttpException;

/**
 * Small, explicit router: static segments + {named} parameters,
 * per-route middleware chains, and grouped prefixes.
 *
 *   $router->group('/api/v1', function (Router $r) {
 *       $r->post('/auth/login', [AuthController::class, 'login']);
 *       $r->get('/auth/me', [AuthController::class, 'me'], [AuthMiddleware::class]);
 *   });
 */
final class Router
{
    /** @var list<array{method: string, pattern: string, handler: array{class-string, string}, middleware: list<class-string>}> */
    private array $routes = [];

    private string $prefix = '';

    /** @param callable(Router): void $register */
    public function group(string $prefix, callable $register): void
    {
        $previous = $this->prefix;
        $this->prefix = $previous . $prefix;
        $register($this);
        $this->prefix = $previous;
    }

    /**
     * @param array{class-string, string} $handler
     * @param list<class-string>          $middleware
     */
    public function get(string $path, array $handler, array $middleware = []): void
    {
        $this->add('GET', $path, $handler, $middleware);
    }

    /**
     * @param array{class-string, string} $handler
     * @param list<class-string>          $middleware
     */
    public function post(string $path, array $handler, array $middleware = []): void
    {
        $this->add('POST', $path, $handler, $middleware);
    }

    /**
     * @param array{class-string, string} $handler
     * @param list<class-string>          $middleware
     */
    public function put(string $path, array $handler, array $middleware = []): void
    {
        $this->add('PUT', $path, $handler, $middleware);
    }

    /**
     * @param array{class-string, string} $handler
     * @param list<class-string>          $middleware
     */
    public function patch(string $path, array $handler, array $middleware = []): void
    {
        $this->add('PATCH', $path, $handler, $middleware);
    }

    /**
     * @param array{class-string, string} $handler
     * @param list<class-string>          $middleware
     */
    public function delete(string $path, array $handler, array $middleware = []): void
    {
        $this->add('DELETE', $path, $handler, $middleware);
    }

    /**
     * @param array{class-string, string} $handler
     * @param list<class-string>          $middleware
     */
    private function add(string $method, string $path, array $handler, array $middleware): void
    {
        $this->routes[] = [
            'method'     => $method,
            'pattern'    => rtrim($this->prefix . $path, '/') ?: '/',
            'handler'    => $handler,
            'middleware' => $middleware,
        ];
    }

    public function dispatch(Request $request): Response
    {
        // CORS preflight is answered before route matching.
        if ($request->method() === 'OPTIONS') {
            return Response::success(null, 'OK', 204);
        }

        $allowedMethods = [];

        foreach ($this->routes as $route) {
            $params = $this->match($route['pattern'], $request->path());
            if ($params === null) {
                continue;
            }
            if ($route['method'] !== $request->method()) {
                $allowedMethods[] = $route['method'];
                continue;
            }

            $request = $request->withParams($params);

            // Middleware chain, innermost = controller action.
            $handler = function (Request $req) use ($route): Response {
                [$class, $action] = $route['handler'];
                $controller = new $class();

                return $controller->{$action}($req);
            };

            foreach (array_reverse($route['middleware']) as $middlewareClass) {
                $next = $handler;
                $handler = function (Request $req) use ($middlewareClass, $next): Response {
                    return (new $middlewareClass())->handle($req, $next);
                };
            }

            return $handler($request);
        }

        if ($allowedMethods !== []) {
            throw new HttpException(405, 'Method not allowed.');
        }

        throw new HttpException(404, 'Endpoint not found.');
    }

    /**
     * @return array<string, string>|null Named params on match, null otherwise.
     */
    private function match(string $pattern, string $path): ?array
    {
        $regex = preg_replace('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', '(?P<$1>[^/]+)', $pattern);
        if (!preg_match('#^' . $regex . '$#', $path, $matches)) {
            return null;
        }

        return array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
    }
}
