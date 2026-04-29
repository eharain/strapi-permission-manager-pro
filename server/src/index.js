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

module.exports = {
  config: {
    default: {
      headerDomainKey: "x-rutba-app",
      headerElevatedKey: "x-rutba-app-admin",
      enforceOwnership: true,
      denyByDefault: true,
    },
    validator() {},
  },

  register() {},

  bootstrap() {
    strapi.log.info("[strapi-permission-manager-pro] bootstrap completed");
  },

  destroy() {},

  controllers: {
    ui: uiController,
  },

  routes: {
    admin: adminRoutes,
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
  },
};