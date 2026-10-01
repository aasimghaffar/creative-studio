<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Logger;
use App\Exceptions\HttpException;
use App\Exceptions\ValidationException;
use App\Repositories\AiToolRepository;
use App\Repositories\PlanRepository;
use App\Repositories\SubscriptionRepository;

/** Admin → Subscription Plans: validated CRUD over the plans table. */
final class AdminPlanService
{
    private const BADGES = ['', 'Popular', 'Recommended', 'Best Value', 'New'];

    public function __construct(
        private readonly PlanRepository $plans = new PlanRepository(),
        private readonly SubscriptionRepository $subscriptions = new SubscriptionRepository(),
        private readonly AiToolRepository $tools = new AiToolRepository(),
    ) {
    }

    /** @return list<array<string, mixed>> */
    public function list(): array
    {
        return array_map(
            fn (array $plan): array => $this->shape($plan, $this->subscriptions->countByPlan((int) $plan['id'])),
            $this->plans->all(),
        );
    }

    /** @return array<string, mixed> */
    public function create(int $adminId, array $input): array
    {
        $fields = $this->validate($input, null);
        $fields['slug'] = $this->uniqueSlug($fields['name']);

        $id = $this->plans->create($fields);
        Logger::channel('app')->info('Plan created', ['admin_id' => $adminId, 'plan_id' => $id]);

        return $this->one($id);
    }

    /** @return array<string, mixed> */
    public function update(int $adminId, int $planId, array $input): array
    {
        $this->requirePlan($planId);
        $fields = $this->validate($input, $planId);

        $this->plans->update($planId, $fields);
        Logger::channel('app')->info('Plan updated', ['admin_id' => $adminId, 'plan_id' => $planId]);

        return $this->one($planId);
    }

    public function delete(int $adminId, int $planId): void
    {
        $this->requirePlan($planId);

        $inUse = $this->subscriptions->countByPlan($planId);
        if ($inUse > 0) {
            throw new HttpException(
                409,
                sprintf('This plan has %d subscription(s) and cannot be deleted — disable it instead.', $inUse),
            );
        }

        $this->plans->deleteById($planId);
        Logger::channel('app')->warning('Plan deleted', ['admin_id' => $adminId, 'plan_id' => $planId]);
    }

    /** @return array<string, mixed> */
    public function setActive(int $adminId, int $planId, bool $active): array
    {
        $this->requirePlan($planId);
        $this->plans->setActive($planId, $active);
        Logger::channel('app')->info($active ? 'Plan enabled' : 'Plan disabled', [
            'admin_id' => $adminId,
            'plan_id'  => $planId,
        ]);

        return $this->one($planId);
    }

    /* ---------------- internals ---------------- */

