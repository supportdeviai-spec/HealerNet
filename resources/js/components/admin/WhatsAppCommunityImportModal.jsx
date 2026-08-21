import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, History, Trash2, Upload } from 'lucide-react';
import { locationApi } from '../../services/locationApi';
import { usePermissions } from '../../hooks/usePermissions';
import {
  BRAND,
  Button,
  FONT_DISPLAY,
  Modal,
  Pagination,
} from './AdminShared';

export const WHATSAPP_IMPORT_PERMISSIONS = [
  'countries.create',
  'states.create',
  'cities.create',
  'whatsapp-groups.create',
  'whatsapp-groups.edit',
  'community-groups.edit',
];

const MAX_IMPORT_BYTES = 200 * 1024 * 1024;
const POLL_MS = 3000;
const TERMINAL_STATUSES = ['ready', 'completed', 'completed_with_errors', 'failed'];

function ImportProgress({ t, title, subtitle, processed, total, success, failed, status, percent }) {
  const width = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className="rounded-xl border px-4 py-4 space-y-3" style={{ borderColor: t.border, background: t.surfaceAlt }}>
      <div className="font-semibold" style={{ color: t.text, fontFamily: FONT_DISPLAY }}>{title}</div>
      {subtitle && <div className="text-sm" style={{ color: t.textMuted }}>{subtitle}</div>}
      <div className="h-3 rounded-full overflow-hidden" style={{ background: t.border }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, background: BRAND.primary }} />
      </div>
      <div className="text-sm" style={{ color: t.text }}>
        Processed: {(processed ?? 0).toLocaleString()} / {(total ?? 0).toLocaleString()}
      </div>
      <div className="text-sm" style={{ color: t.textMuted }}>
        Successful: {(success ?? 0).toLocaleString()} · Failed: {(failed ?? 0).toLocaleString()}
      </div>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: t.textFaint }}>
        Status: {status || 'Processing'}
      </div>
    </div>
  );
}

function Stat({ t, label, value, tone }) {
  const color = tone === 'danger'
    ? BRAND.danger
    : tone === 'ok'
      ? BRAND.ok
      : t.text;
  return (
    <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: t.border, background: t.surfaceAlt }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: t.textFaint }}>{label}</div>
      <div className="text-lg font-semibold mt-0.5" style={{ color, fontFamily: FONT_DISPLAY }}>{value}</div>
    </div>
  );
}

