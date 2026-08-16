<?php

namespace App\Services;

use App\Models\Country;
use App\Models\User;
use App\Models\WhatsAppGroup;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsService
{
    /**
     * @return array<int, array{month: string, users: int, communities: int}>
     */
    public function registrationGrowth(int $months = 7): array
    {
        $rows = [];

        for ($i = $months - 1; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $end = $date->copy()->endOfMonth();

            $rows[] = [
                'month' => $date->format('M'),
                'users' => User::where('created_at', '<=', $end)->count(),
                'communities' => WhatsAppGroup::where('created_at', '<=', $end)->count(),
            ];
        }

        return $rows;
    }

    /**
     * @return array<int, array{day: string, active: int}>
     */
    public function dailyActiveUsers(): array
    {
        $labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        $since = now()->subDays(30);
        $rows = [];

        foreach ($labels as $index => $label) {
            $rows[] = [
                'day' => $label,
                'active' => User::query()
                    ->whereNotNull('last_login_at')
                    ->where('last_login_at', '>=', $since)
                    ->whereRaw('WEEKDAY(last_login_at) = ?', [$index])
                    ->count(),
            ];
        }

        return $rows;
    }

    /**
     * @return array<int, array{country: string, users: int}>
     */
    public function countryDistribution(int $limit = 6): array
    {
        return User::query()
            ->select('country_id', DB::raw('count(*) as users'))
            ->whereNotNull('country_id')
            ->groupBy('country_id')
            ->orderByDesc('users')
            ->limit($limit)
            ->get()
            ->map(function ($row) {
                $country = Country::find($row->country_id);

                return [
                    'country' => $country?->name ?? 'Unknown',
                    'users' => (int) $row->users,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function kpis(): array
    {
        $groups = WhatsAppGroup::query()
            ->where('status', 'active')
            ->where('max_members', '>', 0)
            ->get(['current_members', 'max_members']);

        $utilization = $groups->isEmpty()
            ? 0
            : round($groups->avg(fn ($group) => min(100, ($group->current_members / $group->max_members) * 100)), 1);

        $totalUsers = User::count();
        $emailVerified = User::whereNotNull('email_verified_at')->count();
        $emailRate = $totalUsers > 0 ? round(($emailVerified / $totalUsers) * 100, 1) : 0;

        $weeklyActive = User::where('last_login_at', '>=', now()->subDays(7))->count();
        $prevWeeklyActive = User::whereBetween('last_login_at', [now()->subDays(14), now()->subDays(7)])->count();
        $weeklyDelta = $prevWeeklyActive > 0
            ? round((($weeklyActive - $prevWeeklyActive) / $prevWeeklyActive) * 100, 1)
            : ($weeklyActive > 0 ? 100 : 0);

        $thisMonthVerified = User::whereNotNull('email_verified_at')
            ->whereMonth('email_verified_at', now()->month)
            ->whereYear('email_verified_at', now()->year)
            ->count();
        $lastMonth = now()->subMonth();
        $lastMonthVerified = User::whereNotNull('email_verified_at')
            ->whereMonth('email_verified_at', $lastMonth->month)
            ->whereYear('email_verified_at', $lastMonth->year)
            ->count();
        $emailDelta = $lastMonthVerified > 0
            ? round((($thisMonthVerified - $lastMonthVerified) / $lastMonthVerified) * 100, 1)
            : ($thisMonthVerified > 0 ? 100 : 0);

        $regGrowth = $this->registrationGrowth();
        $userTrend = array_map(fn (array $row) => $row['users'], $regGrowth);
        $communityTrend = array_map(fn (array $row) => $row['communities'], $regGrowth);

        return [
            'community_utilization' => [
                'value' => $utilization,
                'delta' => $this->utilizationDelta($utilization),
                'trend' => $this->toTrend($communityTrend),
            ],
            'email_verification_rate' => [
                'value' => $emailRate,
                'delta' => $emailDelta,
                'trend' => $this->toTrend($userTrend),
            ],
            'weekly_active_users' => [
                'value' => $weeklyActive,
                'delta' => $weeklyDelta,
                'trend' => $this->toTrend($this->weeklyActiveTrend()),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function all(): array
    {
        return [
            'reg_growth' => $this->registrationGrowth(),
            'daily_active' => $this->dailyActiveUsers(),
            'country_dist' => $this->countryDistribution(),
            'kpis' => $this->kpis(),
        ];
    }

    private function utilizationDelta(float $current): float
    {
        $previousGroups = WhatsAppGroup::query()
            ->where('status', 'active')
            ->where('max_members', '>', 0)
            ->where('updated_at', '<', now()->subDays(30))
            ->get(['current_members', 'max_members']);

        if ($previousGroups->isEmpty()) {
            return 0;
        }

        $previous = round($previousGroups->avg(
            fn ($group) => min(100, ($group->current_members / $group->max_members) * 100)
        ), 1);

        return $previous > 0 ? round($current - $previous, 1) : 0;
    }

    /**
     * @return array<int, int>
     */
    private function weeklyActiveTrend(): array
    {
        $trend = [];

        for ($i = 5; $i >= 0; $i--) {
            $start = now()->subWeeks($i + 1);
            $end = now()->subWeeks($i);
            $trend[] = User::whereBetween('last_login_at', [$start, $end])->count();
        }

        return $trend;
    }

    /**
     * @param  array<int, int|float>  $values
     * @return array<int, array{v: int|float}>
     */
    private function toTrend(array $values): array
    {
        return array_map(fn ($value) => ['v' => $value], $values);
    }
}
