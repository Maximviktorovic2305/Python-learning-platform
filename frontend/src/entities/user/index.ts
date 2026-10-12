import { api, unwrap, type Schema } from "@/shared/api";
export type User = Schema<"UserView">;
export const userQuery = { queryKey: ["user"], queryFn: async () => unwrap(await api.GET("/api/users/me")) };
