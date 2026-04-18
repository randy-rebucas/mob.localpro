import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type ComponentProps } from 'react';
import { Text, View } from 'react-native';

import type { Announcement, AnnouncementType } from '@/core/services/announcementService';

function iconFor(type: AnnouncementType): ComponentProps<typeof MaterialIcons>['name'] {
  switch (type) {
    case 'warning':
      return 'warning';
    case 'success':
      return 'check-circle';
    case 'danger':
      return 'error';
    default:
      return 'info';
  }
}

function toneClasses(type: AnnouncementType): { border: string; icon: string } {
  switch (type) {
    case 'warning':
      return { border: 'border-l-[4px] border-l-amber-500', icon: '#d97706' };
    case 'success':
      return { border: 'border-l-[4px] border-l-emerald-500', icon: '#059669' };
    case 'danger':
      return { border: 'border-l-[4px] border-l-red-500', icon: '#dc2626' };
    default:
      return { border: 'border-l-[4px] border-l-sky-500', icon: '#0284c7' };
  }
}

type Props = {
  items: Announcement[];
};

export function HomeAnnouncements({ items }: Props) {
  if (!items.length) {
    return null;
  }

  return (
    <View className="mt-8">
      <View className="mb-3 px-0.5">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Announcements
        </Text>
      </View>
      <View className="gap-2">
        {items.slice(0, 4).map((a) => {
          const { border, icon } = toneClasses(a.type);
          return (
            <View
              key={a.id}
              className={`flex-row overflow-hidden rounded-xl border border-y border-r border-neutral-200 bg-white pl-3 dark:border-neutral-800 dark:bg-neutral-900 ${border}`}>
              <View className="py-3 pr-2">
                <MaterialIcons name={iconFor(a.type)} size={22} color={icon} />
              </View>
              <View className="min-w-0 flex-1 py-3 pr-3">
                <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{a.title}</Text>
                <Text className="mt-0.5 text-xs leading-5 text-neutral-600 dark:text-neutral-400">{a.message}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
