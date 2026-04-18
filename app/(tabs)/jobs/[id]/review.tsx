import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { BRAND } from '@/constants/brand';
import { jobService } from '@/core/services/jobService';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

function isCompletedStatus(status: string) {
  return status.toLowerCase().replace(/\s+/g, '_') === 'completed';
}

export default function JobReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = typeof id === 'string' ? id : id?.[0] ?? '';
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const showToast = useToastStore((s) => s.show);

  const jobQuery = useQuery({
    queryKey: ['jobs', 'detail', jobId],
    queryFn: () => jobService.getJob(jobId),
    enabled: !!jobId,
  });

  const mutation = useMutation({
    mutationFn: () => jobService.submitReview(jobId, rating, comment.trim()),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['jobs', 'detail', jobId] });
      showToast('Thanks for your review');
      router.back();
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not submit review'), 'error'),
  });

  if (jobQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] dark:bg-neutral-950">
        <ActivityIndicator color={BRAND.navy} />
      </View>
    );
  }

  const job = jobQuery.data;
  const canReview = job && isCompletedStatus(job.status);

  return (
    <ScrollView className="flex-1 bg-[#eef2f7] dark:bg-neutral-950" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {!canReview ? (
        <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="info-outline" size={22} color="#b45309" />
            <Text className="flex-1 text-sm font-medium text-amber-900 dark:text-amber-200">
              Reviews unlock after the job is marked completed and any escrow steps are finished.
            </Text>
          </View>
          {job ? (
            <Text className="mt-2 text-xs text-amber-800/80 dark:text-amber-300/80">Current status: {job.status}</Text>
          ) : null}
        </View>
      ) : null}

      <Text className={`mt-6 text-base font-medium text-neutral-800 dark:text-neutral-200 ${!canReview ? 'opacity-40' : ''}`}>
        Rating
      </Text>
      <View className={`mt-3 flex-row gap-2 ${!canReview ? 'opacity-40' : ''}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            accessibilityRole="button"
            accessibilityLabel={`${star} stars`}
            disabled={!canReview}
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

      <Text className={`mt-8 text-base font-medium text-neutral-800 dark:text-neutral-200 ${!canReview ? 'opacity-40' : ''}`}>
        Feedback
      </Text>
      <TextInput
        accessibilityLabel="Review comment"
        editable={!!canReview}
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
        disabled={!canReview || mutation.isPending || comment.trim().length < 5}
        onPress={() => mutation.mutate()}
        className="mt-10 rounded-2xl py-4 disabled:opacity-40 active:opacity-90"
        style={{ backgroundColor: BRAND.navy }}>
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-center text-base font-semibold text-white">Submit review</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
