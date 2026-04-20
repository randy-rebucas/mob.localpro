import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';

import { BRAND } from '@/constants/brand';
import type { ServiceCategory } from '@/core/services/categoryService';

type Props = {
  categories: ServiceCategory[];
  value: string;
  onChange: (categoryId: string) => void;
  onCommitValidate: () => void;
};

export function CategoryDropdown({ categories, value, onChange, onCommitValidate }: Props) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.id === value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose job category"
        accessibilityHint="Opens a list of categories"
        onPress={() => setOpen(true)}
        className="mt-2 flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-3.5 dark:border-neutral-700 dark:bg-neutral-900 active:opacity-90">
        <Text
          className={`mr-2 min-w-0 flex-1 text-base ${selected ? 'text-neutral-900 dark:text-neutral-50' : 'text-neutral-400'}`}
          numberOfLines={1}>
          {selected ? selected.name : 'Select a category…'}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={26} color={BRAND.navy} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close category list"
            className="absolute inset-0 bg-black/50"
            onPress={() => setOpen(false)}
          />
          <View className="max-h-[75%] rounded-t-3xl bg-white dark:bg-neutral-900">
            <Text className="border-b border-neutral-200 px-4 py-3.5 text-base font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
              Choose category
            </Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.id === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(item.id);
                      onCommitValidate();
                      setOpen(false);
                    }}
                    className={`border-b border-neutral-100 px-4 py-3.5 dark:border-neutral-800 ${isSelected ? 'bg-neutral-100 dark:bg-neutral-800' : ''} active:bg-neutral-50 dark:active:bg-neutral-800/80`}>
                    <Text className="text-base text-neutral-900 dark:text-neutral-100">{item.name}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
