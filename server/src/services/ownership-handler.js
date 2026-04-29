"use strict";

const hasOwner = (entity, userId, relationField) => {
  const owners = entity?.[relationField];
  if (!Array.isArray(owners)) {
    return false;
  }

  return owners.some((owner) => {
    if (typeof owner === "number" || typeof owner === "string") {
      return String(owner) === String(userId);
    }

    return String(owner?.id) === String(userId);
  });
};

module.exports = ({ strapi }) => ({
  assignOnCreate(data = {}, runtime = {}, relationField = "owners") {
    const config = strapi.plugin("permission-manager-pro").config();
    if (!config.enforceOwnership || runtime.isElevated || !runtime.user?.id) {
      return data;
    }

    const assignedOwners = Array.isArray(data[relationField]) ? [...data[relationField]] : [];

    if (!assignedOwners.includes(runtime.user.id)) {
      assignedOwners.push(runtime.user.id);
    }

    return {
      ...data,
      [relationField]: assignedOwners,
    };
  },

  assertOwnership(entity = {}, runtime = {}, relationField = "owners") {
    const config = strapi.plugin("permission-manager-pro").config();
    if (!config.enforceOwnership || runtime.isElevated) {
      return true;
    }

    if (!runtime.user?.id) {
      return false;
    }

    return hasOwner(entity, runtime.user.id, relationField);
  },
});
