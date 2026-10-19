"use client";
import { useI18n } from "@/shared/i18n";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, errorMessage, refreshLearningData } from "@/shared/api";
import { Button } from "@/shared/ui";
import { Check, ArrowRight } from "lucide-react";
export function CompleteLesson({
  id,
  userId,
  completed,
  onComplete,
  actionLabel = "Перейти к практике",
}: {
  id: string;
  userId: string;
  completed: boolean;
  onComplete: () => void;
  actionLabel?: string;
}) {
  const { text: localize } = useI18n();

  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST("/api/lessons/{topic_id}/complete", {
          params: { path: { topic_id: id } },
        }),
      ),
    onSuccess: async () => {
      await refreshLearningData(client, userId);
      onComplete();
    },
    onError: () => refreshLearningData(client, userId),
  });
  return (
    <div>
      <Button
        onClick={() => (completed ? onComplete() : mutation.mutate())}
        pending={mutation.isPending}
      >
        {completed ? <Check size={16} /> : <ArrowRight size={16} />}
        {localize(actionLabel)}
      </Button>
      {mutation.error && !completed && (
        <p className="form-error" role="alert">
          {localize(errorMessage(mutation.error))}
        </p>
      )}
    </div>
  );
}
