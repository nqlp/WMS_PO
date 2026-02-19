'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';
import { useEmbeddedBootstrap } from '@/lib/client/hooks';
import { IMPORT_TYPES, PO_HEADER_STATUS } from '@/lib/constants';

type SortBy = "poNumber" | "createdAt" | "expectedDate" | "status" | "vendor";
type SortDirection = "asc" | "desc";

interface PurchaseOrderListRow {
  poNumber: string;
  itemCount: number;
  pieces: number;
  status: string;
  createdAt: string;
  lastModification: string | null;
  expectedDate: string | null;
  importDuties: boolean;
  importType: string;
  notes: string | null;
  vendor: string;
}

interface FiltersState {
  status: string;
  vendor: string;
  expectedDateStart: string;
  expectedDateEnd: string;
  createdAtStart: string;
  createdAtEnd: string;
  importDuties: "" | "true" | "false";
  importType: string;
  hasNotes: "" | "true" | "false";
  poNumber: string;
}

const EMPTY_FILTERS: FiltersState = {
  status: "",
  vendor: "",
  expectedDateStart: "",
  expectedDateEnd: "",
  createdAtStart: "",
  createdAtEnd: "",
  importDuties: "",
  importType: "",
  hasNotes: "",
  poNumber: ""
};

function toQueryParams(filters: FiltersState, sortBy: SortBy, sortDirection: SortDirection): string {
  const params = new URLSearchParams();

  if (filters.status) params.set("status", filters.status);
  if (filters.vendor) params.set("vendor", filters.vendor);
  if (filters.expectedDateStart) params.set("expectedDateStart", filters.expectedDateStart);
  if (filters.expectedDateEnd) params.set("expectedDateEnd", filters.expectedDateEnd);
  if (filters.createdAtStart) params.set("createdAtStart", filters.createdAtStart);
  if (filters.createdAtEnd) params.set("createdAtEnd", filters.createdAtEnd);
  if (filters.importDuties) params.set("importDuties", filters.importDuties);
  if (filters.importType) params.set("importType", filters.importType);
  if (filters.hasNotes) params.set("hasNotes", filters.hasNotes);
  if (filters.poNumber) params.set("poNumber", filters.poNumber);
  params.set("sortBy", sortBy);
  params.set("sortDirection", sortDirection);

  return params.toString();
}

