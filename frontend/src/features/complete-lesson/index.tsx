"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, errorMessage } from "@/shared/api";
import { Button } from "@/shared/ui";
import { Check, ArrowRight } from "lucide-react";
export function CompleteLesson({
  id,
  completed,
  onComplete,
}: {
  id: string;
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
      await Promise.all([
        client.invalidateQueries({ queryKey: ["progress"] }),
        client.invalidateQueries({ queryKey: ["achievements"] }),
        client.invalidateQueries({ queryKey: ["user"] }),
      ]);
      onComplete();
    },
  });
  return (
    <div>
      <Button
        onClick={() => (completed ? onComplete() : mutation.mutate())}
        pending={mutation.isPending}
      >
        {completed ? <Check size={16} /> : <ArrowRight size={16} />}
        {completed ? "Перейти к практике" : "Теория изучена · +20 XP"}
      </Button>
      {mutation.error && (
        <p className="form-error" role="alert">
          {errorMessage(mutation.error)}
        </p>
      )}
    </div>
  );
}
