"use strict";

module.exports = [
  {
    method: "GET",
    path: "/overview",
    handler: "ui.overview",
    config: {
      auth: false,
    },
  },
  {
    method: "GET",
    path: "/entities/:entity",
    handler: "ui.list",
    config: {
      auth: false,
    },
  },
  {
    method: "POST",
    path: "/entities/:entity",
    handler: "ui.create",
    config: {
      auth: false,
    },
  },
  {
    method: "PUT",
    path: "/entities/:entity/:id",
    handler: "ui.update",
    config: {
      auth: false,
    },
  },
  {
    method: "DELETE",
    path: "/entities/:entity/:id",
    handler: "ui.remove",
    config: {
      auth: false,
    },
  },
  {
    method: "GET",
    path: "/users",
    handler: "ui.listUsers",
    config: {
      auth: false,
    },
  },
  {
    method: "PUT",
    path: "/users/:userId/roles",
    handler: "ui.assignUserRoles",
    config: {
      auth: false,
    },
  },
  {
    method: "GET",
    path: "/strapi-content-types",
    handler: "ui.strapiContentTypes",
    config: {
      auth: false,
    },
  },
  {
    method: "GET",
    path: "/discovered-resources",
    handler: "ui.discoveredResources",
    config: {
      auth: false,
    },
  },
];
