import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Main,
  Typography,
  Button,
  Flex,
  TextInput,
  SingleSelect,
  SingleSelectOption,
  MultiSelect,
  MultiSelectOption,
  Divider,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";

const TABS = [
  { key: "domains", label: "Domains" },
  { key: "resources", label: "Resources" },
  { key: "roles", label: "Roles" },
  { key: "policies", label: "Policies" },
  { key: "grants", label: "Grants" },
  { key: "assignments", label: "User Assignments" },
];

const ENTITY_CONFIG = {
  domains: ["key", "name", "description"],
  resources: ["key", "uid"],
  roles: ["key", "level"],
  policies: ["key", "effect"],
  grants: ["key"],
};

const endpoint = (path) => `/permission-manager-pro${path}`;

const HomePage = () => {
  const { get, post, put, del } = useFetchClient();
  const [activeTab, setActiveTab] = useState("domains");
  const [overview, setOverview] = useState({});
  const [entityData, setEntityData] = useState({
    domains: [],
    resources: [],
    roles: [],
    policies: [],
    grants: [],
  });
  const [users, setUsers] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [formState, setFormState] = useState({});
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const activeFields = useMemo(() => ENTITY_CONFIG[activeTab] || [], [activeTab]);

  useEffect(() => {
    loadOverview();
    loadAllEntities();
    loadUsersAndRoles();
  }, []);

  useEffect(() => {
    setFormState({});
    setMessage("");
  }, [activeTab]);

  const loadOverview = async () => {
    try {
      const { data } = await get(endpoint("/overview"));
      setOverview(data || {});
    } catch {
      setMessage("Failed to load overview.");
    }
  };

  const loadEntity = async (entity) => {
    const { data } = await get(endpoint(`/entities/${entity}`));
    setEntityData((prev) => ({ ...prev, [entity]: data?.data || [] }));
  };

  const loadAllEntities = async () => {
    const entities = ["domains", "resources", "roles", "policies", "grants"];
    for (const entity of entities) {
      try {
        await loadEntity(entity);
      } catch {
        setMessage(`Failed to load ${entity}.`);
      }
    }
  };

  const loadUsersAndRoles = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        get(endpoint("/users")),
        get(endpoint("/entities/roles")),
      ]);
      setUsers(usersRes?.data?.data || []);
      setRoleOptions(rolesRes?.data?.data || []);
    } catch {
      setMessage("Failed to load users/roles.");
    }
  };

  const onFieldChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const submitEntity = async () => {
    if (!ENTITY_CONFIG[activeTab]) return;
    setLoading(true);
    setMessage("");

    try {
      await post(endpoint(`/entities/${activeTab}`), { data: formState });
      setMessage(`${activeTab} entry created.`);
      setFormState({});
      await loadEntity(activeTab);
      await loadOverview();
    } catch {
      setMessage(`Failed to create ${activeTab} entry.`);
    } finally {
      setLoading(false);
    }
  };

  const deleteEntity = async (entity, id) => {
    setLoading(true);
    setMessage("");

    try {
      await del(endpoint(`/entities/${entity}/${id}`));
      setMessage(`${entity} entry deleted.`);
      await loadEntity(entity);
      await loadOverview();
    } catch {
      setMessage(`Failed to delete ${entity} entry.`);
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (value) => {
    setSelectedUserId(value);
    const user = users.find((u) => String(u.id) === String(value));
    const roles = (user?.permission_roles || []).map((r) => String(r.id));
    setSelectedRoleIds(roles);
  };

  const saveAssignment = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    setMessage("");

    try {
      await put(endpoint(`/users/${selectedUserId}/roles`), {
        roleIds: selectedRoleIds.map((id) => Number(id)),
      });
      setMessage("User role assignment updated.");
      await loadUsersAndRoles();
    } catch {
      setMessage("Failed to update user role assignment.");
    } finally {
      setLoading(false);
    }
  };

  const renderEntityTab = () => {
    const rows = entityData[activeTab] || [];

    return (
      <Box paddingTop={4}>
        <Typography variant="beta">Manage {activeTab}</Typography>
        <Box paddingTop={3}>
          <Flex direction="column" gap={2}>
            {activeFields.map((field) => (
              <TextInput
                key={field}
                label={field}
                name={field}
                value={formState[field] || ""}
                onChange={(e) => onFieldChange(field, e.target.value)}
              />
            ))}
            <Button onClick={submitEntity} loading={loading}>
              Create
            </Button>
          </Flex>
        </Box>

        <Box paddingTop={4}>
          <Typography variant="delta">Existing records</Typography>
          <Box paddingTop={2}>
            {rows.length === 0 && <Typography textColor="neutral600">No records</Typography>}
            {rows.map((row) => (
              <Flex key={row.id} justifyContent="space-between" alignItems="center" paddingTop={2}>
                <Typography>{row.key || row.name || `#${row.id}`}</Typography>
                <Button variant="danger-light" onClick={() => deleteEntity(activeTab, row.id)}>
                  Delete
                </Button>
              </Flex>
            ))}
          </Box>
        </Box>
      </Box>
    );
  };

  const renderAssignmentsTab = () => (
    <Box paddingTop={4}>
      <Typography variant="beta">Assign permission roles to users</Typography>
      <Box paddingTop={3}>
        <SingleSelect label="User" placeholder="Select user" value={selectedUserId} onChange={selectUser}>
          {users.map((user) => (
            <SingleSelectOption key={user.id} value={String(user.id)}>
              {user.displayName || user.username || user.email}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Box>

      <Box paddingTop={3}>
        <MultiSelect label="Permission Roles" withTags value={selectedRoleIds} onChange={setSelectedRoleIds}>
          {roleOptions.map((role) => (
            <MultiSelectOption key={role.id} value={String(role.id)}>
              {role.key}
            </MultiSelectOption>
          ))}
        </MultiSelect>
      </Box>

      <Box paddingTop={3}>
        <Button onClick={saveAssignment} loading={loading} disabled={!selectedUserId}>
          Save Assignment
        </Button>
      </Box>
    </Box>
  );

  return (
    <Main>
      <Box padding={8} background="neutral100">
        <Typography variant="alpha">Permission Manager Pro</Typography>
        <Box paddingTop={2}>
          <Typography variant="omega" textColor="neutral600">
            Permission entities are hidden from Content Manager and managed here.
          </Typography>
        </Box>

        <Box paddingTop={4}>
          <Flex gap={2} wrap="wrap">
            {TABS.map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "tertiary"}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </Flex>
        </Box>

        <Box paddingTop={4}>
          <Flex gap={4} wrap="wrap">
            <Typography variant="pi">Domains: {overview.domains ?? 0}</Typography>
            <Typography variant="pi">Resources: {overview.resources ?? 0}</Typography>
            <Typography variant="pi">Roles: {overview.roles ?? 0}</Typography>
            <Typography variant="pi">Policies: {overview.policies ?? 0}</Typography>
            <Typography variant="pi">Grants: {overview.grants ?? 0}</Typography>
            <Typography variant="pi">Users: {overview.users ?? 0}</Typography>
          </Flex>
        </Box>

        <Divider marginTop={4} />

        {activeTab === "assignments" ? renderAssignmentsTab() : renderEntityTab()}

        {!!message && (
          <Box paddingTop={4}>
            <Typography textColor="neutral700">{message}</Typography>
          </Box>
        )}
      </Box>
    </Main>
  );
};

export default HomePage;