function IssueList({ t, issues }) {
  if (!issues?.length) return null;
  return (
    <div className="mt-4 max-h-56 overflow-y-auto rounded-xl border" style={{ borderColor: t.border }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ background: t.surfaceAlt, color: t.textMuted }}>
            <th className="px-3 py-2 font-semibold">Row</th>
            <th className="px-3 py-2 font-semibold">Location</th>
            <th className="px-3 py-2 font-semibold">Group</th>
            <th className="px-3 py-2 font-semibold">Reason</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, index) => (
            <tr key={`${issue.excel_row}-${index}`} className="border-t" style={{ borderColor: t.border }}>
              <td className="px-3 py-2 align-top" style={{ color: t.text }}>{issue.excel_row}</td>
              <td className="px-3 py-2 align-top" style={{ color: t.textMuted }}>
                {[issue.country, issue.state, issue.district].filter(Boolean).join(' / ') || '—'}
              </td>
              <td className="px-3 py-2 align-top" style={{ color: t.textMuted }}>{issue.group_name || '—'}</td>
              <td className="px-3 py-2 align-top">
                <span style={{ color: issue.type === 'conflict' ? BRAND.amber : issue.type === 'duplicate' ? t.textMuted : BRAND.danger }}>
                  {issue.type === 'conflict' ? 'Conflict: ' : issue.type === 'duplicate' ? 'Skipped: ' : 'Error: '}
                  {issue.reason}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WhatsAppCommunityImportModal({ t, toast, open, onClose, onImported, onViewHistory }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [previewToken, setPreviewToken] = useState(null);
  const [previewProgress, setPreviewProgress] = useState(null);
  const [activeImport, setActiveImport] = useState(null);

  const busy = loading || confirming || ['queued', 'processing'].includes(activeImport?.status);

  const loadHistory = async () => {
    try {
      const json = await locationApi.adminListWhatsAppCommunityImports({ limit: 5 });
      setHistory(Array.isArray(json.data) ? json.data.slice(0, 5) : []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    if (open) loadHistory();
  }, [open]);

  const applyPreviewPayload = (data) => {
    const payload = data || {};
    if (payload.status === 'failed') {
      setPreview(null);
      setPreviewToken(null);
      setPreviewProgress(null);
      setError(payload.error_message || 'Unable to preview this file.');
      setLoading(false);
      return 'failed';
    }
    if (payload.summary && (payload.status === 'ready' || !payload.status || payload.status === 'completed')) {
      setPreview(payload);
      setPreviewToken(null);
      setPreviewProgress(null);
      setLoading(false);
      return 'ready';
    }
    setPreviewProgress(payload);
    setLoading(true);
    return payload.status || 'queued';
  };

  const applyImportPayload = (data, message) => {
    const payload = data || {};
    if (['queued', 'processing'].includes(payload.status)) {
      setActiveImport(payload);
      setPreview(null);
      setResult(null);
      setConfirming(false);
      return payload.status;
    }
    setActiveImport(null);
    setPreview(null);
    setResult({
      ...payload,
      summary: payload.summary,
      issues: payload.issues || [],
    });
    setConfirming(false);
    if (payload.status === 'failed') {
      setError(payload.error_message || 'Import failed.');
    } else {
      toast?.(message || (payload.status === 'completed_with_errors' ? 'Import completed with errors.' : 'Import completed successfully.'), payload.status === 'completed_with_errors' ? 'error' : 'success');
      onImported?.();
      loadHistory();
    }
    return payload.status;
  };

  useEffect(() => {
    if (!open || !previewToken) return undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        const json = await locationApi.adminPreviewWhatsAppCommunityImportStatus(previewToken);
        if (cancelled) return;
        const status = applyPreviewPayload(json.data || json);
        if (TERMINAL_STATUSES.includes(status) || status === 'ready' || status === 'failed') {
          setPreviewToken(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Unable to preview this file.');
          setLoading(false);
          setPreviewToken(null);
        }
      }
    };
    const id = setInterval(tick, POLL_MS);
    tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open, previewToken]);

  useEffect(() => {
    if (!open || !activeImport?.history_id) return undefined;
    if (TERMINAL_STATUSES.includes(activeImport.status) && activeImport.status !== 'queued' && activeImport.status !== 'processing') {
      return undefined;
    }
    if (!['queued', 'processing'].includes(activeImport.status)) return undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        const json = await locationApi.adminWhatsAppCommunityImportStatus(activeImport.history_id);
        if (cancelled) return;
        const status = applyImportPayload(json.data || json);
        if (['completed', 'completed_with_errors', 'failed'].includes(status)) {
          /* polling stops because activeImport.status updates */
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load import status.');
      }
    };
    const id = setInterval(tick, POLL_MS);
    tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open, activeImport?.history_id, activeImport?.status]);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setConfirming(false);
    setPreviewToken(null);
    setPreviewProgress(null);
    setActiveImport(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose?.();
  };

  const summary = preview?.summary || result?.summary || activeImport?.summary;
  const issues = preview?.issues || result?.issues || activeImport?.issues || [];
  const actionableRows = Math.max(
    0,
    (summary?.total_rows ?? 0) - (summary?.errors ?? 0) - (summary?.conflicts ?? 0) - (summary?.skipped_duplicates ?? 0)
  );

  const runPreview = async (nextFile) => {
    if (!nextFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveImport(null);
    setPreviewProgress(null);
    try {
      const json = await locationApi.adminPreviewWhatsAppCommunityImport(nextFile);
      const data = json.data || json;
      const status = applyPreviewPayload(data);
      if (status === 'queued' || status === 'processing') {
        setPreviewToken(data.import_token);
      }
    } catch (err) {
      setPreview(null);
      setError(err?.message || 'Unable to preview this file.');
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!preview?.import_token || confirming || busy) return;
    setConfirming(true);
    setError(null);
    try {
      const json = await locationApi.adminConfirmWhatsAppCommunityImport(preview.import_token);
      const data = json.data || json;
      const status = applyImportPayload(data, json.message);
      if (status === 'queued' || status === 'processing') {
        toast?.(json.message || 'Import queued successfully.', 'success');
      }
    } catch (err) {
      setError(err?.message || 'Import failed.');
      setConfirming(false);
    }
  };

  const processing = ['queued', 'processing'].includes(activeImport?.status);
  const title = result
    ? (result.status === 'completed_with_errors' ? 'Import completed with errors' : result.status === 'failed' ? 'Import failed' : 'Import completed successfully')
    : processing
      ? 'Importing…'
      : preview
        ? 'Import preview'
        : 'Import Excel';

  return (
    <Modal
      t={t}
      open={open}
      onClose={close}
      title={title}
      width={720}
      loading={loading}
      loadingText={previewProgress
        ? `Reading file… ${previewProgress.processed_rows || 0}${previewProgress.total_rows ? ` / ${previewProgress.total_rows}` : ''} rows`
        : 'Reading file…'}
      footer={
        result ? (
          <Button onClick={close}>Done</Button>
        ) : processing ? (
          <Button variant="outline" disabled style={{ color: t.text, borderColor: t.border }}>Importing…</Button>
        ) : preview ? (
          <>
            <Button variant="outline" onClick={reset} disabled={confirming} style={{ color: t.text, borderColor: t.border }}>
              Cancel Import
            </Button>
            <Button onClick={confirmImport} disabled={confirming || actionableRows <= 0}>
              Confirm Import
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={close} style={{ color: t.text, borderColor: t.border }}>Close</Button>
        )
      }
    >
      {!preview && !result && !processing && (
        <>
          <p className="text-sm mb-3" style={{ color: t.textMuted }}>
            Upload one Excel file with columns: Country, State, District, WhatsApp Group Name, WhatsApp Group Link, Status, Description.
            Description and Status are optional. Existing values are never overwritten by blank cells.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            onChange={(e) => {
              const next = e.target.files?.[0];
              if (!next) return;
              if (next.size > MAX_IMPORT_BYTES) {
                setFile(null);
                setPreview(null);
                setError('The import file may not be larger than 200 MB.');
                e.target.value = '';
                return;
              }
              setFile(next);
              runPreview(next);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="w-full rounded-xl border border-dashed px-4 py-8 text-center"
            style={{ borderColor: t.border, background: t.surfaceAlt, color: t.text }}
          >
            <Upload size={22} className="mx-auto mb-2" style={{ color: BRAND.primary }} />
            <div className="text-sm font-semibold">{loading ? 'Reading file…' : file ? file.name : 'Choose Excel or CSV file'}</div>
            <div className="text-xs mt-1" style={{ color: t.textMuted }}>.xlsx, .xls, or .csv · max 200 MB</div>
          </button>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Download}
              onClick={async () => {
                try {
                  await locationApi.adminDownloadWhatsAppImportTemplate();
                } catch (err) {
                  toast?.(err?.message || 'Could not download template', 'error');
                }
              }}
              style={{ color: t.text, borderColor: t.border }}
            >
              Download template
            </Button>
          </div>
          {history.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: t.textFaint }}>Last 5 imports</div>
                <button
                  type="button"
                  className="text-xs font-semibold hover:underline"
                  style={{ color: BRAND.primary }}
                  onClick={() => {
                    onClose?.();
                    onViewHistory?.();
                  }}
                >
                  View all history
                </button>
              </div>
              <div className="rounded-xl border" style={{ borderColor: t.border }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left" style={{ background: t.surfaceAlt, color: t.textMuted }}>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Admin</th>
                      <th className="px-3 py-2 font-semibold">File</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Rows</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row.id} className="border-t" style={{ borderColor: t.border }}>
                        <td className="px-3 py-2" style={{ color: t.textMuted }}>{row.imported_at ? new Date(row.imported_at).toLocaleString() : '—'}</td>
                        <td className="px-3 py-2" style={{ color: t.text }}>{row.admin || '—'}</td>
                        <td className="px-3 py-2 truncate max-w-[140px]" style={{ color: t.textMuted }} title={row.file_name}>{row.file_name}</td>
                        <td className="px-3 py-2" style={{ color: row.status === 'failed' ? BRAND.danger : row.status === 'completed_with_errors' || row.status === 'processing' || row.status === 'queued' ? BRAND.amber : BRAND.ok }}>{row.status}</td>
                        <td className="px-3 py-2" style={{ color: t.textMuted }}>
                          {row.total_rows} rows · {row.created} created · {row.updated} updated · {row.skipped} skipped · {row.errors} errors · {row.conflicts} conflicts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] mt-2" style={{ color: t.textFaint }}>
                History delete is on the Import History page. Deleting history does not delete imported locations or WhatsApp groups.
              </p>
            </div>
          )}
        </>
      )}

      {processing && activeImport && (
        <ImportProgress
          t={t}
          title="Import queued successfully."
          subtitle="The file is processing in the background. You can leave this window open to watch progress."
          processed={activeImport.processed_rows}
          total={activeImport.total_rows}
          success={activeImport.success_rows}
          failed={activeImport.failed_rows}
          status={activeImport.status}
          percent={activeImport.progress}
        />
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm" style={{ color: BRAND.danger }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {summary && !processing && (
        <div className="space-y-3">
          {result && (
            <div className="rounded-xl border px-4 py-4 flex items-start gap-3" style={{ borderColor: result.status === 'failed' ? BRAND.danger : result.status === 'completed_with_errors' ? BRAND.amber : BRAND.ok, background: t.surfaceAlt }}>
              {result.status === 'failed' ? (
                <AlertTriangle size={22} className="shrink-0 mt-0.5" style={{ color: BRAND.danger }} />
              ) : (
                <CheckCircle2 size={22} className="shrink-0 mt-0.5" style={{ color: result.status === 'completed_with_errors' ? BRAND.amber : BRAND.ok }} />
              )}
              <div>
                <div className="font-semibold" style={{ color: result.status === 'failed' ? BRAND.danger : result.status === 'completed_with_errors' ? BRAND.amber : BRAND.ok, fontFamily: FONT_DISPLAY }}>
                  {result.status === 'failed' ? 'Import failed' : result.status === 'completed_with_errors' ? 'Import completed with errors' : 'Import completed successfully'}
                </div>
                <div className="text-sm mt-1" style={{ color: t.textMuted }}>
                  {result.status === 'failed'
                    ? (result.error_message || 'The import could not be completed.')
                    : `Total rows: ${(result.total_rows ?? summary?.total_rows ?? 0).toLocaleString()} · Imported: ${(result.success_rows ?? actionableRows).toLocaleString()} · Failed: ${(result.failed_rows ?? summary?.errors ?? 0).toLocaleString()}`}
                </div>
              </div>
            </div>
          )}
          {preview && actionableRows <= 0 && (
            <div className="flex items-start gap-2 text-sm" style={{ color: BRAND.amber }}>
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>No valid rows to import. Fix the errors below and upload the file again.</span>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat t={t} label="Total Rows" value={summary.total_rows ?? 0} />
            <Stat t={t} label="Countries new / existing" value={`${summary.countries?.new ?? 0} / ${summary.countries?.existing ?? 0}`} />
            <Stat t={t} label="States new / existing" value={`${summary.states?.new ?? 0} / ${summary.states?.existing ?? 0}`} />
            <Stat t={t} label="Districts new / existing" value={`${summary.districts?.new ?? 0} / ${summary.districts?.existing ?? 0}`} />
            <Stat t={t} label="Groups new / existing" value={`${summary.whatsapp_groups?.new ?? 0} / ${summary.whatsapp_groups?.existing ?? 0}`} />
            <Stat t={t} label="Updates" value={(summary.updated?.districts ?? 0) + (summary.updated?.whatsapp_groups ?? 0)} />
            <Stat t={t} label="Duplicates" value={summary.skipped_duplicates ?? 0} />
            <Stat t={t} label="Errors / Conflicts" value={`${summary.errors ?? 0} / ${summary.conflicts ?? 0}`} tone={(summary.errors || summary.conflicts) ? 'danger' : 'ok'} />
          </div>
          <IssueList t={t} issues={issues} />
        </div>
      )}
    </Modal>
  );
}

