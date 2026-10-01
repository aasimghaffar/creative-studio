<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Repositories\UserRepository;
use App\Services\AuthService;

/**
 * Authentication endpoints. Thin: validate -> service -> respond.
 */
final class AuthController extends Controller
{
    private AuthService $auth;


    public function __construct()
    {
        $this->auth = new AuthService();
    }

    /** @return array{ip: string, user_agent: string} */
    private function clientContext(Request $request): array
    {
        return [
            'ip'         => $request->ip(),
            'user_agent' => $request->header('user-agent') ?? '',
        ];
    }

    /** POST /api/v1/auth/register */
    public function register(Request $request): Response
    {
        $data = Validator::validate($request->all(), [
            'name'     => 'required|string|min:2|max:120',
            'email'    => 'required|email|max:190',
            'password' => 'required|string|min:8|max:200',
        ]);

        $bundle = $this->auth->register(
            $data['name'],
            strtolower($data['email']),
            $data['password'],
            $this->clientContext($request),
        );

        return Response::created($bundle, 'Account created.');
    }

    /** POST /api/v1/auth/login */
    public function login(Request $request): Response
    {
        $data = Validator::validate($request->all(), [
            'email'    => 'required|email|max:190',
            'password' => 'required|string|min:1|max:200',
        ]);

        $bundle = $this->auth->login(
            strtolower($data['email']),
            $data['password'],
            $this->clientContext($request),
        );

        return Response::success($bundle, 'Signed in.');
    }

    /** POST /api/v1/auth/refresh-token */
    public function refresh(Request $request): Response
    {
        $data = Validator::validate($request->all(), [
            'refresh_token' => 'required|string|min:20',
        ]);

        return Response::success(
            $this->auth->refresh($data['refresh_token'], $this->clientContext($request)),
            'Token refreshed.',
        );
    }

    /** POST /api/v1/auth/logout (auth) */
    public function logout(Request $request): Response
    {
        $data = Validator::validate($request->all(), [
            'refresh_token' => 'required|string|min:20',
        ]);

        $this->auth->logout($data['refresh_token']);

        return Response::success(null, 'Signed out.');
    }

    /** GET /api/v1/auth/me (auth) */
    public function me(Request $request): Response
    {
        return Response::success([
            'user' => UserRepository::toPublic($this->user($request)),
        ]);
    }

    /** POST /api/v1/auth/forgot-password */
    public function forgotPassword(Request $request): Response
    {
        $data = Validator::validate($request->all(), [
            'email' => 'required|email|max:190',
        ]);

        $this->auth->requestPasswordReset(strtolower($data['email']));

        // Identical response whether the account exists or not.
        return Response::success(null, 'If that email exists, a reset link has been sent.');
    }

    /** POST /api/v1/auth/verify-email */
    public function verifyEmail(Request $request): Response
    {
        $data = Validator::validate($request->all(), [
            'token' => 'required|string|min:20',
        ]);

        $this->auth->verifyEmail($data['token']);

        return Response::success(null, 'Email verified.');
    }

    /** POST /api/v1/auth/resend-verification (auth) */
    public function resendVerification(Request $request): Response
    {
        $this->auth->sendEmailVerification($this->user($request));

        return Response::success(null, 'If your email is unverified, a new link has been sent.');
    }

    /** POST /api/v1/auth/reset-password */
    public function resetPassword(Request $request): Response
    {
        $data = Validator::validate($request->all(), [
            'token'    => 'required|string|min:20',
            'password' => 'required|string|min:8|max:200',
        ]);

        $this->auth->resetPassword($data['token'], $data['password']);

        return Response::success(null, 'Password updated. Please sign in again.');
    }
}
