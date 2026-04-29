"use strict";

const MODEL_UIDS = {
  domains: "plugin::permission-manager-pro.permission-domain",
  resources: "plugin::permission-manager-pro.permission-resource",
  roles: "plugin::permission-manager-pro.permission-role",
  policies: "plugin::permission-manager-pro.permission-policy",
  grants: "plugin::permission-manager-pro.permission-grant",
  users: "plugin::users-permissions.user",
};

const DEFAULT_POPULATE = {
  domains: {},
  resources: { domain: true },
  roles: { domain: true, users: { fields: ["id", "username", "email", "displayName"] } },
  policies: { resource: true },
  grants: { role: { populate: { domain: true } }, policy: { populate: { resource: true } } },
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

module.exports = ({ strapi }) => ({
  async overview(ctx) {
    const [domains, resources, roles, policies, grants, users] = await Promise.all([
      strapi.db.query(MODEL_UIDS.domains).count(),
      strapi.db.query(MODEL_UIDS.resources).count(),
      strapi.db.query(MODEL_UIDS.roles).count(),
      strapi.db.query(MODEL_UIDS.policies).count(),
      strapi.db.query(MODEL_UIDS.grants).count(),
      strapi.db.query(MODEL_UIDS.users).count(),
    ]);

    ctx.send({ domains, resources, roles, policies, grants, users });
  },

  async list(ctx) {
    const entity = String(ctx.params.entity || "").trim();
    const modelUid = MODEL_UIDS[entity];

    if (!modelUid || entity === "users") {
      return ctx.badRequest("Invalid entity.");
    }

    const records = await strapi.db.query(modelUid).findMany({
      orderBy: { id: "asc" },
      populate: DEFAULT_POPULATE[entity] || {},
    });

    ctx.send({ data: records || [] });
  },

  async create(ctx) {
    const entity = String(ctx.params.entity || "").trim();
    const modelUid = MODEL_UIDS[entity];

    if (!modelUid || entity === "users") {
      return ctx.badRequest("Invalid entity.");
    }

    const payload = ctx.request.body?.data || ctx.request.body || {};
    const created = await strapi.db.query(modelUid).create({
      data: payload,
      populate: DEFAULT_POPULATE[entity] || {},
    });

    ctx.send({ data: created });
  },

  async update(ctx) {
    const entity = String(ctx.params.entity || "").trim();
    const modelUid = MODEL_UIDS[entity];

    if (!modelUid || entity === "users") {
      return ctx.badRequest("Invalid entity.");
    }

    const id = toNumber(ctx.params.id);
    if (!id) return ctx.badRequest("Invalid id.");

    const payload = ctx.request.body?.data || ctx.request.body || {};
    const updated = await strapi.db.query(modelUid).update({
      where: { id },
      data: payload,
      populate: DEFAULT_POPULATE[entity] || {},
    });

    ctx.send({ data: updated });
  },

  async remove(ctx) {
    const entity = String(ctx.params.entity || "").trim();
    const modelUid = MODEL_UIDS[entity];

    if (!modelUid || entity === "users") {
      return ctx.badRequest("Invalid entity.");
    }

    const id = toNumber(ctx.params.id);
    if (!id) return ctx.badRequest("Invalid id.");

    await strapi.db.query(modelUid).delete({ where: { id } });
    ctx.send({ ok: true });
  },

  async listUsers(ctx) {
    const users = await strapi.db.query(MODEL_UIDS.users).findMany({
      orderBy: { id: "asc" },
      select: ["id", "username", "email", "displayName", "blocked", "confirmed"],
      populate: {
        role: { select: ["id", "name", "type"] },
        permission_roles: { populate: { domain: true } },
      },
    });

    ctx.send({ data: users || [] });
  },

  async assignUserRoles(ctx) {
    const userId = toNumber(ctx.params.userId);
    if (!userId) return ctx.badRequest("Invalid user id.");

    const roleIds = Array.isArray(ctx.request.body?.roleIds)
      ? ctx.request.body.roleIds.map((id) => toNumber(id)).filter(Boolean)
      : [];

    const updated = await strapi.db.query(MODEL_UIDS.users).update({
      where: { id: userId },
      data: {
        permission_roles: roleIds,
      },
      populate: {
        permission_roles: { populate: { domain: true } },
        role: { select: ["id", "name", "type"] },
      },
    });

    ctx.send({ data: updated });
  },
});
