'use client';

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore, formatCurrency } from '@/lib/store';
import { SavedEstimate } from '@/lib/types';
import { calculateTotals } from '@/lib/format';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Save, FolderOpen, Trash2, Pencil, FileText } from 'lucide-react';

type DialogMode = 'save' | 'open';

interface SavedEstimatesDialogProps {
  open: boolean;
  mode: DialogMode;
  onOpenChange: (open: boolean) => void;
  /** Optional: id of estimate to highlight when opening in "save" mode */
  highlightId?: string;
}

const formatDate = (ts: number): string => {
  try {
    return new Date(ts).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const estimateTotal = (estimate: SavedEstimate): number => {
  // Decompress items just to compute totals
  const items = estimate.items.map((i, index) => ({
    id: parseInt(i.i) || Date.now() + index,
    catalogId: i.i,
    name: i.n,
    description: i.d ?? '',
    quantity: i.q ?? 1,
    price: i.p ?? 0,
    unit: i.u ?? 'шт',
    type: i.t ?? 'service',
    category: i.c ?? '',
    amount: i.a ?? (i.q ?? 1) * (i.p ?? 0),
  }));
  return calculateTotals(items, estimate.settings.discount).grandTotal;
};

const estimateItemCount = (estimate: SavedEstimate): number => estimate.items.length;

export const SavedEstimatesDialog = memo(function SavedEstimatesDialog({
  open,
  mode,
  onOpenChange,
  highlightId,
}: SavedEstimatesDialogProps) {
  const {
    savedEstimates,
    items,
    settings,
    saveEstimate,
    loadEstimate,
    deleteEstimate,
    renameEstimate,
  } = useAppStore();

  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmOverwriteId, setConfirmOverwriteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Reset form state when dialog opens
  useEffect(() => {
    if (open) {
      const defaultName = settings.address
        ? `Смета — ${settings.address}`
        : `Смета от ${new Date().toLocaleDateString('ru-RU')}`;
      setName(defaultName);
      setEditingId(highlightId ?? null);
      setConfirmDeleteId(null);
      setConfirmOverwriteId(null);
      setRenamingId(null);
      setRenameValue('');
    }
  }, [open, highlightId, settings.address]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const sortedEstimates = useMemo(
    () => [...savedEstimates].sort((a, b) => b.updatedAt - a.updatedAt),
    [savedEstimates]
  );

  const handleSave = useCallback(() => {
    if (items.length === 0) {
      showToast('Смета пуста — нечего сохранять', 'error');
      return;
    }
    saveEstimate(name, editingId ?? undefined);
    showToast(editingId ? 'Смета обновлена' : 'Смета сохранена', 'success');
    onOpenChange(false);
  }, [items.length, name, editingId, saveEstimate, showToast, onOpenChange]);

  const handleSelectForOverwrite = useCallback(
    (estimate: SavedEstimate) => {
      setEditingId(estimate.id);
      setName(estimate.name);
    },
    []
  );

  const handleOpen = useCallback(
    (estimate: SavedEstimate) => {
      // If there are current items that differ, warn user before overwriting
      if (items.length > 0) {
        setConfirmOverwriteId(estimate.id);
        return;
      }
      const ok = loadEstimate(estimate.id);
      if (ok) {
        showToast(`Смета «${estimate.name}» открыта`, 'success');
        onOpenChange(false);
      } else {
        showToast('Не удалось открыть смету', 'error');
      }
    },
    [items.length, loadEstimate, showToast, onOpenChange]
  );

  const handleConfirmOverwrite = useCallback(() => {
    if (!confirmOverwriteId) return;
    const estimate = savedEstimates.find((e) => e.id === confirmOverwriteId);
    if (!estimate) {
      setConfirmOverwriteId(null);
      return;
    }
    const ok = loadEstimate(estimate.id);
    if (ok) {
      showToast(`Смета «${estimate.name}» открыта`, 'success');
      onOpenChange(false);
    } else {
      showToast('Не удалось открыть смету', 'error');
    }
    setConfirmOverwriteId(null);
  }, [confirmOverwriteId, savedEstimates, loadEstimate, showToast, onOpenChange]);

  const handleDeleteRequest = useCallback((id: string) => {
    setConfirmDeleteId(id);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!confirmDeleteId) return;
    deleteEstimate(confirmDeleteId);
    // If we were editing the deleted one, reset to "new" mode
    if (editingId === confirmDeleteId) {
      setEditingId(null);
      const defaultName = settings.address
        ? `Смета — ${settings.address}`
        : `Смета от ${new Date().toLocaleDateString('ru-RU')}`;
      setName(defaultName);
    }
    showToast('Смета удалена', 'info');
    setConfirmDeleteId(null);
  }, [confirmDeleteId, deleteEstimate, editingId, settings.address, showToast]);

  const handleStartRename = useCallback((estimate: SavedEstimate) => {
    setRenamingId(estimate.id);
    setRenameValue(estimate.name);
  }, []);

  const handleConfirmRename = useCallback(() => {
    if (!renamingId) return;
    renameEstimate(renamingId, renameValue);
    setRenamingId(null);
    setRenameValue('');
    showToast('Название изменено', 'success');
  }, [renamingId, renameValue, renameEstimate, showToast]);

  const handleCancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue('');
  }, []);

  const isSaveMode = mode === 'save';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            'max-w-md sm:max-w-lg rounded-2xl max-h-[90vh] flex flex-col',
            'p-0 gap-0'
          )}
          showCloseButton
        >
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-lg font-extrabold">
              {isSaveMode ? (
                <>
                  <Save className="w-5 h-5 text-primary" />
                  Сохранить смету
                </>
              ) : (
                <>
                  <FolderOpen className="w-5 h-5 text-primary" />
                  Открыть смету
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isSaveMode
                ? 'Сохраните текущую смету, чтобы вернуться к ней позже.'
                : 'Выберите сохранённую смету, чтобы продолжить редактирование.'}
            </DialogDescription>
          </DialogHeader>

          {isSaveMode && (
            <div className="px-5 py-4 border-b border-border space-y-2.5">
              <label
                htmlFor="estimate-name"
                className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block"
              >
                Название сметы
              </label>
              <input
                id="estimate-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Кухня, ул. Строителей 10"
                autoFocus
                className={cn(
                  'w-full px-3.5 py-3 rounded-xl text-sm',
                  'bg-card border-2 border-border',
                  'focus:outline-none focus:border-primary transition-colors',
                  'touch-manipulation'
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
              {editingId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Будет перезаписана выбранная ниже смета.</span>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 min-h-[120px]">
            {sortedEstimates.length === 0 ? (
              <div className="text-center py-10 px-4 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <div className="text-sm font-bold text-foreground mb-1">
                  {isSaveMode ? 'Пока нет сохранённых смет' : 'Нет сохранённых смет'}
                </div>
                <div className="text-xs">
                  {isSaveMode
                    ? 'Введите название выше и нажмите «Сохранить».'
                    : 'Сохраните текущую смету, чтобы она появилась здесь.'}
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {sortedEstimates.map((estimate) => {
                  const isSelected = editingId === estimate.id;
                  const total = estimateTotal(estimate);
                  const count = estimateItemCount(estimate);
                  const isRenaming = renamingId === estimate.id;
                  const confirmTarget = confirmDeleteId === estimate.id;

                  return (
                    <li
                      key={estimate.id}
                      className={cn(
                        'rounded-xl border-2 transition-all',
                        confirmTarget
                          ? 'border-destructive bg-destructive/5'
                          : isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/50'
                      )}
                    >
                      <div className="flex items-start gap-2 p-3">
                        <div className="flex-1 min-w-0">
                          {isRenaming ? (
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              autoFocus
                              className={cn(
                                'w-full px-2 py-1.5 rounded-lg text-sm font-bold',
                                'bg-background border-2 border-primary',
                                'focus:outline-none'
                              )}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleConfirmRename();
                                } else if (e.key === 'Escape') {
                                  handleCancelRename();
                                }
                              }}
                            />
                          ) : (
                            <div className="font-bold text-sm text-foreground truncate">
                              {estimate.name}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                            <span className="tabular-nums">{count} поз.</span>
                            <span className="opacity-50">•</span>
                            <span className="tabular-nums font-bold text-foreground/80">
                              {formatCurrency(total)}
                            </span>
                            <span className="opacity-50">•</span>
                            <span className="tabular-nums">
                              {formatDate(estimate.updatedAt)}
                            </span>
                          </div>
                          {estimate.settings.address && (
                            <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {estimate.settings.address}
                              {estimate.settings.discount > 0 && ` • скидка ${estimate.settings.discount}%`}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isRenaming ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleConfirmRename}
                                className="rounded-lg h-8 px-2 text-xs touch-manipulation"
                                aria-label="Подтвердить переименование"
                              >
                                ОК
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelRename}
                                className="rounded-lg h-8 px-2 text-xs touch-manipulation"
                                aria-label="Отменить переименование"
                              >
                                Отмена
                              </Button>
                            </>
                          ) : isSaveMode ? (
                            <Button
                              size="sm"
                              variant={isSelected ? 'default' : 'outline'}
                              onClick={() => handleSelectForOverwrite(estimate)}
                              className={cn(
                                'rounded-lg h-8 px-3 text-xs touch-manipulation',
                                isSelected && 'gradient-bg text-white'
                              )}
                            >
                              {isSelected ? 'Выбрано' : 'Перезаписать'}
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleOpen(estimate)}
                                className="rounded-lg h-8 px-3 text-xs gradient-bg text-white touch-manipulation"
                              >
                                Открыть
                              </Button>
                              <button
                                onClick={() => handleStartRename(estimate)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:text-primary hover:bg-primary/10 active:scale-90 transition-all touch-manipulation"
                                aria-label="Переименовать"
                                title="Переименовать"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRequest(estimate.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:text-destructive hover:bg-destructive/10 active:scale-90 transition-all touch-manipulation"
                                aria-label="Удалить"
                                title="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="rounded-xl touch-manipulation"
            >
              Отмена
            </Button>
            {isSaveMode && (
              <Button
                onClick={handleSave}
                disabled={items.length === 0}
                className={cn(
                  'rounded-xl touch-manipulation',
                  'gradient-bg text-white hover:shadow-lg'
                )}
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Обновить' : 'Сохранить'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete saved estimate */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
        title="Удалить смету?"
        description="Сохранённая смета будет удалена без возможности восстановления."
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />

      {/* Confirm overwrite current items when opening */}
      <ConfirmDialog
        open={confirmOverwriteId !== null}
        onOpenChange={(o) => !o && setConfirmOverwriteId(null)}
        title="Заменить текущую смету?"
        description="Текущие позиции будут заменены позициями из выбранной сметы. Если нужно их сохранить — закройте это окно и сохраните текущую смету."
        confirmText="Открыть и заменить"
        cancelText="Отмена"
        onConfirm={handleConfirmOverwrite}
        variant="destructive"
      />
    </>
  );
});
