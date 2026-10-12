import { api, unwrap } from "@/shared/api";
export const projectsQuery = {
  queryKey: ["projects"],
  queryFn: async () => unwrap(await api.GET("/api/projects")),
};
export const submissionsQuery = {
  queryKey: ["submissions"],
  queryFn: async () => unwrap(await api.GET("/api/projects/submissions")),
};
