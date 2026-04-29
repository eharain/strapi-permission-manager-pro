"use strict";

const MODEL_UIDS = {
  domains: "plugin::permission-manager-pro.permission-domain",
  resources: "plugin::permission-manager-pro.permission-resource",
  roles: "plugin::permission-manager-pro.permission-role",
  users: "plugin::users-permissions.user",
};

const DEFAULT_POPULATE = {
  domains: {},
  resources: {},
  roles: { domain: true, resources: true, users: { fields: ["id", "username", "email", "displayName"] } },
};

const PLURAL_FALLBACK = (uid = "") => {
  const raw = String(uid).split(".").pop() || "";
  if (raw.endsWith("s")) return raw;
  if (raw.endsWith("y")) return `${raw.slice(0, -1)}ies`;
  return `${raw}s`;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

module.exports = ({ strapi }) => ({
  async overview(ctx) {
    const [domains, resources, roles, users] = await Promise.all([
      strapi.db.query(MODEL_UIDS.domains).count(),
      strapi.db.query(MODEL_UIDS.resources).count(),
      strapi.db.query(MODEL_UIDS.roles).count(),
      strapi.db.query(MODEL_UIDS.users).count(),
    ]);

    ctx.send({ domains, resources, roles, users });
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

  async strapiContentTypes(ctx) {
    const allTypes = Object.values(strapi.contentTypes);
    const types = allTypes
      .filter((ct) => !ct.plugin && ct.kind === "collectionType")
      .map((ct) => {
        const slug = ct.info?.pluralName || PLURAL_FALLBACK(ct.uid);
        return {
          uid: ct.uid,
          displayName: ct.info?.displayName || ct.uid,
          attributes: Object.entries(ct.attributes || {})
            .filter(([, attr]) => attr.type !== "relation" && attr.type !== "dynamiczone")
            .map(([name]) => name),
          routes: [
            { method: "GET", action: "find", pathPattern: `/api/${slug}` },
            { method: "GET", action: "findOne", pathPattern: `/api/${slug}/:id` },
            { method: "POST", action: "create", pathPattern: `/api/${slug}` },
            { method: "PUT", action: "update", pathPattern: `/api/${slug}/:id` },
            { method: "DELETE", action: "delete", pathPattern: `/api/${slug}/:id` },
          ],
        };
      });
    ctx.send({ data: types });
  },

  async discoveredResources(ctx) {
    const allTypes = Object.values(strapi.contentTypes);
    const resources = [];

    allTypes
      .filter((ct) => !ct.plugin && ct.kind === "collectionType")
      .forEach((ct) => {
        const slug = ct.info?.pluralName || PLURAL_FALLBACK(ct.uid);
        resources.push(
          {
            key: `${ct.uid}.find`,
            label: `${ct.info?.displayName || ct.uid} / find`,
            method: "GET",
            pathPattern: `/api/${slug}`,
            contentTypeUid: ct.uid,
            controllerAction: "find",
            resourceType: "standard",
            effect: "allow",
            isActive: true,
          },
          {
            key: `${ct.uid}.findOne`,
            label: `${ct.info?.displayName || ct.uid} / findOne`,
            method: "GET",
            pathPattern: `/api/${slug}/:id`,
            contentTypeUid: ct.uid,
            controllerAction: "findOne",
            resourceType: "standard",
            effect: "allow",
            isActive: true,
          },
          {
            key: `${ct.uid}.create`,
            label: `${ct.info?.displayName || ct.uid} / create`,
            method: "POST",
            pathPattern: `/api/${slug}`,
            contentTypeUid: ct.uid,
            controllerAction: "create",
            resourceType: "standard",
            effect: "allow",
            isActive: true,
          },
          {
            key: `${ct.uid}.update`,
            label: `${ct.info?.displayName || ct.uid} / update`,
            method: "PUT",
            pathPattern: `/api/${slug}/:id`,
            contentTypeUid: ct.uid,
            controllerAction: "update",
            resourceType: "standard",
            effect: "allow",
            isActive: true,
          },
          {
            key: `${ct.uid}.delete`,
            label: `${ct.info?.displayName || ct.uid} / delete`,
            method: "DELETE",
            pathPattern: `/api/${slug}/:id`,
            contentTypeUid: ct.uid,
            controllerAction: "delete",
            resourceType: "standard",
            effect: "allow",
            isActive: true,
          }
        );
      });

    ctx.send({ data: resources });
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
