'use client';

import { memo, useState } from 'react';
import { BriefcaseBusiness, Check, ChevronDown, RefreshCw } from 'lucide-react';
import type { DatasetIndexEntry } from '@/lib/dataset';
import { cn } from '@/lib/utils';

interface ProfileSelectorProps {
  profiles: DatasetIndexEntry[];
  activeProfileId: string;
  onSelect: (profileId: string) => void;
  updateAvailable: boolean;
  busy: boolean;
  onCheckUpdate: () => Promise<unknown>;
  onUpdate: () => Promise<unknown>;
}

export const ProfileSelector = memo(function ProfileSelector({
  profiles,
  activeProfileId,
  onSelect,
  updateAvailable,
  busy,
  onCheckUpdate,
  onUpdate,
}: ProfileSelectorProps) {
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  const [actionError, setActionError] = useState<string | null>(null);
  if (!activeProfile && profiles.length === 0) return null;

  const handleRefresh = () => {
    setActionError(null);
    void (updateAvailable ? onUpdate() : onCheckUpdate()).catch((error: unknown) => {
      setActionError(error instanceof Error ? error.message : 'Не удалось обновить каталог');
    });
  };

  return (
    <div className="px-3 sm:px-4 pt-3 pb-1 max-w-5xl mx-auto w-full">
      <div className="flex items-stretch gap-2">
        <label className="relative block flex-1 min-w-0" htmlFor="profile-selector">
          <BriefcaseBusiness className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <select
            id="profile-selector"
            value={activeProfileId}
            onChange={(event) => onSelect(event.target.value)}
            className={cn(
              'w-full min-h-10 pl-9 pr-9 rounded-xl text-sm font-bold bg-card border border-border',
              'focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring appearance-none',
            )}
            aria-label="Профиль каталога"
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <span className="sr-only">Текущий профиль: {activeProfile?.name ?? activeProfileId}</span>
        </label>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={busy}
          className={cn(
            'shrink-0 min-h-10 px-3 rounded-xl border font-bold text-xs',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation',
            updateAvailable
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-foreground hover:bg-muted',
          )}
          aria-label={updateAvailable ? 'Обновить каталог' : 'Проверить каталог на обновления'}
          title={updateAvailable ? 'Обновить каталог' : 'Проверить каталог на обновления'}
        >
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" /> : updateAvailable ? <RefreshCw className="w-4 h-4" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
          <span className="sr-only">{updateAvailable ? 'Обновить' : 'Проверить'}</span>
        </button>
      </div>
      <div className="min-h-5 px-1 pt-1 text-[10px] text-muted-foreground" aria-live="polite">
        {busy ? 'Обновление каталога…' : actionError ? actionError : updateAvailable ? 'Доступна новая версия каталога' : `Версия ${activeProfile?.version ?? '—'}`}
      </div>
    </div>
  );
});
