import type { QueryClient } from "@tanstack/react-query";
import type { Schema } from "./client";

let channel: BroadcastChannel | null = null;

export async function refreshLearningData(
  client: QueryClient,
  userId: string,
  broadcast = true,
) {
  if (broadcast) channel?.postMessage(userId);
  await Promise.all(
    ["progress", "achievements", "user"].map((key) =>
      client.invalidateQueries({
        queryKey: [key, userId],
        refetchType: "all",
      }),
    ),
  );
  const progress = client.getQueryData<Schema<"ProgressView">>([
    "progress",
    userId,
  ]);
  if (progress) {
    client.setQueriesData<Schema<"UserView"> | null>(
      { queryKey: ["session"] },
      (user) => (user?.id === userId ? progress.user : user),
    );
  }
}

export function subscribeLearningUpdates(client: QueryClient) {
  if (typeof BroadcastChannel === "undefined") return;
  const subscription = new BroadcastChannel("python-lab-learning");
  channel = subscription;
  subscription.onmessage = (event: MessageEvent<unknown>) => {
    if (typeof event.data === "string")
      void refreshLearningData(client, event.data, false);
  };
  return () => {
    subscription.close();
    if (channel === subscription) channel = null;
  };
}
