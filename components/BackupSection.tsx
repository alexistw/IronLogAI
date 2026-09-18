import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Upload, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils';
import {
  BackupPayload,
  BackupParseError,
  ImportMode,
  ImportSummary,
  backupFileName,
  buildBackupPayload,
  getLastBackupAt,
  importBackup,
  markBackupExported,
  parseBackup,
  serializeBackup,
} from '../services/backupService';
import { exportBackupFile, readFileAsText } from '../services/backupTransfer';

interface BackupSectionProps {
  exerciseCount: number;
  onImported: () => void;
}

type Status = { tone: 'ok' | 'error'; text: string };

type PendingImport = {
  payload: BackupPayload;
  fileName: string;
};

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '未知時間';
  return date.toLocaleString();
};

const describeSummary = (summary: ImportSummary): string => {
  if (summary.mode === 'replace') {
    return `已覆蓋，目前共 ${summary.exercisesAfter} 筆紀錄。`;
  }
  return `已合併：新增 ${summary.exercisesAdded} 筆、更新 ${summary.exercisesUpdated} 筆，目前共 ${summary.exercisesAfter} 筆。`;
};

export const BackupSection: React.FC<BackupSectionProps> = ({ exerciseCount, onImported }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => getLastBackupAt());

  const handleExport = async () => {
    setStatus(null);
    setBusy(true);
    try {
      const now = new Date();
      const payload = buildBackupPayload(now);
      const outcome = await exportBackupFile(serializeBackup(payload), backupFileName(now));

      if (outcome === 'cancelled') {
        setStatus(null);
        return;
      }

      markBackupExported(now);
      setLastBackupAt(now.toISOString());
      setStatus({
        tone: 'ok',
        text: outcome === 'shared'
          ? `已匯出 ${payload.data.exercises.length} 筆紀錄，請存到「檔案」或雲端硬碟。`
          : `已下載備份檔，共 ${payload.data.exercises.length} 筆紀錄。`,
      });
    } catch (err) {
      console.error('[IronLog] Export failed', err);
      setStatus({ tone: 'error', text: '匯出失敗，請再試一次。' });
    } finally {
      setBusy(false);
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file twice still fires onChange.
    event.target.value = '';
    if (!file) return;

    setStatus(null);
    setBusy(true);
    try {
      const payload = parseBackup(await readFileAsText(file));
      setPending({ payload, fileName: file.name });
    } catch (err) {
      const text = err instanceof BackupParseError ? err.message : '無法讀取這個檔案。';
      setStatus({ tone: 'error', text });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmImport = (mode: ImportMode) => {
    if (!pending) return;
    setBusy(true);
    try {
      const summary = importBackup(pending.payload, mode);
      setPending(null);
      setStatus({ tone: 'ok', text: describeSummary(summary) });
      onImported();
    } catch (err) {
      console.error('[IronLog] Import failed', err);
      setStatus({ tone: 'error', text: '匯入失敗，資料未變更。' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-slate-800 text-left">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">
        Backup 資料備份
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        紀錄目前只存在這支手機。換手機或重裝 App 前請先匯出。
      </p>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 px-4 py-3 mb-4 text-xs text-slate-400 space-y-1">
        <div className="flex justify-between">
          <span>本機紀錄</span>
          <span className="text-slate-200 font-semibold">{exerciseCount} 筆</span>
        </div>
        <div className="flex justify-between">
          <span>上次匯出</span>
          <span className={cn('font-semibold', lastBackupAt ? 'text-slate-200' : 'text-amber-400')}>
            {lastBackupAt ? formatDateTime(lastBackupAt) : '從未匯出'}
          </span>
        </div>
      </div>

      {pending ? (
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{pending.fileName}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                匯出於 {formatDateTime(pending.payload.exportedAt)}
              </p>
            </div>
            <button
              onClick={() => setPending(null)}
              className="text-slate-500 hover:text-slate-300 shrink-0"
              aria-label="取消匯入"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-sm text-slate-300">
            檔案內含 <span className="font-bold text-white">{pending.payload.data.exercises.length}</span> 筆紀錄。
          </p>

          <div className="space-y-2">
            <Button
              variant="primary"
              className="w-full"
              disabled={busy}
              onClick={() => handleConfirmImport('merge')}
            >
              合併 Merge
            </Button>
            <p className="text-[11px] text-slate-500 px-1">
              保留現有紀錄，只補上檔案裡沒有的。推薦用這個。
            </p>

            <Button
              variant="danger"
              className="w-full"
              disabled={busy}
              onClick={() => handleConfirmImport('replace')}
            >
              覆蓋 Replace
            </Button>
            <p className="text-[11px] text-slate-500 px-1">
              刪除本機所有紀錄，改用檔案內容。現有 {exerciseCount} 筆會消失。
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            variant="secondary"
            className="w-full flex items-center justify-center gap-3"
            disabled={busy}
            onClick={handleExport}
          >
            <Download size={18} />
            匯出備份 Export
          </Button>

          <Button
            variant="secondary"
            className="w-full flex items-center justify-center gap-3"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={18} />
            匯入備份 Import
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileSelected}
      />

      {status && (
        <div
          className={cn(
            'mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs',
            status.tone === 'ok'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
              : 'bg-red-500/10 text-red-300 border border-red-500/30'
          )}
        >
          {status.tone === 'ok' ? (
            <CheckCircle2 size={16} className="shrink-0 mt-px" />
          ) : (
            <AlertTriangle size={16} className="shrink-0 mt-px" />
          )}
          <span>{status.text}</span>
        </div>
      )}
    </div>
  );
};
