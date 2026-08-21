import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Upload } from 'lucide-react';
import { locationApi } from '../../services/locationApi';
import { usePermissions } from '../../hooks/usePermissions';
import {
  BRAND,
  Button,
  FONT_DISPLAY,
  Modal,
} from './AdminShared';

export const WHATSAPP_IMPORT_PERMISSIONS = [
  'countries.create',
  'states.create',
  'cities.create',
  'whatsapp-groups.create',
  'whatsapp-groups.edit',
  'community-groups.edit',
];

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

export default function WhatsAppCommunityImportModal({ t, toast, open, onClose, onImported }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const loadHistory = async () => {
    try {
      const json = await locationApi.adminListWhatsAppCommunityImports();
      setHistory(Array.isArray(json.data) ? json.data : []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    if (open) loadHistory();
  }, [open]);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setConfirming(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    if (loading || confirming) return;
    reset();
    onClose?.();
  };

  const summary = preview?.summary || result?.summary;
  const issues = preview?.issues || result?.issues || [];
  const actionableRows = Math.max(
    0,
    (summary?.total_rows ?? 0) - (summary?.errors ?? 0) - (summary?.conflicts ?? 0) - (summary?.skipped_duplicates ?? 0)
  );

  const runPreview = async (nextFile) => {
    if (!nextFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const json = await locationApi.adminPreviewWhatsAppCommunityImport(nextFile);
      setPreview(json.data || json);
    } catch (err) {
      setPreview(null);
      setError(err?.message || 'Unable to preview this file.');
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!preview?.import_token) return;
    setConfirming(true);
    setError(null);
    try {
      const json = await locationApi.adminConfirmWhatsAppCommunityImport(preview.import_token);
      setResult(json.data || json);
      setPreview(null);
      toast?.(json.message || 'Import completed successfully.', 'success');
      onImported?.();
      loadHistory();
    } catch (err) {
      setError(err?.message || 'Import failed.');
    } finally {
      setConfirming(false);
    }
  };

  const title = result ? 'Import completed successfully' : preview ? 'Import preview' : 'Import Excel';

  return (
    <Modal
      t={t}
      open={open}
      onClose={close}
      title={title}
      width={720}
      footer={
        result ? (
          <Button onClick={close}>Done</Button>
        ) : preview ? (
          <>
            <Button variant="outline" onClick={reset} disabled={confirming} style={{ color: t.text, borderColor: t.border }}>
              Cancel Import
            </Button>
            <Button onClick={confirmImport} disabled={confirming || actionableRows <= 0}>
              {confirming ? 'Importing…' : 'Confirm Import'}
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={close} style={{ color: t.text, borderColor: t.border }}>Close</Button>
        )
      }
    >
      {!preview && !result && (
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
              if (next.size > 10 * 1024 * 1024) {
                setFile(null);
                setPreview(null);
                setError('The import file may not be larger than 10 MB.');
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
            <div className="text-xs mt-1" style={{ color: t.textMuted }}>.xlsx, .xls, or .csv · max 10 MB</div>
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
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: t.textFaint }}>Recent imports</div>
              <div className="max-h-40 overflow-y-auto rounded-xl border" style={{ borderColor: t.border }}>
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
                    {history.slice(0, 8).map((row) => (
                      <tr key={row.id} className="border-t" style={{ borderColor: t.border }}>
                        <td className="px-3 py-2" style={{ color: t.textMuted }}>{row.imported_at ? new Date(row.imported_at).toLocaleString() : '—'}</td>
                        <td className="px-3 py-2" style={{ color: t.text }}>{row.admin || '—'}</td>
                        <td className="px-3 py-2 truncate max-w-[140px]" style={{ color: t.textMuted }} title={row.file_name}>{row.file_name}</td>
                        <td className="px-3 py-2" style={{ color: row.status === 'failed' ? BRAND.danger : BRAND.ok }}>{row.status}</td>
                        <td className="px-3 py-2" style={{ color: t.textMuted }}>
                          {row.total_rows} rows · {row.created} created · {row.updated} updated · {row.skipped} skipped · {row.errors} errors · {row.conflicts} conflicts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm" style={{ color: BRAND.danger }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {summary && (
        <div className="space-y-3">
          {result && (
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: BRAND.ok }}>
              <CheckCircle2 size={16} /> Import Completed Successfully
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

export function WhatsAppCommunityImportButton({ t, toast, onImported }) {
  const { canAll } = usePermissions();
  const [open, setOpen] = useState(false);
  const allowed = useMemo(() => canAll(WHATSAPP_IMPORT_PERMISSIONS), [canAll]);

  if (!allowed) return null;

  return (
    <>
      <Button variant="outline" size="sm" icon={Upload} onClick={() => setOpen(true)} style={{ color: t.text, borderColor: t.border }}>
        Import Excel
      </Button>
      <WhatsAppCommunityImportModal
        t={t}
        toast={toast}
        open={open}
        onClose={() => setOpen(false)}
        onImported={onImported}
      />
    </>
  );
}
