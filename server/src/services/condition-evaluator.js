"use strict";

const getValueByPath = (source, path) => {
  if (!path) {
    return undefined;
  }

  return path.split(".").reduce((acc, key) => {
    if (acc === undefined || acc === null) {
      return undefined;
    }

    return acc[key];
  }, source);
};

const normalizeComparableValue = (value, runtime) => {
  if (typeof value !== "string") {
    return value;
  }

  if (!value.startsWith("$")) {
    return value;
  }

  const token = value.substring(1);
  return getValueByPath(runtime, token);
};

const evaluateOperator = (operator, left, right) => {
  switch (operator) {
    case "equals":
      return left === right;
    case "includes":
      return Array.isArray(left) ? left.includes(right) : false;
    case "in":
      return Array.isArray(right) ? right.includes(left) : false;
    default:
      return false;
  }
};

module.exports = () => ({
  evaluate(conditions = [], runtime = {}) {
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return true;
    }

    return conditions.every((condition) => {
      const left = getValueByPath(runtime, condition.path);
      const right = normalizeComparableValue(condition.value, runtime);
      return evaluateOperator(condition.operator, left, right);
    });
  },
});
