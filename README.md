# strapi-permission-manager-pro

Strapi v5 plugin for domain-aware RBAC/ABAC permission management with ownership enforcement and contextual policy evaluation.

## Features

- Domain-based access segmentation
- Role-based grants (staff, manager, admin)
- Policy-based evaluation (`allow` / `deny`)
- Condition evaluation for contextual access
- Ownership-aware filtering and mutation safeguards
- Admin panel entry page for plugin management

## Installation

```bash
npm i strapi-permission-manager-pro
```

## Local development (link workflow)

From plugin directory:

```bash
npm link
```

From your Strapi app:

```bash
npm link strapi-permission-manager-pro
```

## Enable plugin

In `config/plugins.js`:

```js
module.exports = () => ({
  'permission-manager-pro': {
    enabled: true,
  },
});
```

Note:
- npm package name is `strapi-permission-manager-pro`
- Strapi plugin id is `permission-manager-pro`

## Registered content-types

- `plugin::permission-manager-pro.permission-domain`
- `plugin::permission-manager-pro.permission-resource`
- `plugin::permission-manager-pro.permission-role`
- `plugin::permission-manager-pro.permission-policy`
- `plugin::permission-manager-pro.permission-grant`

## Core services

- `context-resolver`
- `permission-engine`
- `condition-evaluator`
- `filter-builder`
- `ownership-handler`

## Seed data responsibility

This package does not ship app seed data. Seed generation and seed execution should be handled in the host Strapi app (for example `pos-strapi/src/seed/data`) using your existing seeding runner.

## Support

- Author: Ejaz Hussain Arain
- Email: eharain@yahoo.com
- LinkedIn: https://www.linkedin.com/in/ejazarain
