import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Main, Typography, Button, Flex, TextInput,
  SingleSelect, SingleSelectOption,
  Divider, Loader, Alert,
} from "@strapi/design-system";
const Cross = () => React.createElement("span", { style: { fontSize: 14, lineHeight: 1 } }, "✕");
const ChevronLeft = () => React.createElement("span", { style: { fontSize: 14, lineHeight: 1 } }, "‹");
const ChevronRight = () => React.createElement("span", { style: { fontSize: 14, lineHeight: 1 } }, "›");
import { useFetchClient } from "@strapi/strapi/admin";

const PAGE_SIZE = 20;
const HTTP_METHODS = ["get", "post", "put", "delete"];
const TABS = [
  { key: "domains",     label: "Domains" },
  { key: "resources",   label: "Resources" },
  { key: "roles",       label: "Roles" },
  { key: "policies",    label: "Policies" },
  { key: "grants",      label: "Grants" },
  { key: "assignments", label: "User Assignments" },
  { key: "help",        label: "Help" },
];
const LEVEL_OPTIONS = ["staff", "manager", "admin", "super-admin"];
const EFFECT_OPTIONS = ["allow", "deny"];
const endpoint = (path) => `/permission-manager-pro${path}`;
const labelFor = (rec) => { if (!rec) return ""; return rec.key || rec.name || rec.username || rec.email || "#" + rec.id; };
const emptyFilters = () => ({ search: "", domain: "", level: "", effect: "", resource: "", role: "", policy: "" });

