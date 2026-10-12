import { api, unwrap, type Schema } from "@/shared/api";
export type Progress = Schema<"ProgressView">;
export const progressQuery = { queryKey: ["progress"], queryFn: async () => unwrap(await api.GET("/api/progress")) };
