"use strict";

const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"]);

const normalizeHeader = (value) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

module.exports = ({ strapi }) => ({
  async resolve(ctx = {}) {
    const config = strapi.plugin("permission-manager-pro").config();
    const headerDomainKey = config.headerDomainKey || "x-rutba-app";
    const domainQueryKey = config.domainQueryKey || "_domain";
    const headerElevatedKey = config.headerElevatedKey || "x-rutba-app-admin";

    const headers = ctx.request?.headers || {};
    const user = ctx.state?.user || null;
    const query = ctx.query || {};

    const headerDomain = normalizeHeader(headers[headerDomainKey]);
    const queryDomain = normalizeHeader(query[domainQueryKey]);
    const activeDomain = headerDomain || queryDomain;

    const elevatedHeader = normalizeHeader(headers[headerElevatedKey]).toLowerCase();

    const roles = user?.permissionRoles || [];
    const domainAdmin = roles.some((role) => role?.level === "admin" && role?.domain?.key === activeDomain);

    const domain = activeDomain
      ? await strapi.db.query("plugin::permission-manager-pro.permission-domain").findOne({
          where: {
            key: activeDomain,
            isActive: true,
          },
        })
      : null;

    return {
      user,
      activeDomain,
      domain,
      isElevated: TRUTHY_VALUES.has(elevatedHeader) && domainAdmin,
      roles,
      teamIds: user?.teamIds || [],
      domainQueryKey,
    };
  },
});