    /** @return array<string, mixed> */
    private function validate(array $input, ?int $exceptId): array
    {
        $errors = [];

        $name = trim((string) ($input['name'] ?? ''));
        if ($name === '' || mb_strlen($name) > 60) {
            $errors['name'][] = 'Name is required (max 60 characters).';
        } elseif ($this->plans->nameExists($name, $exceptId)) {
            $errors['name'][] = 'A plan with this name already exists.';
        }

        $monthly = $this->price($input['monthly_price'] ?? null, 'monthly_price', $errors);
        $yearly = $this->price($input['yearly_price'] ?? null, 'yearly_price', $errors);

        $credits = $this->nullableInt($input['credits_per_cycle'] ?? null, 0, 1000000, 'credits_per_cycle', $errors);
        $storage = $this->nullableInt($input['storage_gb'] ?? null, 1, 10000, 'storage_gb', $errors);
        $maxGen = $this->nullableInt($input['max_generations'] ?? null, 1, 1000000, 'max_generations', $errors);

        $seats = (int) ($input['seats'] ?? 1);
        if ($seats < 1 || $seats > 999) {
            $errors['seats'][] = 'Seats must be between 1 and 999.';
        }

        $sortOrder = (int) ($input['sort_order'] ?? 0);
        if ($sortOrder < 0 || $sortOrder > 99) {
            $errors['sort_order'][] = 'Display order must be between 0 and 99.';
        }

        $badge = trim((string) ($input['badge'] ?? ''));
        if (!in_array($badge, self::BADGES, true)) {
            $errors['badge'][] = 'Badge must be one of: ' . implode(', ', array_filter(self::BADGES)) . ' — or empty.';
        }

        $validSlugs = array_map(static fn (array $t): string => (string) $t['slug'], $this->tools->all());
        $allowedTools = array_values(array_intersect(
            array_map('strval', (array) ($input['allowed_tools'] ?? [])),
            $validSlugs,
        ));

        $features = array_values(array_filter(
            array_map(static fn ($f): string => trim((string) $f), (array) ($input['features'] ?? [])),
            static fn (string $f): bool => $f !== '',
        ));

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return [
            'name'              => $name,
            'tagline'           => mb_substr(trim((string) ($input['tagline'] ?? '')), 0, 190) ?: null,
            'monthly_price'     => $monthly,
            'yearly_price'      => $yearly,
            'credits_per_cycle' => $credits,
            'seats'             => $seats,
            'storage_gb'        => $storage,
            'max_generations'   => $maxGen,
            'allowed_tools'     => $allowedTools,
            'features'          => $features,
            'badge'             => $badge,
            'is_active'         => (bool) ($input['is_active'] ?? true),
            'sort_order'        => $sortOrder,
        ];
    }

    /** @param array<string, list<string>> $errors */
    private function price(mixed $value, string $field, array &$errors): ?float
    {
        if ($value === null || $value === '') {
            return null; // null price = custom / contact sales
        }
        $price = (float) $value;
        if ($price < 0 || $price > 100000) {
            $errors[$field][] = 'Price must be between 0 and 100,000.';
        }

        return round($price, 2);
    }

    /** @param array<string, list<string>> $errors */
    private function nullableInt(mixed $value, int $min, int $max, string $field, array &$errors): ?int
    {
        if ($value === null || $value === '') {
            return null; // null = unlimited
        }
        $int = (int) $value;
        if ($int < $min || $int > $max) {
            $errors[$field][] = sprintf('Must be between %d and %d (or empty for unlimited).', $min, $max);
        }

        return $int;
    }

    private function uniqueSlug(string $name): string
    {
        $base = trim(preg_replace('/-+/', '-', preg_replace('/[^a-z0-9]+/', '-', strtolower($name)) ?? ''), '-') ?: 'plan';
        $slug = $base;
        $n = 2;
        while ($this->plans->slugExists($slug)) {
            $slug = $base . '-' . $n++;
        }

        return $slug;
    }

    /** @return array<string, mixed> */
    private function one(int $planId): array
    {
        $plan = $this->requirePlan($planId);

        return $this->shape($plan, $this->subscriptions->countByPlan($planId));
    }

    /** @return array<string, mixed> */
    private function requirePlan(int $planId): array
    {
        $plan = $this->plans->findById($planId);
        if ($plan === null) {
            throw new HttpException(404, 'Plan not found.');
        }

        return $plan;
    }

    /** @param array<string, mixed> $plan */
    private function shape(array $plan, int $subscriptions): array
    {
        return [
            'id'                => (int) $plan['id'],
            'slug'              => $plan['slug'],
            'name'              => $plan['name'],
            'tagline'           => $plan['tagline'],
            'monthly_price'     => $plan['monthly_price'],
            'yearly_price'      => $plan['yearly_price'],
            'credits_per_cycle' => $plan['credits_per_cycle'],
            'seats'             => (int) $plan['seats'],
            'storage_gb'        => $plan['storage_gb'],
            'max_generations'   => $plan['max_generations'],
            'allowed_tools'     => $plan['allowed_tools'],
            'features'          => $plan['features'],
            'badge'             => $plan['badge'] ?? '',
            'is_active'         => (bool) $plan['is_active'],
            'sort_order'        => (int) $plan['sort_order'],
            'subscriptions'     => $subscriptions,
        ];
    }
}
