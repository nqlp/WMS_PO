'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '@/lib/client/api';
import { useEmbeddedBootstrap } from '@/lib/client/hooks';
import { IMPORT_TYPES, PO_HEADER_STATUS } from '@/lib/constants';

type SortBy = 'poNumber' | 'createdAt' | 'expectedDate' | 'status' | 'vendor';
type SortDirection = 'asc' | 'desc';

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
  importDuties: '' | 'true' | 'false';
  importType: string;
  hasNotes: '' | 'true' | 'false';
  poNumber: string;
}

const EMPTY_FILTERS: FiltersState = {
  status: '',
  vendor: '',
  expectedDateStart: '',
  expectedDateEnd: '',
  createdAtStart: '',
  createdAtEnd: '',
  importDuties: '',
  importType: '',
  hasNotes: '',
  poNumber: ''
};

function toQueryParams(filters: FiltersState, sortBy: SortBy, sortDirection: SortDirection): string {
  const params = new URLSearchParams();

  if (filters.status) params.set('status', filters.status);
  if (filters.vendor) params.set('vendor', filters.vendor);
  if (filters.expectedDateStart) params.set('expectedDateStart', filters.expectedDateStart);
  if (filters.expectedDateEnd) params.set('expectedDateEnd', filters.expectedDateEnd);
  if (filters.createdAtStart) params.set('createdAtStart', filters.createdAtStart);
  if (filters.createdAtEnd) params.set('createdAtEnd', filters.createdAtEnd);
  if (filters.importDuties) params.set('importDuties', filters.importDuties);
  if (filters.importType) params.set('importType', filters.importType);
  if (filters.hasNotes) params.set('hasNotes', filters.hasNotes);
  if (filters.poNumber) params.set('poNumber', filters.poNumber);
  params.set('sortBy', sortBy);
  params.set('sortDirection', sortDirection);

  return params.toString();
}