export default function HomePage() {
  const { get, post, put, del } = useFetchClient();
  const [activeTab, setActiveTab] = useState("domains");
  const [overview, setOverview] = useState({});
  const [entityData, setEntityData] = useState({ domains: [], resources: [], roles: [], policies: [], grants: [] });
  const [users, setUsers] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [strapiTypes, setStrapiTypes] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(emptyFilters());
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", variant: "default" });
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => { boot(); }, []);
  useEffect(() => { setPanelOpen(false); setEditingRecord(null); setPage(1); setFilters(emptyFilters()); setMessage({ text: "", variant: "default" }); }, [activeTab]);
  useEffect(() => { setPage(1); }, [filters]);

  const notify = (text, variant = "default") => setMessage({ text, variant });

  async function boot() {
    setGlobalLoading(true);
    await Promise.all([loadOverview(), loadAllEntities(), loadUsersAndRoles(), loadStrapiTypes()]);
    setGlobalLoading(false);
  }

  async function loadOverview() {
    try { const { data } = await get(endpoint("/overview")); setOverview(data || {}); } catch {}
  }

  async function loadEntity(entity) {
    const { data } = await get(endpoint("/entities/" + entity));
    setEntityData((prev) => ({ ...prev, [entity]: data?.data || [] }));
  }

  async function loadAllEntities() {
    await Promise.all(["domains","resources","roles","policies","grants"].map((e) => loadEntity(e).catch(() => {})));
  }

  async function loadUsersAndRoles() {
    try {
      const [ur, rr] = await Promise.all([get(endpoint("/users")), get(endpoint("/entities/roles"))]);
      setUsers(ur?.data?.data || []);
      setRoleOptions(rr?.data?.data || []);
    } catch {}
  }

  async function loadStrapiTypes() {
    try {
      const { data } = await get(endpoint("/strapi-content-types"));
      setStrapiTypes(data?.data || []);
    } catch {}
  }

  async function submitForm(form) {
    setActionLoading(true); notify("");
    try {
      if (editingRecord) {
        await put(endpoint("/entities/" + activeTab + "/" + editingRecord.id), { data: form });
        notify("Updated successfully.", "success");
      } else {
        await post(endpoint("/entities/" + activeTab), { data: form });
        notify("Created successfully.", "success");
      }
      setPanelOpen(false); setEditingRecord(null);
      await loadEntity(activeTab); await loadOverview();
    } catch { notify(editingRecord ? "Failed to update." : "Failed to create.", "warning"); }
    finally { setActionLoading(false); }
  }

  async function deleteRecord(entity, id) {
    if (!window.confirm("Delete this record?")) return;
    setActionLoading(true); notify("");
    try {
      await del(endpoint("/entities/" + entity + "/" + id));
      notify("Deleted.", "success");
      if (editingRecord?.id === id) { setPanelOpen(false); setEditingRecord(null); }
      await loadEntity(entity); await loadOverview();
    } catch { notify("Failed to delete.", "warning"); }
    finally { setActionLoading(false); }
  }

  async function saveAssignment() {
    if (!selectedUserId) return;
    setActionLoading(true); notify("");
    try {
      await put(endpoint("/users/" + selectedUserId + "/roles"), { roleIds: selectedRoleIds.map(Number) });
      notify("Assignment saved.", "success");
      await loadUsersAndRoles();
    } catch { notify("Failed to save assignment.", "warning"); }
    finally { setActionLoading(false); }
  }

  function selectUser(value) {
    setSelectedUserId(value);
    const user = users.find((u) => String(u.id) === String(value));
    setSelectedRoleIds((user?.permission_roles || []).map((r) => String(r.id)));
  }

  const filteredRows = useMemo(() => {
    const rows = entityData[activeTab] || [];
    return rows.filter((row) => {
      if (filters.search && !labelFor(row).toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.domain && String(row.domain?.id) !== filters.domain) return false;
      if (filters.level && row.level !== filters.level) return false;
      if (filters.effect && row.effect !== filters.effect) return false;
      if (filters.resource && String(row.resource?.id) !== filters.resource) return false;
      if (filters.role && String(row.role?.id) !== filters.role) return false;
      if (filters.policy && String(row.policy?.id) !== filters.policy) return false;
      return true;
    });
  }, [entityData, activeTab, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const { domains, resources, roles, policies } = entityData;

  return (
    <Main>
      <Box padding={8} background="neutral100" style={{ minHeight: "100vh" }}>
        <Header onRefresh={boot} />
        <StatsBar overview={overview} />
        <Divider marginTop={3} />
        <TabBar activeTab={activeTab} onSelect={setActiveTab} />
        {message.text && (
          <Box paddingTop={3}>
            <Alert closeLabel="Dismiss"
              variant={message.variant === "success" ? "success" : message.variant === "warning" ? "warning" : "default"}
              onClose={() => setMessage({ text: "", variant: "default" })}>
              {message.text}
            </Alert>
          </Box>
        )}
        {globalLoading ? (
          <Flex justifyContent="center" paddingTop={10}><Loader>Loading…</Loader></Flex>
        ) : (
          <Box paddingTop={4}>
            {activeTab === "help" && <HelpTab />}
            {activeTab === "assignments" && (
              <AssignmentsTab
                users={users} roleOptions={roleOptions}
                selectedUserId={selectedUserId} selectedRoleIds={selectedRoleIds}
                onSelectUser={selectUser} onChangeRoles={setSelectedRoleIds}
                onSave={saveAssignment} loading={actionLoading}
                userSearch={userSearch} onUserSearch={setUserSearch}
              />
            )}
            {!["help","assignments"].includes(activeTab) && (
              <EntityTab
                entity={activeTab}
                pagedRows={pagedRows} filteredCount={filteredRows.length} totalCount={(entityData[activeTab]||[]).length}
                filters={filters} onFiltersChange={setFilters}
                page={safePage} totalPages={totalPages} onPageChange={setPage}
                panelOpen={panelOpen} editingRecord={editingRecord}
                domains={domains} resources={resources} roles={roles} policies={policies}
                strapiTypes={strapiTypes}
                actionLoading={actionLoading}
                onDelete={deleteRecord}
                onEdit={(row) => { setEditingRecord(row); setPanelOpen(true); }}
                onNew={() => { setEditingRecord(null); setPanelOpen(true); }}
                onClosePanel={() => { setPanelOpen(false); setEditingRecord(null); }}
                onSave={submitForm}
              />
            )}
          </Box>
        )}
      </Box>
    </Main>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header({ onRefresh }) {
  return (
    <Flex justifyContent="space-between" alignItems="flex-start" wrap="wrap" gap={4}>
      <Box>
        <Typography variant="alpha">Permission Manager Pro</Typography>
        <Box paddingTop={1}>
          <Typography variant="omega" textColor="neutral600">
            Manage domains, resources, roles, policies, grants and user assignments.
          </Typography>
        </Box>
      </Box>
      <Button variant="secondary" onClick={onRefresh}>Refresh</Button>
    </Flex>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar({ overview }) {
  const items = ["domains","resources","roles","policies","grants","users"];
  return (
    <Flex gap={3} wrap="wrap" paddingTop={4} paddingBottom={2}>
      {items.map((k) => (
        <Flex key={k} direction="column" alignItems="center" gap={1} background="neutral0" style={{
          border: "1px solid var(--strapi-neutral200)", borderRadius: 8, padding: "8px 18px", minWidth: 90,
        }}>
          <Typography variant="beta" textColor="primary600">{overview[k] ?? 0}</Typography>
          <Typography variant="pi" textColor="neutral600" style={{ textTransform: "capitalize" }}>{k}</Typography>
        </Flex>
      ))}
    </Flex>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
function TabBar({ activeTab, onSelect }) {
  return (
    <Flex gap={2} wrap="wrap" paddingTop={4}>
      {TABS.map((tab) => (
        <Button key={tab.key} variant={activeTab === tab.key ? "default" : "tertiary"}
          onClick={() => onSelect(tab.key)} size="M">
          {tab.label}
        </Button>
      ))}
    </Flex>
  );
}

// ── Entity tab (list + right panel) ──────────────────────────────────────────
function EntityTab({
  entity, pagedRows, filteredCount, totalCount,
  filters, onFiltersChange, page, totalPages, onPageChange,
  panelOpen, editingRecord, domains, resources, roles, policies,
  strapiTypes,
  actionLoading, onDelete, onEdit, onNew, onClosePanel, onSave,
}) {
  return (
    <Flex gap={0} alignItems="flex-start">
      {/* Left: list */}
      <Box style={{ flex: 1, minWidth: 0, paddingRight: panelOpen ? 16 : 0 }}>
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
          <Typography variant="delta">{filteredCount} of {totalCount} records</Typography>
          <Button onClick={onNew} size="S">+ New {entity.slice(0, -1)}</Button>
        </Flex>

        <FilterBar entity={entity} filters={filters} onChange={onFiltersChange}
          domains={domains} resources={resources} roles={roles} policies={policies} />

        {pagedRows.length === 0 ? (
          <Box padding={6} background="neutral100" style={{ borderRadius: 8, textAlign: "center" }}>
            <Typography textColor="neutral500">
              {totalCount === 0
                ? 'No records yet. Click "+ New" to create one.'
                : "No records match your current filters."}
            </Typography>
          </Box>
        ) : (
          pagedRows.map((row) => (
            <RecordCard key={row.id} entity={entity} row={row}
              actionLoading={actionLoading} onDelete={onDelete} onEdit={onEdit} />
          ))
        )}

        <PaginationBar page={page} totalPages={totalPages} onChange={onPageChange} />
      </Box>

      {/* Right: form panel */}
      {panelOpen && (
        <FormPanel entity={entity} record={editingRecord}
          domains={domains} resources={resources} roles={roles} policies={policies}
          strapiTypes={strapiTypes}
          onSave={onSave} onClose={onClosePanel} loading={actionLoading} />
      )}
    </Flex>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────
function FilterBar({ entity, filters, onChange, domains, resources, roles, policies }) {
  const set = (k, v) => onChange({ ...filters, [k]: v });
  const hasAny = Object.values(filters).some(Boolean);
  return (
    <Box padding={3} background="neutral100" style={{ border: "1px solid var(--strapi-neutral200)", borderRadius: 8, marginBottom: 10 }}>
      <Flex gap={2} wrap="wrap" alignItems="flex-end">
        <Box style={{ flex: "1 1 180px" }}>
          <TextInput id="filter-search" label="Search key" name="search" placeholder="Filter by key..."
            value={filters.search} onChange={(e) => set("search", e.target.value)} />
        </Box>

        {(entity === "resources" || entity === "roles") && (
          <Box style={{ flex: "1 1 160px" }}>
            <SingleSelect label="Domain" value={filters.domain} onChange={(v) => set("domain", v || "")}>
              <SingleSelectOption value="">All domains</SingleSelectOption>
              {domains.map((d) => <SingleSelectOption key={d.id} value={String(d.id)}>{labelFor(d)}</SingleSelectOption>)}
            </SingleSelect>
          </Box>
        )}

        {entity === "roles" && (
          <Box style={{ flex: "1 1 140px" }}>
            <SingleSelect label="Level" value={filters.level} onChange={(v) => set("level", v || "")}>
              <SingleSelectOption value="">All levels</SingleSelectOption>
              {LEVEL_OPTIONS.map((l) => <SingleSelectOption key={l} value={l}>{l}</SingleSelectOption>)}
            </SingleSelect>
          </Box>
        )}

        {entity === "policies" && (
          <>
            <Box style={{ flex: "1 1 140px" }}>
              <SingleSelect label="Effect" value={filters.effect} onChange={(v) => set("effect", v || "")}>
                <SingleSelectOption value="">All effects</SingleSelectOption>
                {EFFECT_OPTIONS.map((e) => <SingleSelectOption key={e} value={e}>{e}</SingleSelectOption>)}
              </SingleSelect>
            </Box>
            <Box style={{ flex: "1 1 160px" }}>
              <SingleSelect label="Resource" value={filters.resource} onChange={(v) => set("resource", v || "")}>
                <SingleSelectOption value="">All resources</SingleSelectOption>
                {resources.map((r) => <SingleSelectOption key={r.id} value={String(r.id)}>{labelFor(r)}</SingleSelectOption>)}
              </SingleSelect>
            </Box>
          </>
        )}

        {entity === "grants" && (
          <>
            <Box style={{ flex: "1 1 160px" }}>
              <SingleSelect label="Role" value={filters.role} onChange={(v) => set("role", v || "")}>
                <SingleSelectOption value="">All roles</SingleSelectOption>
                {roles.map((r) => <SingleSelectOption key={r.id} value={String(r.id)}>{labelFor(r)}</SingleSelectOption>)}
              </SingleSelect>
            </Box>
            <Box style={{ flex: "1 1 160px" }}>
              <SingleSelect label="Policy" value={filters.policy} onChange={(v) => set("policy", v || "")}>
                <SingleSelectOption value="">All policies</SingleSelectOption>
                {policies.map((p) => <SingleSelectOption key={p.id} value={String(p.id)}>{labelFor(p)}</SingleSelectOption>)}
              </SingleSelect>
            </Box>
          </>
        )}

        {hasAny && (
          <Button variant="tertiary" size="S" onClick={() => onChange(emptyFilters())} style={{ alignSelf: "flex-end" }}>
            Clear filters
          </Button>
        )}
      </Flex>
    </Box>
  );
}

// ── Record card ───────────────────────────────────────────────────────────────
function RecordCard({ entity, row, onDelete, onEdit, actionLoading }) {
  const [expanded, setExpanded] = useState(false);
  const effectColor = row.effect === "allow" ? "#2ecc71" : row.effect === "deny" ? "#e74c3c" : null;
  const levelColor = { staff: "#3498db", manager: "#9b59b6", admin: "#e67e22", "super-admin": "#c0392b" }[row.level] || null;

  return (
    <Box padding={3} background="neutral0" style={{ border: "1px solid var(--strapi-neutral200)", borderRadius: 8, marginBottom: 6 }}>
      <Flex justifyContent="space-between" alignItems="center" gap={2}>
        <Flex gap={2} alignItems="center" style={{ minWidth: 0, flexWrap: "wrap" }}>
          <Typography variant="sigma" textColor="neutral800" style={{ wordBreak: "break-all" }}>
            {labelFor(row)}
          </Typography>
          {row.effect && effectColor && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
              background: effectColor + "22", color: effectColor, border: "1px solid " + effectColor + "44" }}>
              {row.effect}
            </span>
          )}
          {row.level && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
              background: (levelColor || "#666") + "22", color: levelColor || "#666",
              border: "1px solid " + (levelColor || "#666") + "44" }}>
              {row.level}
            </span>
          )}
          {row.domain && !row.level && (
            <Typography variant="pi" textColor="neutral500">({labelFor(row.domain)})</Typography>
          )}
          {row.resource && (
            <Typography variant="pi" textColor="neutral500">res: {labelFor(row.resource)}</Typography>
          )}
          {row.role && (
            <Typography variant="pi" textColor="neutral500">role: {labelFor(row.role)}</Typography>
          )}
          {row.policy && (
            <Typography variant="pi" textColor="neutral500">policy: {labelFor(row.policy)}</Typography>
          )}
          {row.methods && Array.isArray(row.methods) && row.methods.length > 0 && (
            <Typography variant="pi" textColor="neutral500">[{row.methods.map((m) => m.toUpperCase()).join(", ")}]</Typography>
          )}
          {row.fieldScope === "selected" && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
              background: "var(--strapi-warning100)", color: "var(--strapi-warning700)",
              border: "1px solid var(--strapi-warning200)" }}>
              selected fields
            </span>
          )}
        </Flex>
        <Flex gap={1} style={{ flexShrink: 0 }}>
          <Button variant="ghost" size="S" onClick={() => setExpanded((v) => !v)}>{expanded ? "▲" : "▼"}</Button>
          <Button variant="secondary" size="S" onClick={() => onEdit(row)}>Edit</Button>
          <Button variant="danger-light" size="S" loading={actionLoading} onClick={() => onDelete(entity, row.id)}>Delete</Button>
        </Flex>
      </Flex>
      {expanded && (
        <Box paddingTop={2} style={{ borderTop: "1px solid var(--strapi-neutral150)", marginTop: 8 }}>
          {Object.entries(row).map(([k, v]) => {
            if (k === "id" || v === null || v === undefined) return null;
            if (typeof v === "object" && !Array.isArray(v)) return <FieldRow key={k} label={k} value={labelFor(v)} />;
            if (Array.isArray(v)) return v.length === 0 ? null : <FieldRow key={k} label={k} value={typeof v[0]==="object" ? v.map(labelFor).join(", ") : v.join(", ")} />;
            return <FieldRow key={k} label={k} value={String(v)} />;
          })}
        </Box>
      )}
    </Box>
  );
}

