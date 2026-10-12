"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { UserRound, ShieldCheck } from "lucide-react";
import { AppShell, PageSkeleton } from "@/widgets/app-shell";
import { userQuery } from "@/entities/user";
import { useAuth } from "@/features/auth";
import { ProfileForm, PasswordForm } from "@/features/update-profile";
import { PageHeading, ErrorState, Tag } from "@/shared/ui";
import { errorMessage, setAccessToken } from "@/shared/api";
export function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const data = useQuery({ ...userQuery, enabled: !!user });
  const router = useRouter();
  return (
    <AppShell>
      <PageHeading
        eyebrow="ACCOUNT / PERSONAL SETTINGS"
        title="Ваша точка отсчёта."
        description="Настройте удобный ритм и защитите свой аккаунт."
      />
      {data.error ? (
        <ErrorState message={errorMessage(data.error)} />
      ) : data.data ? (
        <div className="profile-grid">
          <section className="panel">
            <div className="profile-identity">
              <span>{data.data.username.slice(0, 2).toUpperCase()}</span>
              <div>
                <h2>{data.data.username}</h2>
                <Tag tone="blue">УРОВЕНЬ {data.data.current_level}</Tag>
                <small>
                  {data.data.total_xp} XP · с{" "}
                  {new Date(data.data.created_at).toLocaleDateString("ru-RU")}
                </small>
              </div>
            </div>
            <div className="panel-heading">
              <h3>Основные настройки</h3>
              <UserRound size={18} />
            </div>
            <ProfileForm
              key={data.data.username}
              user={data.data}
              onSaved={updateUser}
            />
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h3>Безопасность</h3>
              <ShieldCheck size={19} />
            </div>
            <PasswordForm
              onChanged={() => {
                setAccessToken(null);
                void logout().finally(() => router.push("/login"));
              }}
            />
          </section>
        </div>
      ) : (
        <PageSkeleton variant="profile" />
      )}
    </AppShell>
  );
}