function statusClass(status: string): string {
  switch (status) {
    case "OPEN":
      return "status-pill status-open";
    case "CHECKEDIN":
    case "PART_RECEIVED":
    case "RECEIVED":
      return "status-pill status-checkedin";
    case "CLOSED":
    case "ARCHIVED":
      return "status-pill status-closed";
    default:
      return "status-pill status-error";
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}


export function PurchaseOrderListPage() {
  const bootstrap = useEmbeddedBootstrap();
  const [vendors, setVendors] = useState<string[]>([]);
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [rows, setRows] = useState<PurchaseOrderListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const searchParams = useSearchParams();
  const createdPoNumberRow = searchParams.get("createdPoNumber")?.trim() ?? "";
  const createdPoNumber = /^\d+$/.test(createdPoNumberRow) ? createdPoNumberRow : "";
  const [createSuccessMessage, setCreateSuccessMessage] = useState<string | null>(null);

  async function loadRows(nextFilters = filters, nextSortBy = sortBy, nextSortDirection = sortDirection) {
    try {
      setLoading(true);
      setError(null);
      const query = toQueryParams(nextFilters, nextSortBy, nextSortDirection);
      const response = await apiFetch<{ purchaseOrders: PurchaseOrderListRow[] }>(`/api/purchase-orders?${query}`);
      setRows(response.purchaseOrders);
    } catch (error) {
      console.error("Failed to load purchase orders", error);
      setError(error instanceof Error ? error.message : "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (bootstrap.loading || bootstrap.error || initialized) {
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const [prefsResponse, vendorsResponse] = await Promise.all([
          apiFetch<{ filters: Record<string, unknown> | null; sorting: Record<string, unknown> | null }>("/api/user-prefs"),
          apiFetch<{ vendors: string[] }>("/api/shopify/vendors")
        ]);

        if (!mounted) {
          return;
        }

        setVendors(vendorsResponse.vendors);

        if (createdPoNumber) {
          const forcedFilters: FiltersState = { ...EMPTY_FILTERS, poNumber: createdPoNumber };
          const forcedSortBy: SortBy = "createdAt";
          const forcedSortDirection: SortDirection = "desc";
          setFilters(forcedFilters);
          setSortBy(forcedSortBy);
          setSortDirection(forcedSortDirection);
          setCreateSuccessMessage(`Purchase order ${createdPoNumber} created successfully`);
          const forcedQuery = toQueryParams(forcedFilters, forcedSortBy, forcedSortDirection);
          const forcedResponse = await apiFetch<{ purchaseOrders: PurchaseOrderListRow[] }>(
            `/api/purchase-orders?${forcedQuery}`
          );
          setRows(forcedResponse.purchaseOrders);
          return;

        }

        const prefFilters = prefsResponse.filters ?? {};
        const mergedFilters: FiltersState = {
          status: String(prefFilters.status ?? ""),
          vendor: String(prefFilters.vendor ?? ""),
          expectedDateStart: String(prefFilters.expectedDateStart ?? ""),
          expectedDateEnd: String(prefFilters.expectedDateEnd ?? ""),
          createdAtStart: String(prefFilters.createdAtStart ?? ""),
          createdAtEnd: String(prefFilters.createdAtEnd ?? ''),
          importDuties:
            prefFilters.importDuties == null
              ? ''
              : Boolean(prefFilters.importDuties)
                ? 'true'
                : 'false',
          importType: String(prefFilters.importType ?? ''),
          hasNotes:
            prefFilters.hasNotes == null
              ? ''
              : Boolean(prefFilters.hasNotes)
                ? 'true'
                : 'false',
          poNumber: String(prefFilters.poNumber ?? '')
        };

        const prefSorting = prefsResponse.sorting ?? {};
        const nextSortBy = (prefSorting.sortBy as SortBy) || 'createdAt';
        const nextSortDirection = (prefSorting.sortDirection as SortDirection) || 'desc';

        setCreateSuccessMessage(null);
        setFilters(mergedFilters);
        setSortBy(nextSortBy);
        setSortDirection(nextSortDirection);

        const query = toQueryParams(mergedFilters, nextSortBy, nextSortDirection);
        const response = await apiFetch<{ purchaseOrders: PurchaseOrderListRow[] }>(
          `/api/purchase-orders?${query}`
        );
        setRows(response.purchaseOrders);
      } catch (error) {
        if (mounted) {
          setError(error instanceof Error ? error.message : "Initialization failed");
        }
      } finally {
        if (mounted) {
          setInitialized(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [bootstrap.error, bootstrap.loading, initialized, createdPoNumber]);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => value !== ""),
    [filters]
  );

  async function savePreferences() {
    if (!bootstrap.csrfToken) {
      return;
    }

    await apiFetch("/api/user-prefs", {
      method: "PUT",
      csrfToken: bootstrap.csrfToken,
      body: JSON.stringify({
        filters: {
          status: filters.status || null,
          vendor: filters.vendor || null,
          poNumber: filters.poNumber || null,
          expectedDateStart: filters.expectedDateStart || null,
          expectedDateEnd: filters.expectedDateEnd || null,
          createdAtStart: filters.createdAtStart || null,
          createdAtEnd: filters.createdAtEnd || null,
          importType: filters.importType || null,
          importDuties: filters.importDuties ? filters.importDuties === 'true' : null,
          hasNotes: filters.hasNotes ? filters.hasNotes === 'true' : null
        },
        sorting: {
          sortBy,
          sortDirection
        }
      })
    });
  }

  async function runCheckIn(poNumber: string, status: string) {
    if (!bootstrap.csrfToken) {
      return;
    }

    if (status !== "OPEN") {
      setInlineErrors((prev) => ({
        ...prev,
        [poNumber]: "Check-in is only allowed for OPEN purchase orders"
      }));
      return;
    }

    try {
      await apiFetch(`/api/purchase-orders/${poNumber}/check-in`, {
        method: "POST",
        csrfToken: bootstrap.csrfToken
      });
      setInlineErrors((prev) => ({ ...prev, [poNumber]: "" }));
      await loadRows();
    } catch (error) {
      console.error("Check-in failed for PO", poNumber, error);
      setInlineErrors((prev) => ({
        ...prev,
        [poNumber]: error instanceof Error ? error.message : "Check-in failed"
      }));
    }
  }

  if (bootstrap.loading || !initialized) {
    return <div className="panel">Loading purchase order list...</div>;
  }

  if (bootstrap.error) {
    return <div className="panel error-text">{bootstrap.error}</div>;
  }

  const statusOptions = PO_HEADER_STATUS.map((status) => (
    <s-option key={status} value={status}>
      {status}
    </s-option>
  ));

  const vendorOptions = vendors.map((vendor) => (
    <s-option key={vendor} value={vendor}>
      {vendor}
    </s-option>
  ));

  const importDutiesOptions: Array<{ value: FiltersState["importDuties"]; label: string }> = [
    { value: "", label: "All" },
    { value: "true", label: "Yes" },
    { value: "false", label: "No" }
  ];

  const importTypeOptions = IMPORT_TYPES.map((importType) => (
    <s-option key={importType} value={importType}>
      {importType}
    </s-option>
  ));

  const sortByOptions: { value: SortBy; label: string }[] = [
    { value: "poNumber", label: "PO Number" },
    { value: "createdAt", label: "Creation date" },
    { value: "expectedDate", label: "Expected date" },
    { value: "status", label: "Status" },
    { value: "vendor", label: "Vendor" }
  ];

  const sortDirectionOptions: { value: SortDirection; label: string }[] = [
    { value: "asc", label: "Ascending" },
    { value: "desc", label: "Descending" }
  ];

  return (
    <s-page heading="Purchase Order List" inlineSize="large">
      <s-section>
        <s-section-header>
          <s-heading>Purchase Order List</s-heading>
          {createSuccessMessage ? <s-banner tone="success">{createSuccessMessage}</s-banner> : null}
          {error ? <s-banner tone="critical" error={error} /> : null}
          <s-query-container>
            <s-grid gap="base" gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))">
              <s-grid-item>
                <s-select
                  label="Status"
                  value={filters.status}
                  onChange={(event: Event) => setFilters((prev) => ({ ...prev, status: (event.target as HTMLSelectElement).value }))}
                >
                  <s-option value="">All</s-option>
                  {statusOptions}
                </s-select>
              </s-grid-item>

              <s-grid-item>
                <s-select
                  label="Vendor"
                  value={filters.vendor}
                  onChange={(event: Event) => setFilters((prev) => ({ ...prev, vendor: (event.target as HTMLSelectElement).value }))}
                >
                  <s-option value="">All</s-option>
                  {vendorOptions}
                </s-select>
              </s-grid-item>

              <s-grid-item>
                <s-select
                  label="Import Duties"
                  value={filters.importDuties}
                  onChange={(event: Event) =>
                    setFilters((prev) => ({
                      ...prev,
                      importDuties: (event.target as HTMLSelectElement).value as FiltersState["importDuties"]
                    }))
                  }
                >
                  {importDutiesOptions.map((option) => (
                    <s-option key={option.label} value={option.value}>
                      {option.label}
                    </s-option>
                  ))}
                </s-select>
              </s-grid-item>
              <s-grid-item>
                <s-select
                  label="Import Type"
                  value={filters.importType}
                  onChange={(event: Event) =>
                    setFilters((prev) => ({ ...prev, importType: (event.target as HTMLSelectElement).value }))
                  }
                >
                  <s-option value="">All</s-option>
                  {importTypeOptions}
                </s-select>
              </s-grid-item>

              <s-grid-item>
                <s-text-field
                  label="Expected Date Start"
                  className="field"
                  type="date"
                  value={filters.expectedDateStart}
                  onChange={(event: Event) => setFilters((prev) => ({ ...prev, expectedDateStart: (event.target as HTMLInputElement).value }))}
                >
                  <s-clickable slot="accessory" commandFor="expected-date-start-popover">
                    <s-icon type="calendar" />
                  </s-clickable>
                </s-text-field>
                <s-popover id="expected-date-start-popover" inlineSize="320px">
                  <s-box padding="base">
                    <s-date-picker
                      type="single"
                      name="expected-date-start-picker"
                      value={filters.expectedDateStart}
                      onChange={(event: Event) =>
                        setFilters((prev) => ({
                          ...prev,
                          expectedDateStart: (event.currentTarget as HTMLElement & { value: string }).value
                        }))
                      }
                    />
                  </s-box>
                </s-popover>
              </s-grid-item>

              <s-grid-item>
                <s-text-field
                  label="Expected Date End"
                  className="field"
                  type="date"
                  value={filters.expectedDateEnd}
                  onChange={(event: Event) => setFilters((prev) => ({ ...prev, expectedDateEnd: (event.target as HTMLInputElement).value }))}
                >
                  <s-clickable slot="accessory" commandFor="expected-date-end-popover">
                    <s-icon type="calendar" />
                  </s-clickable>
                </s-text-field>
                <s-popover id="expected-date-end-popover" inlineSize="320px">
                  <s-box padding="base">
                    <s-date-picker
                      type="single"
                      name="expected-date-end-picker"
                      value={filters.expectedDateEnd}
                      onChange={(event: Event) =>
                        setFilters((prev) => ({
                          ...prev,
                          expectedDateEnd: (event.currentTarget as HTMLElement & { value: string }).value
                        }))
                      }
                    />
                  </s-box>
                </s-popover>
              </s-grid-item>

              <s-grid-item>
                <s-text-field
                  label="Created At Start"
                  className="field"
                  type="date"
                  value={filters.createdAtStart}
                  onChange={(event: Event) =>
                    setFilters((prev) => ({ ...prev, createdAtStart: (event.target as HTMLInputElement).value }))
                  }
                >
                  <s-clickable slot="accessory" commandFor="created-at-start-popover">
                    <s-icon type="calendar" />
                  </s-clickable>
                </s-text-field>
                <s-popover id="created-at-start-popover" inlineSize="320px">
                  <s-box padding="base">
                    <s-date-picker
                      type="single"
                      name="created-at-start-picker"
                      value={filters.createdAtStart}
                      onChange={(event: Event) =>
                        setFilters((prev) => ({
                          ...prev,
                          createdAtStart: (event.currentTarget as HTMLElement & { value: string }).value
                        }))
                      }
                    />
                  </s-box>
                </s-popover>
              </s-grid-item>

              <s-grid-item>
                <s-text-field
                  label="Created At End"
                  className="field"
                  type="date"
                  value={filters.createdAtEnd}
                  onChange={(event: Event) => setFilters((prev) => ({ ...prev, createdAtEnd: (event.target as HTMLInputElement).value }))}
                >
                  <s-clickable slot="accessory" commandFor="created-at-end-popover">
                    <s-icon type="calendar" />
                  </s-clickable>
                </s-text-field>
                <s-popover id="created-at-end-popover" inlineSize="320px">
                  <s-box padding="base">
                    <s-date-picker
                      type="single"
                      name="created-at-end-picker"
                      value={filters.createdAtEnd}
                      onChange={(event: Event) =>
                        setFilters((prev) => ({
                          ...prev,
                          createdAtEnd: (event.currentTarget as HTMLElement & { value: string }).value
                        }))
                      }
                    />
                  </s-box>
                </s-popover>
              </s-grid-item>

              <s-grid-item>
                <s-select
                  label="Has Notes"
                  value={filters.hasNotes}
                  onChange={(event: Event) =>
                    setFilters((prev) => ({
                      ...prev,
                      hasNotes: (event.target as HTMLSelectElement).value as "" | "true" | "false"
                    }))
                  }
                >
                  <s-option value="">All</s-option>
                  <s-option value="true">Yes</s-option>
                  <s-option value="false">No</s-option>
                </s-select>
              </s-grid-item>

              <s-grid-item>
                <s-text-field
                  label="PO Number"
                  className="field"
                  value={filters.poNumber}
                  onChange={(event: Event) => setFilters((prev) => ({ ...prev, poNumber: (event.target as HTMLInputElement).value }))}
                />
              </s-grid-item>

              <s-grid-item>
                <s-select
                  label="Sort By"
                  value={sortBy}
                  onChange={(event: Event) => setSortBy((event.target as HTMLSelectElement).value as SortBy)}
                >
                  {sortByOptions.map((option) => (
                    <s-option key={option.value} value={option.value}>
                      {option.label}
                    </s-option>
                  ))}
                </s-select>
              </s-grid-item>

              <s-grid-item>
                <s-select
                  label="Sort Direction"
                  value={sortDirection}
                  onChange={(event: Event) =>
                    setSortDirection((event.target as HTMLSelectElement).value as SortDirection)
                  }
                >
                  {sortDirectionOptions.map((option) => (
                    <s-option key={option.value} value={option.value}>
                      {option.label}
                    </s-option>
                  ))}
                </s-select>
              </s-grid-item>
            </s-grid>
          </s-query-container>

          <div style={{ marginTop: "1rem" }}>
            <s-stack direction="inline" gap="small" style={{ flexWrap: "wrap" }}>
              <s-button
                variant="primary"
                onClick={() => loadRows()}
                disabled={loading}>
                {loading ? "Applying filters..." : "Apply filters"}
              </s-button>

              <s-button
                variant="secondary"
                type="reset"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setSortBy("createdAt");
                  setSortDirection("desc");
                  loadRows(EMPTY_FILTERS, "createdAt", "desc");
                }}
                disabled={!hasActiveFilters && sortBy === "createdAt" && sortDirection === "desc"}
              >
                Reset
              </s-button>
              <s-button variant="secondary" onClick={() => void savePreferences()}>
                Save as default
              </s-button>
            </s-stack>
          </div>
        </s-section-header>
      </s-section>

      <s-section>
        <s-table>
          <s-table-header-row>
            <s-table-header> PO Number </s-table-header>
            <s-table-header> Item# </s-table-header>
            <s-table-header> Pieces </s-table-header>
            <s-table-header> Status </s-table-header>
            <s-table-header> Creation date </s-table-header>
            <s-table-header> Last modification date </s-table-header>
            <s-table-header> Expected date </s-table-header>
            <s-table-header> Import duties </s-table-header>
            <s-table-header> Import Type </s-table-header>
            <s-table-header> Notes </s-table-header>
            <s-table-header> Actions </s-table-header>
          </s-table-header-row>
          <s-table-body>
            {rows.map((row) => (
              <s-table-row key={row.poNumber}>
                <s-table-cell>{row.poNumber}</s-table-cell>
                <s-table-cell>{row.itemCount}</s-table-cell>
                <s-table-cell>{row.pieces}</s-table-cell>
                <s-table-cell>
                  <span className={statusClass(row.status)}>{row.status}</span>
                </s-table-cell>
                <s-table-cell>{formatDate(row.createdAt)}</s-table-cell>
                <s-table-cell>{formatDate(row.lastModification)}</s-table-cell>
                <s-table-cell>{formatDate(row.expectedDate)}</s-table-cell>
                <s-table-cell>{row.importDuties ? "Yes" : "No"}</s-table-cell>
                <s-table-cell>{row.importType}</s-table-cell>
                <s-table-cell>{row.notes ? "X" : ""}</s-table-cell>
                <s-table-cell>
                  <s-stack direction="inline" gap="small">
                    <s-button
                      variant="secondary"
                      onClick={() => {
                        void runCheckIn(row.poNumber, row.status);
                      }}
                    >
                      Check-in
                    </s-button>
                  </s-stack>
                  {inlineErrors[row.poNumber] ? (
                    <div className="error-text">{inlineErrors[row.poNumber]}</div>
                  ) : null}
                </s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
      </s-section>
    </s-page>
  );
}
