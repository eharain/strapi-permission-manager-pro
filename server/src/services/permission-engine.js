"use strict";

module.exports = ({ strapi }) => ({
  async can({ user, method, path, context = {} }) {
    const config = strapi.plugin("permission-manager-pro").config();

    const resources = await strapi.db.query("plugin::permission-manager-pro.permission-resource").findMany({
      where: { isActive: true },
    });

    const matched = (resources || []).find((resource) => {
      if (!resource.pathPattern || !resource.method) return false;
      if (String(resource.method).toUpperCase() !== String(method).toUpperCase()) return false;

      const regex = new RegExp(`^${String(resource.pathPattern).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\:[^/]+/g, "[^/]+")}$`);
      return regex.test(String(path || "").split("?")[0].replace(/\/$/, "") || "/");
    });

    if (!matched) {
      return { allowed: !config.denyByDefault, resource: null, reason: "resource-not-matched" };
    }

    if (matched.effect === "deny") {
      return { allowed: false, resource: matched, reason: "resource-explicit-deny" };
    }

    if (matched.isPublic) {
      return { allowed: true, resource: matched, reason: "resource-public" };
    }

    if (!user) {
      return { allowed: false, resource: matched, reason: "auth-required" };
    }

    const domain = context.domain;
    if (!domain) {
      return { allowed: false, resource: matched, reason: "domain-required" };
    }

    const userRoleType = user?.role?.type || user?.role?.name || config.publicRoleType || "public";
    if (domain.strapiRoleType && domain.strapiRoleType !== userRoleType) {
      return { allowed: false, resource: matched, reason: "domain-role-type-mismatch" };
    }

    const groups = await strapi.db.query("plugin::permission-manager-pro.permission-role").findMany({
      where: {
        isActive: true,
        domain: { id: domain.id },
        users: { id: user.id },
      },
      populate: {
        resources: {
          select: ["id"],
        },
      },
    });

    const assigned = (groups || []).some((group) => (group.resources || []).some((resource) => resource.id === matched.id));
    if (!assigned) {
      return { allowed: false, resource: matched, reason: "resource-not-assigned" };
    }

    return { allowed: true, resource: matched, reason: "assigned-via-domain-group" };
  },
});
