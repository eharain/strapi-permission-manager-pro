"use strict";

const domain = require("./content-types/permission-domain");
const resource = require("./content-types/permission-resource");
const role = require("./content-types/permission-role");
const policy = require("./content-types/permission-policy");
const grant = require("./content-types/permission-grant");
const uiController = require("./controllers/ui");
const adminRoutes = require("./routes/admin");

const contextResolver = require("./services/context-resolver");
const conditionEvaluator = require("./services/condition-evaluator");
const filterBuilder = require("./services/filter-builder");
const ownershipHandler = require("./services/ownership-handler");
const permissionEngine = require("./services/permission-engine");
const requestInterceptor = require("./services/request-interceptor");

module.exports = {
  config: {
    default: {
      headerDomainKey: "x-rutba-app",
      domainQueryKey: "_domain",
      headerElevatedKey: "x-rutba-app-admin",
      publicRoleType: "public",
      bypassPaths: ["/admin", "/permission-manager-pro"],
      interceptorEnabled: true,
      denyByDefault: true,
    },
    validator() {},
  },

  register() {},

  bootstrap({ strapi }) {
    strapi.server.use(async (ctx, next) => {
      const interceptor = strapi.plugin("permission-manager-pro").service("request-interceptor");
      await interceptor.intercept(ctx, next);
    });

    strapi.log.info("[strapi-permission-manager-pro] bootstrap completed with request interceptor");
  },

  destroy() {},

  controllers: {
    ui: uiController,
  },

  routes: {
    admin: {
      type: "admin",
      routes: adminRoutes,
    },
  },

  contentTypes: {
    "permission-domain": domain,
    "permission-resource": resource,
    "permission-role": role,
    "permission-policy": policy,
    "permission-grant": grant,
  },

  services: {
    "context-resolver": contextResolver,
    "condition-evaluator": conditionEvaluator,
    "filter-builder": filterBuilder,
    "ownership-handler": ownershipHandler,
    "permission-engine": permissionEngine,
    "request-interceptor": requestInterceptor,
  },
};