export function WhatsAppCommunityImportHistoryModal({ t, toast, open, onClose }) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const pageSize = 10;

  const load = async (nextPage = page) => {
    setLoading(true);
    try {
      const json = await locationApi.adminListWhatsAppCommunityImports({ page: nextPage, per_page: pageSize });
      setRows(Array.isArray(json.data) ? json.data : []);
      setMeta(json.meta || { current_page: nextPage, last_page: 1, per_page: pageSize, total: 0 });
    } catch (err) {
      toast?.(err?.message || 'Failed to load import history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load(page);
  }, [open, page]);

  const deleteRow = async (row) => {
    setDeletingId(row.id);
    try {
      await locationApi.adminDeleteWhatsAppCommunityImport(row.id);
      toast?.('Import history deleted. Imported data was not changed.', 'success');
      setConfirmRow(null);
      const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else load(page);
    } catch (err) {
      toast?.(err?.message || 'Could not delete import history', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
    <Modal
      t={t}
      open={open}
      onClose={onClose}
      title="Import History"
      width={860}
      footer={<Button variant="outline" onClick={onClose} style={{ color: t.text, borderColor: t.border }}>Close</Button>}
    >
      <p className="text-sm mb-3" style={{ color: t.textMuted }}>
        This is only the import log. Deleting a history row does not delete countries, states, districts, or WhatsApp groups.
      </p>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: t.border }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ background: t.surfaceAlt, color: t.textMuted }}>
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Admin</th>
              <th className="px-3 py-2 font-semibold">File</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Summary</th>
              <th className="px-3 py-2 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center" style={{ color: t.textMuted }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center" style={{ color: t.textMuted }}>No import history yet.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-t" style={{ borderColor: t.border }}>
                <td className="px-3 py-2" style={{ color: t.textMuted }}>{row.imported_at ? new Date(row.imported_at).toLocaleString() : '—'}</td>
                <td className="px-3 py-2" style={{ color: t.text }}>{row.admin || '—'}</td>
                <td className="px-3 py-2 truncate max-w-[160px]" style={{ color: t.textMuted }} title={row.file_name}>{row.file_name}</td>
                <td className="px-3 py-2" style={{ color: row.status === 'failed' ? BRAND.danger : row.status === 'completed_with_errors' || row.status === 'processing' || row.status === 'queued' ? BRAND.amber : BRAND.ok }}>{row.status}</td>
                <td className="px-3 py-2 text-xs" style={{ color: t.textMuted }}>
                  {row.total_rows} rows · {row.created} created · {row.updated} updated · {row.errors} errors
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Trash2}
                    disabled={!!deletingId}
                    onClick={() => setConfirmRow(row)}
                    style={{ color: BRAND.danger, borderColor: t.border }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          t={t}
          page={meta.current_page || page}
          totalPages={meta.last_page || 1}
          onPage={setPage}
          total={meta.total || 0}
          pageSize={meta.per_page || pageSize}
        />
      </div>
    </Modal>
      <HistoryDeleteConfirm
        t={t}
        open={!!confirmRow}
        fileName={confirmRow?.file_name}
        loading={!!deletingId}
        onCancel={() => !deletingId && setConfirmRow(null)}
        onConfirm={() => confirmRow && deleteRow(confirmRow)}
      />
    </>
  );
}

