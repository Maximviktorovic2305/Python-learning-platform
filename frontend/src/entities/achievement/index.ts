import { api, unwrap } from "@/shared/api";
export const achievementsQuery = {
  queryKey: ["achievements"],
  queryFn: async () => unwrap(await api.GET("/api/achievements")),
};