function statusClass(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'status-pill status-open';
    case 'CHECKEDIN':
    case 'PART_RECEIVED':
    case 'RECEIVED':
      return 'status-pill status-checkedin';
    case 'CLOSED':
    case 'ARCHIVED':
      return 'status-pill status-closed';
    default:
      return 'status-pill status-error';
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return '';
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
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [rows, setRows] = useState<PurchaseOrderListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  async function loadRows(nextFilters = filters, nextSortBy = sortBy, nextSortDirection = sortDirection) {
    try {
      setLoading(true);
      setError(null);
      const query = toQueryParams(nextFilters, nextSortBy, nextSortDirection);
      const response = await apiFetch<{ purchaseOrders: PurchaseOrderListRow[] }>(`/api/purchase-orders?${query}`);
      setRows(response.purchaseOrders);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load purchase orders');
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
          apiFetch<{ filters: Record<string, unknown> | null; sorting: Record<string, unknown> | null }>('/api/user-prefs'),
          apiFetch<{ vendors: string[] }>('/api/shopify/vendors')
        ]);

        if (!mounted) {
          return;
        }

        setVendors(vendorsResponse.vendors);

        const prefFilters = prefsResponse.filters ?? {};
        const mergedFilters: FiltersState = {
          status: String(prefFilters.status ?? ''),
          vendor: String(prefFilters.vendor ?? ''),
          expectedDateStart: String(prefFilters.expectedDateStart ?? ''),
          expectedDateEnd: String(prefFilters.expectedDateEnd ?? ''),
          createdAtStart: String(prefFilters.createdAtStart ?? ''),
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

        setFilters(mergedFilters);
        setSortBy(nextSortBy);
        setSortDirection(nextSortDirection);

        const query = toQueryParams(mergedFilters, nextSortBy, nextSortDirection);
        const response = await apiFetch<{ purchaseOrders: PurchaseOrderListRow[] }>(
          `/api/purchase-orders?${query}`
        );
        setRows(response.purchaseOrders);
      } catch (cause) {
        if (mounted) {
          setError(cause instanceof Error ? cause.message : 'Initialization failed');
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
  }, [bootstrap.error, bootstrap.loading, initialized]);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => value !== ''),
    [filters]
  );

  async function savePreferences() {
    if (!bootstrap.csrfToken) {
      return;
    }

    await apiFetch('/api/user-prefs', {
      method: 'PUT',
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

    if (status !== 'OPEN') {
      setInlineErrors((prev) => ({
        ...prev,
        [poNumber]: 'Check-in is only allowed for OPEN purchase orders'
      }));
      return;
    }

    try {
      await apiFetch(`/api/purchase-orders/${poNumber}/check-in`, {
        method: 'POST',
        csrfToken: bootstrap.csrfToken
      });
      setInlineErrors((prev) => ({ ...prev, [poNumber]: '' }));
      await loadRows();
    } catch (cause) {
      setInlineErrors((prev) => ({
        ...prev,
        [poNumber]: cause instanceof Error ? cause.message : 'Check-in failed'
      }));
    }
  }

  if (bootstrap.loading || !initialized) {
    return <div className="panel">Loading purchase order list...</div>;
  }

  if (bootstrap.error) {
    return <div className="panel error-text">{bootstrap.error}</div>;
  }

  return (
    <div className="page-shell layout-col">
      <s-page>
        <s-section>
          <div className="panel layout-col">
            <h1>Purchase Order List</h1>
            {error ? <div className="error-text">{error}</div> : null}

            <div className="layout-row">
              <div className="col-3">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="">All</option>
                  {PO_HEADER_STATUS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-3">
                <label>Vendor</label>
                <select
                  value={filters.vendor}
                  onChange={(event) => setFilters((prev) => ({ ...prev, vendor: event.target.value }))}
                >
                  <option value="">All</option>
                  {vendors.map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-3">
                <label>Import Duties</label>
                <select
                  value={filters.importDuties}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, importDuties: event.target.value as '' | 'true' | 'false' }))
                  }
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div className="col-3">
                <label>Import Type</label>
                <select
                  value={filters.importType}
                  onChange={(event) => setFilters((prev) => ({ ...prev, importType: event.target.value }))}
                >
                  <option value="">All</option>
                  {IMPORT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-3">
                <label>Expected Date Start</label>
                <input
                  className="field"
                  type="date"
                  value={filters.expectedDateStart}
                  onChange={(event) => setFilters((prev) => ({ ...prev, expectedDateStart: event.target.value }))}
                />
              </div>

              <div className="col-3">
                <label>Expected Date End</label>
                <input
                  className="field"
                  type="date"
                  value={filters.expectedDateEnd}
                  onChange={(event) => setFilters((prev) => ({ ...prev, expectedDateEnd: event.target.value }))}
                />
              </div>

              <div className="col-3">
                <label>Created At Start</label>
                <input
                  className="field"
                  type="date"
                  value={filters.createdAtStart}
                  onChange={(event) => setFilters((prev) => ({ ...prev, createdAtStart: event.target.value }))}
                />
              </div>

              <div className="col-3">
                <label>Created At End</label>
                <input
                  className="field"
                  type="date"
                  value={filters.createdAtEnd}
                  onChange={(event) => setFilters((prev) => ({ ...prev, createdAtEnd: event.target.value }))}
                />
              </div>

              <div className="col-3">
                <label>Has Notes</label>
                <select
                  value={filters.hasNotes}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, hasNotes: event.target.value as '' | 'true' | 'false' }))
                  }
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div className="col-3">
                <label>PO Number</label>
                <input
                  className="field"
                  value={filters.poNumber}
                  onChange={(event) => setFilters((prev) => ({ ...prev, poNumber: event.target.value }))}
                />
              </div>

              <div className="col-3">
                <label>Sort By</label>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)}>
                  <option value="poNumber">PO Number</option>
                  <option value="createdAt">Creation date</option>
                  <option value="expectedDate">Expected date</option>
                  <option value="status">Status</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>

              <div className="col-3">
                <label>Sort Direction</label>
                <select
                  value={sortDirection}
                  onChange={(event) => setSortDirection(event.target.value as SortDirection)}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>

            <div className="action-row">
              <button className="btn-primary" type="button" onClick={() => void loadRows()} disabled={loading}>
                {loading ? 'Applying...' : 'Apply filters'}
              </button>
              <button
                className="btn-neutral"
                type="button"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setSortBy('createdAt');
                  setSortDirection('desc');
                  void loadRows(EMPTY_FILTERS, 'createdAt', 'desc');
                }}
                disabled={!hasActiveFilters && sortBy === 'createdAt' && sortDirection === 'desc'}
              >
                Reset
              </button>
              <button className="btn-neutral" type="button" onClick={() => void savePreferences()}>
                Save as default
              </button>
              <Link href="/purchase-orders/new" className="btn-neutral">
                New Purchase Order
              </Link>
            </div>
          </div>
        </s-section>

        <s-section>
          <div className="panel">
            <div className="table-scroll">
              <s-table>
                <table>
                  <thead>
                    <tr>
                      <th>PO Number</th>
                      <th>Item#</th>
                      <th>Pieces</th>
                      <th>Status</th>
                      <th>Creation date</th>
                      <th>Last modification date</th>
                      <th>Expected date</th>
                      <th>Import duties</th>
                      <th>Import Type</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.poNumber}>
                        <td>{row.poNumber}</td>
                        <td>{row.itemCount}</td>
                        <td>{row.pieces}</td>
                        <td>
                          <span className={statusClass(row.status)}>{row.status}</span>
                        </td>
                        <td>{formatDate(row.createdAt)}</td>
                        <td>{formatDate(row.lastModification)}</td>
                        <td>{formatDate(row.expectedDate)}</td>
                        <td>{row.importDuties ? 'Yes' : 'No'}</td>
                        <td>{row.importType}</td>
                        <td>{row.notes ? 'X' : ''}</td>
                        <td>
                          <div className="action-row">
                            <button
                              className="btn-neutral"
                              type="button"
                              onClick={() => {
                                void runCheckIn(row.poNumber, row.status);
                              }}
                            >
                              Check-in
                            </button>
                            <Link href={`/purchase-orders/${row.poNumber}/edit`} className="btn-neutral">
                              Modify
                            </Link>
                          </div>
                          {inlineErrors[row.poNumber] ? (
                            <div className="error-text">{inlineErrors[row.poNumber]}</div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </s-table>
            </div>
          </div>
        </s-section>
      </s-page>
    </div>
  );
}
