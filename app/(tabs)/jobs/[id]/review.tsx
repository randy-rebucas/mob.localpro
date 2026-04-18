import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { jobService } from '@/core/services/jobService';
import { useToastStore } from '@/core/stores/toastStore';

export default function JobReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = typeof id === 'string' ? id : id?.[0] ?? '';
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const showToast = useToastStore((s) => s.show);

  const mutation = useMutation({
    mutationFn: () => jobService.submitReview(jobId, rating, comment),
    onSuccess: () => {
      showToast('Thanks for your review');
      router.back();
    },
    onError: () => showToast('Could not submit review', 'error'),
  });

  return (
    <View className="flex-1 bg-neutral-50 p-4 dark:bg-neutral-950">
      <Text className="text-base font-medium text-neutral-800 dark:text-neutral-200">Rating</Text>
      <View className="mt-3 flex-row gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            accessibilityRole="button"
            accessibilityLabel={`${star} stars`}
            onPress={() => setRating(star)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
            <MaterialIcons
              name={star <= rating ? 'star' : 'star-border'}
              size={22}
              color={star <= rating ? '#f59e0b' : '#d4d4d8'}
            />
          </Pressable>
        ))}
      </View>

      <Text className="mt-8 text-base font-medium text-neutral-800 dark:text-neutral-200">Comment</Text>
      <TextInput
        accessibilityLabel="Review comment"
        className="mt-2 min-h-[100px] rounded-xl border border-neutral-200 bg-white p-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        placeholder="What went well?"
        placeholderTextColor="#9ca3af"
        multiline
        textAlignVertical="top"
        value={comment}
        onChangeText={setComment}
      />

      <Pressable
        accessibilityRole="button"
        disabled={mutation.isPending}
        onPress={() => mutation.mutate()}
        className="mt-10 rounded-2xl bg-brand py-4 dark:bg-brand-dark">
        <Text className="text-center text-base font-semibold text-white">{mutation.isPending ? 'Submitting…' : 'Submit review'}</Text>
      </Pressable>
    </View>
  );
}
