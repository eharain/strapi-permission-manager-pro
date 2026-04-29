"use strict";

const OPERATOR_MAP = {
  equals: "$eq",
  includes: "$in",
  in: "$in",
};

const resolveToken = (value, runtime) => {
  if (typeof value !== "string" || !value.startsWith("$")) {
    return value;
  }

  const tokenPath = value.substring(1).split(".");
  return tokenPath.reduce((acc, segment) => {
    if (acc === undefined || acc === null) {
      return undefined;
    }

    return acc[segment];
  }, runtime);
};

const buildNestedFilter = (path, operator, value) => {
  const segments = path.split(".");
  const root = {};
  let pointer = root;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];

    if (index === segments.length - 1) {
      pointer[segment] = { [operator]: value };
    } else {
      pointer[segment] = {};
      pointer = pointer[segment];
    }
  }

  return root;
};

module.exports = ({ strapi }) => ({
  build(conditions = [], runtime = {}) {
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return {};
    }

    const filters = conditions
      .map((condition) => {
        const mappedOperator = OPERATOR_MAP[condition.operator];
        if (!mappedOperator || !condition.path) {
          return null;
        }

        const resolvedValue = resolveToken(condition.value, runtime);
        const value = condition.operator === "includes" && !Array.isArray(resolvedValue) ? [resolvedValue] : resolvedValue;

        return buildNestedFilter(condition.path, mappedOperator, value);
      })
      .filter(Boolean);

    if (filters.length === 0) {
      return {};
    }

    if (filters.length === 1) {
      return filters[0];
    }

    return { $and: filters };
  },

  withOwnership(filters = {}, runtime = {}, relationField = "owners") {
    const config = strapi.plugin("permission-manager-pro").config();
    if (!config.enforceOwnership || runtime.isElevated) {
      return filters;
    }

    if (!runtime.user?.id) {
      return { $and: [filters, { id: { $eq: null } }] };
    }

    const ownershipFilter = {
      [relationField]: {
        id: {
          $eq: runtime.user.id,
        },
      },
    };

    if (Object.keys(filters).length === 0) {
      return ownershipFilter;
    }

    return {
      $and: [filters, ownershipFilter],
    };
  },
});
