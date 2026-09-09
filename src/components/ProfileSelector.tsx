'use client';

import { memo } from 'react';
import { BriefcaseBusiness, ChevronDown } from 'lucide-react';
import type { DatasetIndexEntry } from '@/lib/dataset';
import { cn } from '@/lib/utils';

interface ProfileSelectorProps {
  profiles: DatasetIndexEntry[];
  activeProfileId: string;
  onSelect: (profileId: string) => void;
}

export const ProfileSelector = memo(function ProfileSelector({ profiles, activeProfileId, onSelect }: ProfileSelectorProps) {
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  if (!activeProfile && profiles.length === 0) return null;

  return (
    <div className="px-3 sm:px-4 pt-3 pb-1 max-w-5xl mx-auto w-full">
      <label className="relative block" htmlFor="profile-selector">
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
    </div>
  );
});
