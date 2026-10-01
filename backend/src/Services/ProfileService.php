<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Logger;
use App\Exceptions\HttpException;
use App\Repositories\UserProfileRepository;
use App\Repositories\UserRepository;

/**
 * Profile module: the merged users + user_profiles view, account field
 * updates, and avatar photo lifecycle.
 */
final class ProfileService
{
    public function __construct(
        private readonly UserRepository $users = new UserRepository(),
        private readonly UserProfileRepository $profiles = new UserProfileRepository(),
        private readonly ImageStorageService $storage = new ImageStorageService(),
    ) {
    }

    /** @return array<string, mixed> */
    public function get(int $userId): array
    {
        $user = $this->users->findById($userId);
        if ($user === null) {
            throw new HttpException(404, 'Account not found.');
        }

        // Self-healing for accounts created before profiles existed.
        $profile = $this->profiles->findByUserId($userId);
        if ($profile === null) {
            $this->profiles->createDefaults($userId);
            $profile = $this->profiles->findByUserId($userId) ?? [];
        }

        return $this->shape($user, $profile);
    }

    /**
     * @param array<string, mixed> $data Validated request data.
     *
     * @return array<string, mixed> The fresh profile.
     */
    public function update(int $userId, array $data): array
    {
        $user = $this->users->findById($userId);
        if ($user === null) {
            throw new HttpException(404, 'Account not found.');
        }

        $email = strtolower((string) $data['email']);
        if ($email !== $user['email']) {
            $existing = $this->users->findByEmail($email);
            if ($existing !== null && (int) $existing['id'] !== $userId) {
                throw new HttpException(409, 'That email address is already in use.');
            }
        }

        $this->users->updateAccount($userId, (string) $data['name'], $email);
        $this->profiles->update($userId, [
            'company'  => $this->nullable($data['company'] ?? null),
            'country'  => $this->nullable($data['country'] ?? null),
            'timezone' => (string) ($data['timezone'] ?? 'Europe/London'),
            'language' => (string) ($data['language'] ?? 'English'),
            'phone'    => $this->nullable($data['phone'] ?? null),
        ]);

        Logger::channel('app')->info('Profile updated', ['user_id' => $userId]);
        (new NotificationService())->system($userId, 'Profile updated successfully');

        return $this->get($userId);
    }

    /** @return array{avatar_url: string} */
    public function setPhoto(int $userId, string $base64, string $mime): array
    {
        $profile = $this->profiles->findByUserId($userId);

        $saved = $this->storage->saveAvatar($userId, $base64, $mime);

        // Replace: remove the previous file after the new one is safely stored.
        if (!empty($profile['avatar_path'])) {
            $this->storage->delete((string) $profile['avatar_path']);
        }
        $this->profiles->setAvatarPath($userId, $saved['path']);

        Logger::channel('app')->info('Avatar updated', ['user_id' => $userId]);

        return ['avatar_url' => $saved['url']];
    }

    public function deletePhoto(int $userId): void
    {
        $profile = $this->profiles->findByUserId($userId);
        if (!empty($profile['avatar_path'])) {
            $this->storage->delete((string) $profile['avatar_path']);
        }
        $this->profiles->setAvatarPath($userId, null);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $profile
     *
     * @return array<string, mixed>
     */
    private function shape(array $user, array $profile): array
    {
        return [
            'id'         => (int) $user['id'],
            'name'       => $user['name'],
            'email'      => $user['email'],
            'role'       => $user['role'],
            'credits'    => (int) $user['credits'],
            'created_at' => $user['created_at'],
            'company'    => $profile['company'] ?? null,
            'country'    => $profile['country'] ?? null,
            'timezone'   => $profile['timezone'] ?? 'Europe/London',
            'language'   => $profile['language'] ?? 'English',
            'phone'      => $profile['phone'] ?? null,
            'avatar_url' => !empty($profile['avatar_path'])
                ? $this->storage->toUrl((string) $profile['avatar_path'])
                : null,
        ];
    }

    private function nullable(mixed $value): ?string
    {
        $trimmed = trim((string) ($value ?? ''));

        return $trimmed === '' ? null : $trimmed;
    }
}
