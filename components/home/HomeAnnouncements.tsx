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

const ANNOUNCEMENT_BG = 'rgb(62, 165, 62)';

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
          return (
            <View
              key={a.id}
              className="flex-row overflow-hidden rounded-xl border border-white/25 pl-3"
              style={{ backgroundColor: ANNOUNCEMENT_BG }}>
              <View className="py-3 pr-2">
                <MaterialIcons name={iconFor(a.type)} size={22} color="#ffffff" />
              </View>
              <View className="min-w-0 flex-1 py-3 pr-3">
                <Text className="text-sm font-semibold text-white">{a.title}</Text>
                <Text className="mt-0.5 text-xs leading-5 text-white/90">{a.message}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