function FieldRow({ label, value }) {
  return (
    <Flex gap={2} paddingTop={1}>
      <Typography variant="pi" textColor="neutral500" style={{ minWidth: 100 }}>{label}:</Typography>
      <Typography variant="pi" textColor="neutral800">{value || "—"}</Typography>
    </Flex>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function PaginationBar({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <Flex justifyContent="center" alignItems="center" gap={2} paddingTop={3}>
      <Button variant="tertiary" size="S" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft />
      </Button>
      <Typography variant="pi" textColor="neutral600">Page {page} / {totalPages}</Typography>
      <Button variant="tertiary" size="S" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight />
      </Button>
    </Flex>
  );
}

// ── Form panel (right side) ───────────────────────────────────────────────────
function FormPanel({ entity, record, domains, resources, roles, policies, strapiTypes, onSave, onClose, loading }) {
  const isEdit = !!record;
  const [form, setForm] = useState(() => record ? { ...record } : {});
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  useEffect(() => { setForm(record ? { ...record } : {}); }, [record]);

  // Derive the field list from the selected Strapi content-type
  const selectedType = strapiTypes.find((t) => t.uid === form.uid);
  const availableFields = selectedType?.attributes || [];

  // Parent resources are those with fieldScope === "all" (or no fieldScope) and same UID
  const parentCandidates = resources.filter(
    (r) => r.fieldScope !== "selected" && r.uid === form.uid && r.id !== record?.id
  );

  function toggleMethod(method) {
    const current = form.methods || HTTP_METHODS;
    const next = current.includes(method) ? current.filter((m) => m !== method) : [...current, method];
    set("methods", next);
  }

  function toggleField(field) {
    const current = form.fields || [];
    const next = current.includes(field) ? current.filter((f) => f !== field) : [...current, field];
    set("fields", next);
  }

  return (
    <Box background="neutral0" style={{
      width: 400, minWidth: 400, maxWidth: 400,
      borderLeft: "2px solid var(--strapi-neutral200)",
      padding: 24, position: "sticky", top: 16, alignSelf: "flex-start",
      maxHeight: "calc(100vh - 140px)", overflowY: "auto",
    }}>
      <Flex justifyContent="space-between" alignItems="center"
        style={{ borderBottom: "1px solid var(--strapi-neutral150)", paddingBottom: 12, marginBottom: 16 }}>
        <Typography variant="beta">{isEdit ? "Edit " : "New "}{entity.slice(0, -1)}</Typography>
        <Button variant="ghost" size="S" onClick={onClose} style={{ padding: "4px 8px" }}><Cross /></Button>
      </Flex>

      <Flex direction="column" gap={4}>
        <TextInput id="form-key" label="Key" name="key" hint="Unique machine-readable identifier"
          value={form.key || ""} onChange={(e) => set("key", e.target.value)} />

        {entity === "domains" && (
          <>
            <TextInput id="form-name" label="Name" name="name" value={form.name || ""} onChange={(e) => set("name", e.target.value)} />
            <TextInput id="form-description" label="Description" name="description" value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
          </>
        )}

        {entity === "resources" && (
          <>
            {/* UID picker from live Strapi content-types */}
            {strapiTypes.length > 0 ? (
              <SingleSelect label="Strapi Content-Type (UID)" value={form.uid || ""}
                onChange={(v) => { set("uid", v); set("fields", []); set("parentResource", null); }}>
                <SingleSelectOption value="">— select content-type —</SingleSelectOption>
                {strapiTypes.map((t) => (
                  <SingleSelectOption key={t.uid} value={t.uid}>{t.displayName} ({t.uid})</SingleSelectOption>
                ))}
              </SingleSelect>
            ) : (
              <TextInput id="form-uid" label="UID" name="uid" hint="e.g. api::product.product"
                value={form.uid || ""} onChange={(e) => set("uid", e.target.value)} />
            )}

            {/* HTTP methods */}
            <Box>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "var(--strapi-neutral800)" }}>
                HTTP Methods <span style={{ fontWeight: 400, color: "var(--strapi-neutral500)" }}>(select all that apply)</span>
              </label>
              <Flex gap={2} wrap="wrap">
                {HTTP_METHODS.map((m) => {
                  const active = (form.methods || HTTP_METHODS).includes(m);
                  return (
                    <button key={m} type="button" onClick={() => toggleMethod(m)} style={{
                      padding: "4px 14px", borderRadius: 4, cursor: "pointer", fontWeight: 700, fontSize: 12,
                      background: active ? "var(--strapi-primary600)" : "var(--strapi-neutral100)",
                      color: active ? "white" : "var(--strapi-neutral700)",
                      border: active ? "1px solid var(--strapi-primary500)" : "1px solid var(--strapi-neutral300)",
                    }}>{m.toUpperCase()}</button>
                  );
                })}
              </Flex>
            </Box>

            {/* Field scope */}
            <SingleSelect label="Field Scope" value={form.fieldScope || "all"} onChange={(v) => { set("fieldScope", v); if (v === "all") { set("fields", []); set("parentResource", null); } }}>
              <SingleSelectOption value="all">All fields</SingleSelectOption>
              <SingleSelectOption value="selected">Selected fields only</SingleSelectOption>
            </SingleSelect>

            {/* Selected fields picker */}
            {form.fieldScope === "selected" && (
              <>
                {/* Parent resource (all-fields base) */}
                {parentCandidates.length > 0 && (
                  <SingleSelect label="Parent Resource (all-fields base)" value={String(form.parentResource?.id || form.parentResource || "")}
                    onChange={(v) => set("parentResource", Number(v) || null)}>
                    <SingleSelectOption value="">— none —</SingleSelectOption>
                    {parentCandidates.map((r) => (
                      <SingleSelectOption key={r.id} value={String(r.id)}>{labelFor(r)}</SingleSelectOption>
                    ))}
                  </SingleSelect>
                )}

                {availableFields.length > 0 ? (
                  <Box>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "var(--strapi-neutral800)" }}>
                      Allowed fields <span style={{ fontWeight: 400, color: "var(--strapi-neutral500)" }}>(check each field to include)</span>
                    </label>
                    <Box background="neutral100" style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--strapi-neutral200)", borderRadius: 6, padding: 8 }}>
                      {availableFields.map((f) => {
                        const checked = (form.fields || []).includes(f);
                        return (
                          <Flex key={f} gap={2} alignItems="center" style={{ marginBottom: 4, cursor: "pointer", padding: "2px 4px", borderRadius: 4 }}
                            onClick={() => toggleField(f)}>
                            <input type="checkbox" readOnly checked={checked} style={{ cursor: "pointer", accentColor: "var(--strapi-primary600)" }} />
                            <Typography variant="pi" textColor={checked ? "primary600" : "neutral700"}>{f}</Typography>
                          </Flex>
                        );
                      })}
                    </Box>
                  </Box>
                ) : (
                  <TextInput id="form-fields-selected" label="Fields (comma-separated)" name="fields"
                    value={(form.fields || []).join(", ")}
                    onChange={(e) => set("fields", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
                )}
              </>
            )}

            <SingleSelect label="Domain" value={String(form.domain?.id || form.domain || "")} onChange={(v) => set("domain", Number(v))}>
              <SingleSelectOption value="">— select domain —</SingleSelectOption>
              {domains.map((d) => <SingleSelectOption key={d.id} value={String(d.id)}>{labelFor(d)}</SingleSelectOption>)}
            </SingleSelect>
          </>
        )}

        {entity === "roles" && (
          <>
            <SingleSelect label="Level" value={form.level || ""} onChange={(v) => set("level", v)}>
              <SingleSelectOption value="">— select level —</SingleSelectOption>
              {LEVEL_OPTIONS.map((l) => <SingleSelectOption key={l} value={l}>{l}</SingleSelectOption>)}
            </SingleSelect>
            <SingleSelect label="Domain" value={String(form.domain?.id || form.domain || "")} onChange={(v) => set("domain", Number(v))}>
              <SingleSelectOption value="">— select domain —</SingleSelectOption>
              {domains.map((d) => <SingleSelectOption key={d.id} value={String(d.id)}>{labelFor(d)}</SingleSelectOption>)}
            </SingleSelect>
          </>
        )}

        {entity === "policies" && (
          <>
            <TextInput id="form-actions" label="Actions" name="actions" hint="Comma-separated: read, create, update, delete"
              value={(form.actions || []).join(", ")}
              onChange={(e) => set("actions", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
            <TextInput id="form-policy-fields" label="Fields (optional)" name="fields" hint="Field-level scoping, comma-separated"
              value={(form.fields || []).join(", ")}
              onChange={(e) => set("fields", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
            <TextInput id="form-conditions" label="Conditions (JSON, optional)" name="conditions"
              value={form.conditions && typeof form.conditions === "object" ? JSON.stringify(form.conditions) : (form.conditions || "")}
              onChange={(e) => { try { set("conditions", JSON.parse(e.target.value)); } catch { set("conditions", e.target.value); } }} />
            <SingleSelect label="Effect" value={form.effect || ""} onChange={(v) => set("effect", v)}>
              <SingleSelectOption value="">— select effect —</SingleSelectOption>
              {EFFECT_OPTIONS.map((e) => <SingleSelectOption key={e} value={e}>{e}</SingleSelectOption>)}
            </SingleSelect>
            <SingleSelect label="Resource" value={String(form.resource?.id || form.resource || "")} onChange={(v) => set("resource", Number(v))}>
              <SingleSelectOption value="">— select resource —</SingleSelectOption>
              {resources.map((r) => <SingleSelectOption key={r.id} value={String(r.id)}>{labelFor(r)}</SingleSelectOption>)}
            </SingleSelect>
          </>
        )}

        {entity === "grants" && (
          <>
            <SingleSelect label="Role" value={String(form.role?.id || form.role || "")} onChange={(v) => set("role", Number(v))}>
              <SingleSelectOption value="">— select role —</SingleSelectOption>
              {roles.map((r) => <SingleSelectOption key={r.id} value={String(r.id)}>{labelFor(r)}</SingleSelectOption>)}
            </SingleSelect>
            <SingleSelect label="Policy" value={String(form.policy?.id || form.policy || "")} onChange={(v) => set("policy", Number(v))}>
              <SingleSelectOption value="">— select policy —</SingleSelectOption>
              {policies.map((p) => <SingleSelectOption key={p.id} value={String(p.id)}>{labelFor(p)}</SingleSelectOption>)}
            </SingleSelect>
          </>
        )}
      </Flex>

      <Flex gap={2} style={{ borderTop: "1px solid var(--strapi-neutral150)", marginTop: 20, paddingTop: 16 }}>
        <Button loading={loading} onClick={() => onSave(form)} style={{ flex: 1 }}>
          {isEdit ? "Save changes" : "Create"}
        </Button>
        <Button variant="tertiary" onClick={onClose}>Cancel</Button>
      </Flex>
    </Box>
  );
}

// ── Assignments tab ───────────────────────────────────────────────────────────
function AssignmentsTab({ users, roleOptions, selectedUserId, selectedRoleIds, onSelectUser, onChangeRoles, onSave, loading, userSearch, onUserSearch }) {
  const [roleSearch, setRoleSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("");

  const selectedUser = users.find((u) => String(u.id) === String(selectedUserId));

  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (u.username||"").toLowerCase().includes(q) ||
           (u.email||"").toLowerCase().includes(q) ||
           (u.displayName||"").toLowerCase().includes(q);
  });

  // All unique domains from roleOptions for the domain filter
  const roleDomains = [];
  const seenDomains = new Set();
  roleOptions.forEach((r) => {
    if (r.domain && !seenDomains.has(r.domain.id)) {
      seenDomains.add(r.domain.id);
      roleDomains.push(r.domain);
    }
  });

  const assignedIds = new Set(selectedRoleIds.map(String));

  const availableRoles = roleOptions.filter((r) => {
    if (assignedIds.has(String(r.id))) return false;
    if (roleSearch && !r.key.toLowerCase().includes(roleSearch.toLowerCase())) return false;
    if (domainFilter && String(r.domain?.id) !== domainFilter) return false;
    return true;
  });

  const assignedRoles = roleOptions.filter((r) => {
    if (!assignedIds.has(String(r.id))) return false;
    if (roleSearch && !r.key.toLowerCase().includes(roleSearch.toLowerCase())) return false;
    if (domainFilter && String(r.domain?.id) !== domainFilter) return false;
    return true;
  });

  const addRole = (roleId) => onChangeRoles([...selectedRoleIds, String(roleId)]);
  const removeRole = (roleId) => onChangeRoles(selectedRoleIds.filter((id) => String(id) !== String(roleId)));

  const levelColors = { staff: "#3498db", manager: "#9b59b6", admin: "#e67e22", "super-admin": "#c0392b" };

  function RoleChip({ role, action, actionLabel, actionColor }) {
    return (
      <Flex justifyContent="space-between" alignItems="center" padding={2}
        background="neutral100" style={{ border: "1px solid var(--strapi-neutral200)", borderRadius: 6, marginBottom: 4 }}>
        <Flex direction="column" gap={0} style={{ minWidth: 0 }}>
          <Typography variant="pi" textColor="neutral800" style={{ fontWeight: 600, wordBreak: "break-all" }}>
            {role.key}
          </Typography>
          <Flex gap={2} alignItems="center">
            {role.domain && (
              <Typography variant="pi" textColor="neutral500" style={{ fontSize: 11 }}>
                {labelFor(role.domain)}
              </Typography>
            )}
            {role.level && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                background: (levelColors[role.level]||"#888") + "22",
                color: levelColors[role.level]||"#888",
                border: "1px solid " + (levelColors[role.level]||"#888") + "44" }}>
                {role.level}
              </span>
            )}
          </Flex>
        </Flex>
        <Button size="S"
          style={{ flexShrink: 0, marginLeft: 8, background: actionColor, borderColor: actionColor, color: "white", minWidth: 60 }}
          onClick={() => action(role.id)}>
          {actionLabel}
        </Button>
      </Flex>
    );
  }

  return (
    <Box paddingTop={4}>

      {/* ── Section 1: User picker ── */}
      <Box padding={5} background="neutral0" style={{ border: "1px solid var(--strapi-neutral200)", borderRadius: 12, marginBottom: 20 }}>
        <Typography variant="beta" style={{ display: "block", marginBottom: 16 }}>
          Step 1 — Select a user
        </Typography>
        <Flex gap={4} wrap="wrap" alignItems="flex-start">
          {/* Search + dropdown */}
          <Box style={{ flex: "1 1 300px" }}>
            <Box style={{ marginBottom: 12 }}>
              <TextInput id="user-search" label="Search users" name="user-search" placeholder="Filter by name or email..."
                value={userSearch} onChange={(e) => onUserSearch(e.target.value)} />
            </Box>
            <Box background="neutral0" style={{ maxHeight: 280, overflowY: "auto", border: "1px solid var(--strapi-neutral200)", borderRadius: 8 }}>
              {filteredUsers.length === 0 && (
                <Box padding={4} style={{ textAlign: "center" }}>
                  <Typography variant="pi" textColor="neutral500">No users found.</Typography>
                </Box>
              )}
              {filteredUsers.map((user) => {
                const isSelected = String(user.id) === String(selectedUserId);
                const roleCount = (user.permission_roles||[]).length;
                return (
                  <Flex key={user.id} justifyContent="space-between" alignItems="center"
                    padding={3}
                    background={isSelected ? "primary100" : "neutral0"}
                    style={{
                      borderBottom: "1px solid var(--strapi-neutral150)",
                      cursor: "pointer",
                      transition: "background .1s",
                    }}
                    onClick={() => onSelectUser(String(user.id))}>
                    <Flex gap={3} alignItems="center">
                      <Box style={{
                        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                        background: isSelected ? "var(--strapi-primary600)" : "var(--strapi-neutral200)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: isSelected ? "white" : "var(--strapi-neutral600)", fontWeight: 700, fontSize: 14,
                      }}>
                        {(user.displayName || user.username || user.email || "?")[0].toUpperCase()}
                      </Box>
                      <Flex direction="column" gap={0}>
                        <Typography variant="sigma" textColor={isSelected ? "primary700" : "neutral800"}>
                          {user.displayName || user.username}
                        </Typography>
                        <Typography variant="pi" textColor="neutral500" style={{ fontSize: 11 }}>{user.email}</Typography>
                      </Flex>
                    </Flex>
                    <Box background={roleCount > 0 ? "success100" : "neutral150"} style={{
                      display: "inline-flex", alignItems: "center",
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                      color: roleCount > 0 ? "var(--strapi-success600)" : "var(--strapi-neutral500)",
                      border: "1px solid " + (roleCount > 0 ? "var(--strapi-success200)" : "var(--strapi-neutral300)"),
                    }}>
                      {roleCount} role{roleCount !== 1 ? "s" : ""}
                    </Box>
                  </Flex>
                );
              })}
            </Box>
          </Box>

          {/* Selected user card */}
          <Box style={{ flex: "1 1 260px" }}>
            {!selectedUser ? (
              <Box padding={6} background="neutral100" style={{ borderRadius: 10, textAlign: "center", border: "2px dashed var(--strapi-neutral300)" }}>
                <Typography variant="pi" textColor="neutral500">
                  Select a user from the list to manage their roles.
                </Typography>
              </Box>
            ) : (
              <Box padding={4} background="primary100" style={{ borderRadius: 10, border: "2px solid var(--strapi-primary200)" }}>
                <Flex gap={3} alignItems="center" style={{ marginBottom: 12 }}>
                  <Box style={{
                    width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                    background: "var(--strapi-primary600)", display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontWeight: 700, fontSize: 18,
                  }}>
                    {(selectedUser.displayName || selectedUser.username || selectedUser.email || "?")[0].toUpperCase()}
                  </Box>
                  <Flex direction="column" gap={0}>
                    <Typography variant="beta" textColor="primary700">
                      {selectedUser.displayName || selectedUser.username}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600">{selectedUser.email}</Typography>
                  </Flex>
                </Flex>
                <Flex gap={2} wrap="wrap">
                  <Box background="neutral0" style={{ borderRadius: 6, padding: "4px 10px", border: "1px solid var(--strapi-primary200)" }}>
                    <Typography variant="pi" textColor="neutral600">
                      <strong>{selectedRoleIds.length}</strong> role{selectedRoleIds.length !== 1 ? "s" : ""} assigned
                    </Typography>
                  </Box>
                  {selectedUser.blocked && (
                    <Box style={{ background: "var(--strapi-danger100)", borderRadius: 6, padding: "4px 10px", border: "1px solid var(--strapi-danger200)" }}>
                      <Typography variant="pi" textColor="danger600">Blocked</Typography>
                    </Box>
                  )}
                  {selectedUser.confirmed === false && (
                    <Box style={{ background: "var(--strapi-warning100)", borderRadius: 6, padding: "4px 10px", border: "1px solid var(--strapi-warning200)" }}>
                      <Typography variant="pi" textColor="warning600">Unconfirmed</Typography>
                    </Box>
                  )}
                </Flex>
              </Box>
            )}
          </Box>
        </Flex>
      </Box>

      {/* ── Section 2: Role assignment ── */}
      {selectedUser && (
        <Box padding={5} background="neutral0" style={{ border: "1px solid var(--strapi-neutral200)", borderRadius: 12, marginBottom: 20 }}>
          <Flex justifyContent="space-between" alignItems="flex-start" wrap="wrap" gap={3} style={{ marginBottom: 16 }}>
            <Typography variant="beta">
              Step 2 — Manage roles for {selectedUser.displayName || selectedUser.username}
            </Typography>
            <Button onClick={onSave} loading={loading} disabled={loading}>
              Save Assignment
            </Button>
          </Flex>

          {/* Role filters */}
          <Flex gap={3} wrap="wrap" style={{ marginBottom: 16 }}>
            <Box style={{ flex: "1 1 200px" }}>
              <TextInput id="role-search" label="Search roles" name="role-search" placeholder="Filter roles by key..."
                value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} />
            </Box>
            <Box style={{ flex: "1 1 180px" }}>
              <SingleSelect label="Filter by domain" value={domainFilter} onChange={(v) => setDomainFilter(v || "")}>
                <SingleSelectOption value="">All domains</SingleSelectOption>
                {roleDomains.map((d) => (
                  <SingleSelectOption key={d.id} value={String(d.id)}>{labelFor(d)}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
            {(roleSearch || domainFilter) && (
              <Button variant="tertiary" size="S" style={{ alignSelf: "flex-end" }}
                onClick={() => { setRoleSearch(""); setDomainFilter(""); }}>
                Clear
              </Button>
            )}
          </Flex>

          {/* Two columns */}
          <Flex gap={4} alignItems="flex-start">

            {/* Available */}
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Flex justifyContent="space-between" alignItems="center"
                background="primary100" style={{ borderRadius: "8px 8px 0 0", padding: "10px 14px", border: "1px solid var(--strapi-primary200)", borderBottom: "none" }}>
                <Typography variant="sigma" textColor="primary700">
                  Available Roles ({availableRoles.length})
                </Typography>
                {availableRoles.length > 0 && (
                  <Button size="S" variant="secondary"
                    onClick={() => onChangeRoles([...selectedRoleIds, ...availableRoles.map((r) => String(r.id))])}>
                    Add all
                  </Button>
                )}
              </Flex>
              <Box background="neutral0" style={{ border: "1px solid var(--strapi-primary200)", borderRadius: "0 0 8px 8px", padding: 12, minHeight: 200, maxHeight: 420, overflowY: "auto" }}>
                {availableRoles.length === 0 ? (
                  <Box style={{ textAlign: "center", paddingTop: 40 }}>
                    <Typography variant="pi" textColor="neutral500">
                      {roleOptions.length === selectedRoleIds.length ? "All roles assigned." : "No roles match your filter."}
                    </Typography>
                  </Box>
                ) : (
                  availableRoles.map((role) => (
                    <RoleChip key={role.id} role={role} action={addRole} actionLabel="+ Add" actionColor="#4caf50" />
                  ))
                )}
              </Box>
            </Box>

            {/* Arrow */}
            <Flex direction="column" justifyContent="center" alignItems="center" style={{ paddingTop: 60, flexShrink: 0 }}>
              <Typography variant="pi" textColor="neutral400">→</Typography>
            </Flex>

            {/* Assigned */}
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Flex justifyContent="space-between" alignItems="center"
                background="success100" style={{ borderRadius: "8px 8px 0 0", padding: "10px 14px", border: "1px solid var(--strapi-success200)", borderBottom: "none" }}>
                <Typography variant="sigma" textColor="success700">
                  Assigned Roles ({selectedRoleIds.length})
                </Typography>
                {selectedRoleIds.length > 0 && (
                  <Button size="S" variant="danger-light" onClick={() => onChangeRoles([])}>
                    Remove all
                  </Button>
                )}
              </Flex>
              <Box background="neutral0" style={{ border: "1px solid var(--strapi-success200)", borderRadius: "0 0 8px 8px", padding: 12, minHeight: 200, maxHeight: 420, overflowY: "auto" }}>
                {assignedRoles.length === 0 ? (
                  <Box style={{ textAlign: "center", paddingTop: 40 }}>
                    <Typography variant="pi" textColor="neutral500">
                      {selectedRoleIds.length === 0 ? "No roles assigned yet." : "No assigned roles match your filter."}
                    </Typography>
                  </Box>
                ) : (
                  assignedRoles.map((role) => (
                    <RoleChip key={role.id} role={role} action={removeRole} actionLabel="✕ Remove" actionColor="#e53935" />
                  ))
                )}
              </Box>
            </Box>
          </Flex>

          {/* Save footer */}
          <Flex justifyContent="flex-end" paddingTop={4} style={{ borderTop: "1px solid var(--strapi-neutral150)", marginTop: 16 }}>
            <Button onClick={onSave} loading={loading} disabled={loading}>
              Save Assignment for {selectedUser.displayName || selectedUser.username}
            </Button>
          </Flex>
        </Box>
      )}
    </Box>
  );
}

// ── Help tab ──────────────────────────────────────────────────────────────────
function HelpSection({ title, children }) {
  return (
    <Box padding={4} background="neutral0" style={{ border: "1px solid var(--strapi-neutral200)", borderRadius: 10, marginBottom: 16 }}>
      <Typography variant="beta" textColor="primary700">{title}</Typography>
      <Box paddingTop={2}>{children}</Box>
    </Box>
  );
}

function HP({ children }) {
  return <Typography variant="omega" textColor="neutral700" style={{ display: "block", marginBottom: 8 }}>{children}</Typography>;
}

function HelpTab() {
  return (
    <Box paddingTop={4}>
      <Typography variant="alpha">How to use Permission Manager Pro</Typography>
      <Box paddingTop={4}>
        <HelpSection title="Domains">
          <HP>A Domain is a logical boundary for your application area — e.g. pos, hr, inventory. Every Resource, Role, and Policy lives inside a Domain. Create Domains first.</HP>
          <HP>Fields: key (machine-readable, e.g. pos), name (human label), description.</HP>
        </HelpSection>
        <HelpSection title="Resources">
          <HP>A Resource maps to a Strapi content-type API plus the HTTP methods and fields you want to control. Each Resource belongs to a Domain.</HP>
          <HP>Field Scope — "All fields": the resource covers every field on the content-type. "Selected fields": only an explicit subset of fields is in scope. Selected-field resources must reference an all-fields parent resource; when the parent changes or is deleted, all selected-field subsets and their dependent policies/grants are purged automatically.</HP>
          <HP>HTTP Methods: tick only the verbs (GET, POST, PUT, DELETE) that this resource entry should gate. A policy attached to this resource only applies to the ticked methods.</HP>
          <HP>Fields: key, uid (Strapi content-type UID), methods, fieldScope, fields (when selected), domain, parentResource (when selected).</HP>
        </HelpSection>
        <HelpSection title="Roles">
          <HP>A Role is a named access level within a Domain — e.g. pos.staff, pos.manager. Roles are assigned to users and linked to Grants.</HP>
          <HP>Fields: key, level (staff / manager / admin / super-admin), domain.</HP>
          <HP>Use the User Assignments tab to assign roles to users.</HP>
        </HelpSection>
        <HelpSection title="Policies">
          <HP>A Policy defines what actions are allowed or denied on a Resource. Actions: read, create, update, delete, or custom verbs.</HP>
          <HP>Fields: key, actions (list), fields (optional field-level scoping), conditions (optional JSON), effect (allow / deny), resource.</HP>
          <HP>effect: allow grants access. effect: deny explicitly blocks. Deny overrides allow when both match.</HP>
        </HelpSection>
        <HelpSection title="Grants">
          <HP>A Grant links a Role to a Policy. It answers: which role gets which policy? Without a Grant a Policy has no effect on any user.</HP>
          <HP>Fields: key, role, policy.</HP>
          <HP>When a Resource is deleted or its UID changes, all Policies referencing that Resource and all Grants referencing those Policies are purged automatically. Selected-field child resources are also removed.</HP>
        </HelpSection>
        <HelpSection title="User Assignments">
          <HP>Select any user and assign one or more permission roles. The system resolves access by loading all Grants for the user's roles and evaluating each Policy.</HP>
          <HP>Legacy compatibility: the plugin also reads app_accesses / admin_app_accesses and maps them to equivalent permission roles.</HP>
        </HelpSection>
        <HelpSection title="Recommended Workflow">
          <HP>1. Create Domains — one per application module.</HP>
          <HP>2. Create Resources — one per Strapi content-type you want to control.</HP>
          <HP>3. Create Policies — define allowed/denied actions on each resource.</HP>
          <HP>4. Create Roles — staff / manager / admin levels per domain.</HP>
          <HP>5. Create Grants — link roles to policies.</HP>
          <HP>6. Go to User Assignments — assign roles to your users.</HP>
        </HelpSection>
        <HelpSection title="Configuration">
          <HP>Configure in your host app config/plugins.js:</HP>
          <Box background="neutral100" style={{ borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: 13 }}>
            {'"permission-manager-pro": { enabled: true, config: { headerDomainKey: "x-rutba-app", headerElevatedKey: "x-rutba-app-admin", enforceOwnership: true, denyByDefault: true } }'}
          </Box>
        </HelpSection>
      </Box>
    </Box>
  );
}