function HistoryDeleteConfirm({ t, open, fileName, loading, onCancel, onConfirm }) {
  const [hoverCancel, setHoverCancel] = useState(false);
  const [hoverConfirm, setHoverConfirm] = useState(false);

  useEffect(() => {
    if (!open) {
      setHoverCancel(false);
      setHoverConfirm(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4"
      style={{ background: 'rgba(14, 42, 28, 0.45)', backdropFilter: 'blur(2px)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel?.();
      }}
    >
      <div
        className="w-full max-w-[440px] rounded-2xl shadow-2xl px-7 pt-8 pb-6 text-center"
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          boxShadow: '0 24px 48px rgba(14, 42, 28, 0.18)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: BRAND.dangerLight, color: BRAND.danger, boxShadow: `0 0 0 8px ${BRAND.dangerLight}` }}
        >
          <AlertTriangle size={30} strokeWidth={2.25} />
        </div>
        <div className="mb-2 font-semibold tracking-tight" style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: t.text }}>
          Delete this import history?
        </div>
        <p className="text-sm leading-relaxed mb-7 max-w-[340px] mx-auto" style={{ color: t.textMuted }}>
          {fileName ? `"${fileName}" will be removed from the import log.` : 'This history row will be removed.'}
          {' '}Imported countries, districts, and WhatsApp groups will not be deleted.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            onMouseEnter={() => setHoverCancel(true)}
            onMouseLeave={() => setHoverCancel(false)}
            className="min-w-[118px] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: hoverCancel && !loading ? t.surfaceAlt : t.surface,
              color: t.text,
              border: `1.5px solid ${hoverCancel && !loading ? BRAND.primary : t.border}`,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            onMouseEnter={() => setHoverConfirm(true)}
            onMouseLeave={() => setHoverConfirm(false)}
            className="min-w-[132px] px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
            style={{
              background: hoverConfirm && !loading ? '#A83D35' : BRAND.danger,
              boxShadow: hoverConfirm && !loading ? '0 8px 20px rgba(193, 72, 63, 0.35)' : 'none',
            }}
          >
            {loading ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function WhatsAppCommunityImportButton({ t, toast, onImported }) {
  const { canAll } = usePermissions();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const allowed = useMemo(() => canAll(WHATSAPP_IMPORT_PERMISSIONS), [canAll]);

  if (!allowed) return null;

  return (
    <>
      <Button variant="outline" size="sm" icon={Upload} onClick={() => setOpen(true)} style={{ color: t.text, borderColor: t.border }}>
        Import Excel
      </Button>
      <Button variant="outline" size="sm" icon={History} onClick={() => setHistoryOpen(true)} style={{ color: t.text, borderColor: t.border }}>
        Import History
      </Button>
      <WhatsAppCommunityImportModal
        t={t}
        toast={toast}
        open={open}
        onClose={() => setOpen(false)}
        onImported={onImported}
        onViewHistory={() => {
          setOpen(false);
          setHistoryOpen(true);
        }}
      />
      <WhatsAppCommunityImportHistoryModal
        t={t}
        toast={toast}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
