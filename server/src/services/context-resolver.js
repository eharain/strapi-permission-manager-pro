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
  resolve(ctx = {}) {
    const config = strapi.plugin("permission-manager-pro").config();
    const headerDomainKey = config.headerDomainKey || "x-rutba-app";
    const headerElevatedKey = config.headerElevatedKey || "x-rutba-app-admin";

    const headers = ctx.request?.headers || {};
    const user = ctx.state?.user || null;

    const activeDomain = normalizeHeader(headers[headerDomainKey]);
    const elevatedHeader = normalizeHeader(headers[headerElevatedKey]).toLowerCase();

    const roles = user?.permissionRoles || [];
    const domainAdmin = roles.some((role) => role?.level === "admin" && role?.domain?.key === activeDomain);

    return {
      user,
      activeDomain,
      isElevated: TRUTHY_VALUES.has(elevatedHeader) && domainAdmin,
      roles,
      teamIds: user?.teamIds || [],
    };
  },
});
