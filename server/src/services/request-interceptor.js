"use strict";

const normalizePath = (path = "") => {
  const clean = String(path || "").split("?")[0] || "";
  return clean.replace(/\/$/, "") || "/";
};

const pathToRegex = (pattern = "") => {
  const escaped = String(pattern)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\:[^/]+/g, "[^/]+");

  return new RegExp(`^${escaped}$`);
};

const getByToken = (runtime, token = "") => {
  if (!token.startsWith("$")) return token;
  const path = token.slice(1).split(".");
  return path.reduce((acc, key) => (acc == null ? undefined : acc[key]), runtime);
};

const stripFields = (data, fields = []) => {
  if (!data || typeof data !== "object" || !Array.isArray(fields) || fields.length === 0) {
    return data;
  }

  const doStrip = (obj) => {
    if (!obj || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => doStrip(item));
    }

    const cloned = { ...obj };
    for (const field of fields) {
      delete cloned[field];
    }

    for (const key of Object.keys(cloned)) {
      if (cloned[key] && typeof cloned[key] === "object") {
        cloned[key] = doStrip(cloned[key]);
      }
    }

    return cloned;
  };

  return doStrip(data);
};

const pickFields = (data, fields = []) => {
  if (!data || typeof data !== "object" || !Array.isArray(fields) || fields.length === 0) {
    return data;
  }

  const doPick = (obj) => {
    if (!obj || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => doPick(item));
    }

    const picked = {};
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(obj, field)) {
        picked[field] = obj[field];
      }
    }

    if (Object.prototype.hasOwnProperty.call(obj, "id")) {
      picked.id = obj.id;
    }

    return picked;
  };

  return doPick(data);
};

module.exports = ({ strapi }) => {
  const buildRuntime = (ctx, context, domain) => ({
    user: context.user,
    request: {
      method: String(ctx.method || "").toUpperCase(),
      path: normalizePath(ctx.path || ctx.request?.path || ""),
      query: ctx.query || {},
      body: ctx.request?.body || {},
      headers: ctx.request?.headers || {},
    },
    domain,
    now: new Date().toISOString(),
  });

  const matchResource = (resources, method, path) => {
    const upper = String(method || "").toUpperCase();
    const normalizedPath = normalizePath(path);

    for (const resource of resources) {
      if (!resource?.isActive) continue;
      if (String(resource.method || "").toUpperCase() !== upper) continue;
      if (!resource.pathPattern) continue;

      const regex = pathToRegex(normalizePath(resource.pathPattern));
      if (regex.test(normalizedPath)) {
        return resource;
      }
    }

    return null;
  };

  const applyRequestRules = (ctx, resource, runtime) => {
    const rules = resource.requestRules || {};

    if (rules.filters && typeof rules.filters === "object") {
      ctx.query = ctx.query || {};
      ctx.query.filters = {
        ...(ctx.query.filters || {}),
        ...rules.filters,
      };
    }

    if (Array.isArray(rules.dynamicFilters)) {
      ctx.query = ctx.query || {};
      ctx.query.filters = ctx.query.filters || {};

      for (const rule of rules.dynamicFilters) {
        if (!rule?.path) continue;
        const value = getByToken(runtime, rule.value);
        if (value === undefined) continue;

        const keys = String(rule.path).split(".");
        let ptr = ctx.query.filters;
        for (let i = 0; i < keys.length - 1; i += 1) {
          ptr[keys[i]] = ptr[keys[i]] || {};
          ptr = ptr[keys[i]];
        }
        ptr[keys[keys.length - 1]] = { $eq: value };
      }
    }

    if (Array.isArray(rules.stripBodyFields) && ctx.request?.body && typeof ctx.request.body === "object") {
      for (const field of rules.stripBodyFields) {
        delete ctx.request.body[field];
      }
    }

    if (rules.forceBodyFields && typeof rules.forceBodyFields === "object") {
      ctx.request.body = ctx.request.body || {};
      for (const [key, value] of Object.entries(rules.forceBodyFields)) {
        const resolved = typeof value === "string" ? getByToken(runtime, value) : value;
        ctx.request.body[key] = resolved;
      }
    }

    if (rules.populate === false && ctx.query?.populate) {
      delete ctx.query.populate;
    }

    if (Array.isArray(rules.allowedPopulate) && ctx.query?.populate) {
      if (Array.isArray(ctx.query.populate)) {
        ctx.query.populate = ctx.query.populate.filter((p) => rules.allowedPopulate.includes(p));
      } else if (typeof ctx.query.populate === "object") {
        const nextPopulate = {};
        for (const key of Object.keys(ctx.query.populate)) {
          if (rules.allowedPopulate.includes(key)) {
            nextPopulate[key] = ctx.query.populate[key];
          }
        }
        ctx.query.populate = nextPopulate;
      }
    }
  };

  const applyResponseRules = (body, resource) => {
    if (!body || typeof body !== "object") return body;

    const rules = resource.responseRules || {};
    let nextBody = body;

    if (Array.isArray(rules.allowedFields) && rules.allowedFields.length > 0) {
      if (Object.prototype.hasOwnProperty.call(nextBody, "data")) {
        nextBody = {
          ...nextBody,
          data: pickFields(nextBody.data, rules.allowedFields),
        };
      } else {
        nextBody = pickFields(nextBody, rules.allowedFields);
      }
    }

    if (Array.isArray(rules.stripFields) && rules.stripFields.length > 0) {
      if (Object.prototype.hasOwnProperty.call(nextBody, "data")) {
        nextBody = {
          ...nextBody,
          data: stripFields(nextBody.data, rules.stripFields),
        };
      } else {
        nextBody = stripFields(nextBody, rules.stripFields);
      }
    }

    return nextBody;
  };

  return {
    async intercept(ctx, next) {
      if (!ctx || !ctx.request) {
        return next();
      }

      const config = strapi.plugin("permission-manager-pro").config();
      if (!config.interceptorEnabled) {
        return next();
      }

      const bypassPaths = Array.isArray(config.bypassPaths) ? config.bypassPaths : ["/admin", "/permission-manager-pro"];
      if (bypassPaths.some((prefix) => String(ctx.path || "").startsWith(prefix))) {
        return next();
      }

      const contextResolver = strapi.plugin("permission-manager-pro").service("context-resolver");
      const permissionEngine = strapi.plugin("permission-manager-pro").service("permission-engine");

      const context = await contextResolver.resolve(ctx);
      const domain = context.domain;

      const decision = await permissionEngine.can({
        user: context.user,
        method: ctx.method,
        path: ctx.path || ctx.request.path,
        context,
      });

      if (!decision.allowed) {
        if (decision.reason === "auth-required") {
          return ctx.unauthorized("Authentication required.");
        }

        if (decision.reason === "resource-not-matched" && !config.denyByDefault) {
          return next();
        }

        return ctx.forbidden(`No access to requested resource (${decision.reason || "denied"}).`);
      }

      const matchedResource = decision.resource;
      if (!matchedResource) {
        return next();
      }

      const runtime = buildRuntime(ctx, context, domain);
      applyRequestRules(ctx, matchedResource, runtime);

      await next();

      ctx.body = applyResponseRules(ctx.body, matchedResource);
    },
  };
};
