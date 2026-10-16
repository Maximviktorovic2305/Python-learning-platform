"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, errorMessage, refreshLearningData } from "@/shared/api";
import { Button } from "@/shared/ui";
import { Check, ArrowRight } from "lucide-react";
export function CompleteLesson({
  id,
  userId,
  completed,
  onComplete,
}: {
  id: string;
  userId: string;
  completed: boolean;
  onComplete: () => void;
}) {
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
        Перейти к примерам
      </Button>
      {mutation.error && !completed && (
        <p className="form-error" role="alert">
          {errorMessage(mutation.error)}
        </p>
      )}
    </div>
  );
}
