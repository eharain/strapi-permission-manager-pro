"use strict";

const DEFAULT_ACTION_ALIASES = {
  read: ["find", "findOne"],
  write: ["create", "update", "delete"],
};

const actionMatches = (requestedAction, policyActions = []) => {
  if (!Array.isArray(policyActions)) {
    return false;
  }

  if (policyActions.includes(requestedAction) || policyActions.includes("*")) {
    return true;
  }

  return Object.entries(DEFAULT_ACTION_ALIASES).some(([alias, actions]) => alias === requestedAction && actions.some((action) => policyActions.includes(action)));
};

module.exports = ({ strapi }) => ({
  async can({ user, action, resourceUid, entity = null, context = {} }) {
    const pluginConfig = strapi.plugin("permission-manager-pro").config();
    const denyByDefault = pluginConfig.denyByDefault !== false;

    if (!user) {
      return false;
    }

    const grants = await strapi.entityService.findMany("plugin::permission-manager-pro.permission-grant", {
      populate: {
        role: {
          populate: {
            domain: true,
          },
        },
        policy: {
          populate: {
            resource: true,
          },
        },
      },
    });

    const runtime = {
      user,
      entity,
      context,
      isElevated: Boolean(context.isElevated),
      activeDomain: context.activeDomain,
      teamIds: context.teamIds || [],
    };

    const conditionEvaluator = strapi.plugin("permission-manager-pro").service("condition-evaluator");

    let allowed = false;

    for (const grant of grants) {
      const role = grant.role;
      const policy = grant.policy;

      if (!role || !policy) {
        continue;
      }

      if (runtime.activeDomain && role.domain?.key && role.domain.key !== runtime.activeDomain) {
        continue;
      }

      if (resourceUid && policy.resource?.uid && policy.resource.uid !== resourceUid) {
        continue;
      }

      if (!actionMatches(action, policy.actions)) {
        continue;
      }

      const passed = conditionEvaluator.evaluate(policy.conditions || [], runtime);
      if (!passed) {
        continue;
      }

      if (policy.effect === "deny") {
        return false;
      }

      allowed = true;
    }

    return allowed || !denyByDefault;
  },
});
