<?php

namespace App\Support;

class PermissionCatalog
{
    public const GUARD = 'web';

    /**
     * Developer-controlled permission catalog. Admins cannot create arbitrary permission names.
     *
     * @return array<string, array{label: string, permissions: array<string, string>}>
     */
    public static function groups(): array
    {
        return [
            'access' => [
                'label' => 'Admin Access',
                'permissions' => [
                    'access_admin' => 'Access admin panel',
                ],
            ],
            'dashboard' => [
                'label' => 'Dashboard',
                'permissions' => [
                    'dashboard.view' => 'View dashboard',
                ],
            ],
            'users' => [
                'label' => 'User Management',
                'permissions' => [
                    'users.view' => 'View users',
                    'users.create' => 'Create users',
                    'users.edit' => 'Edit users',
                    'users.delete' => 'Delete users',
                ],
            ],
            'categories' => [
                'label' => 'Healthcare Categories',
                'permissions' => [
                    'categories.view' => 'View categories',
                    'categories.create' => 'Create categories',
                    'categories.edit' => 'Edit categories',
                    'categories.delete' => 'Delete categories',
                ],
            ],
            'countries' => [
                'label' => 'Countries',
                'permissions' => [
                    'countries.view' => 'View countries',
                    'countries.create' => 'Create countries',
                    'countries.edit' => 'Edit countries',
                    'countries.delete' => 'Delete countries',
                ],
            ],
            'states' => [
                'label' => 'States / Regions',
                'permissions' => [
                    'states.view' => 'View states',
                    'states.create' => 'Create states',
                    'states.edit' => 'Edit states',
                    'states.delete' => 'Delete states',
                ],
            ],
            'cities' => [
                'label' => 'Districts',
                'permissions' => [
                    'cities.view' => 'View districts',
                    'cities.create' => 'Create districts',
                    'cities.edit' => 'Edit districts',
                    'cities.delete' => 'Delete districts',
                ],
            ],
            'group_management' => [
                'label' => 'Group Management',
                'permissions' => [
                    'community-groups.view' => 'View group management',
                    'community-groups.edit' => 'Edit group mappings',
                    'community-groups.delete' => 'Delete unused group mappings',
                ],
            ],
            'whatsapp_groups' => [
                'label' => 'WhatsApp Communities',
                'permissions' => [
                    'whatsapp-groups.view' => 'View WhatsApp groups',
                    'whatsapp-groups.create' => 'Create WhatsApp groups',
                    'whatsapp-groups.edit' => 'Edit WhatsApp groups',
                    'whatsapp-groups.delete' => 'Delete WhatsApp groups',
                ],
            ],
            'banners' => [
                'label' => 'Banners',
                'permissions' => [
                    'banners.view' => 'View banners',
                    'banners.create' => 'Create banners',
                    'banners.edit' => 'Edit banners',
                    'banners.delete' => 'Delete banners',
                ],
            ],
            'cms' => [
                'label' => 'CMS Pages',
                'permissions' => [
                    'cms.view' => 'View CMS pages',
                    'cms.create' => 'Create CMS pages',
                    'cms.edit' => 'Edit CMS pages',
                    'cms.delete' => 'Delete CMS pages',
                ],
            ],
            'email_templates' => [
                'label' => 'Email Templates',
                'permissions' => [
                    'email_templates.view' => 'View email templates',
                    'email_templates.edit' => 'Edit email templates',
                    'email_templates.test_send' => 'Send test emails',
                ],
            ],
            'notifications' => [
                'label' => 'Notifications',
                'permissions' => [
                    'notifications.send' => 'Send announcements',
                ],
            ],
            'roles' => [
                'label' => 'Roles',
                'permissions' => [
                    'roles.view' => 'View roles',
                    'roles.create' => 'Create roles',
                    'roles.edit' => 'Edit roles',
                    'roles.delete' => 'Delete roles',
                ],
            ],
            'permissions' => [
                'label' => 'Permissions',
                'permissions' => [
                    'permissions.view' => 'View permissions',
                    'permissions.assign' => 'Assign permissions to roles',
                ],
            ],
            'settings' => [
                'label' => 'Settings',
                'permissions' => [
                    'settings.view' => 'View settings',
                    'settings.edit' => 'Edit profile settings',
                ],
            ],
        ];
    }

    /**
     * @return array<string, string> slug => label
     */
    public static function flat(): array
    {
        $flat = [];
        foreach (self::groups() as $group) {
            foreach ($group['permissions'] as $slug => $label) {
                $flat[$slug] = $label;
            }
        }

        return $flat;
    }

    /**
     * @return list<string>
     */
    public static function allSlugs(): array
    {
        return array_keys(self::flat());
    }

    public static function isValidSlug(string $slug): bool
    {
        return array_key_exists($slug, self::flat());
    }

    /**
     * Default permission slugs per staff role slug (Super Admin gets all via Gate::before).
     *
     * @return array<string, list<string>>
     */
    public static function defaultRolePermissions(): array
    {
        return [
            'moderator' => [
                'access_admin', 'dashboard.view',
                'users.view', 'users.edit',
                'categories.view', 'categories.edit',
                'community-groups.view', 'community-groups.edit',
                'whatsapp-groups.view', 'whatsapp-groups.edit',
                'countries.view', 'states.view', 'cities.view',
                'notifications.send',
                'settings.view', 'settings.edit',
            ],
            'content_manager' => [
                'access_admin', 'dashboard.view',
                'categories.view', 'categories.create', 'categories.edit',
                'community-groups.view',
                'whatsapp-groups.view',
                'banners.view', 'banners.create', 'banners.edit', 'banners.delete',
                'cms.view', 'cms.create', 'cms.edit', 'cms.delete',
                'email_templates.view', 'email_templates.edit', 'email_templates.test_send',
                'settings.view', 'settings.edit',
            ],
            'support' => [
                'access_admin', 'dashboard.view',
                'users.view', 'users.create', 'users.edit',
                'categories.view',
                'community-groups.view', 'whatsapp-groups.view',
                'countries.view', 'states.view', 'cities.view',
                'settings.view', 'settings.edit',
            ],
            'viewer' => [
                'access_admin', 'dashboard.view',
                'users.view', 'categories.view',
                'community-groups.view', 'whatsapp-groups.view',
                'countries.view', 'states.view', 'cities.view',
                'banners.view', 'cms.view', 'email_templates.view',
                'permissions.view',
                'settings.view',
            ],
        ];
    }
}
