# Public Documentation - strapi-permission-manager-pro

This document describes public usage for `strapi-permission-manager-pro`.

## Package and plugin naming

- npm package: `strapi-permission-manager-pro`
- Strapi plugin id: `permission-manager-pro`

Use the npm package name for install/link commands and the plugin id in `config/plugins.js`.

## Quick start

1. Install package in your Strapi v5 app.
2. Enable plugin in `config/plugins.js`.
3. Restart Strapi.
4. Open admin panel and navigate to **Permission Manager Pro**.

## Compatibility

- Strapi: v5
- Node.js: 20+

## Host app responsibilities

The host app is responsible for:

- seeding policy/domain/resource/role/grant data
- migration scripts from legacy permission systems
- environment-level rollout strategy (e.g., dual-engine mode)

## Recommended rollout

1. Define domains and resources.
2. Map roles to policies.
3. Apply grants.
4. Validate with read-only paths first.
5. Enable write paths after verification.

## Links

- Repository: https://github.com/eharain/strapi-permission-manager-pro
- Issues: https://github.com/eharain/strapi-permission-manager-pro/issues
