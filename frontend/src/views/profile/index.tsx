"use client";
import { useI18n } from "@/shared/i18n";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { UserRound, ShieldCheck } from "lucide-react";
import { PageSkeleton } from "@/widgets/app-shell";
import { userQuery } from "@/entities/user";
import { useAuth } from "@/features/auth";
import { ProfileForm, PasswordForm } from "@/features/update-profile";
import { PageHeading, ErrorState, Tag, CachedDataNotice } from "@/shared/ui";
import { errorMessage } from "@/shared/api";
import { ChangeLanguage } from "@/features/change-language";
export function ProfilePage() {
  const { text: localize, locale } = useI18n();

  const { user, logout, updateUser } = useAuth();
  const data = useQuery(userQuery(user?.id));
  const router = useRouter();
  return (
    <>
      <CachedDataNotice query={data} />
      <PageHeading
        eyebrow={localize("Профиль")}
        title={localize("Ваша точка отсчёта.")}
        description={localize(
          "Настройте удобный ритм и защитите свой аккаунт.",
        )}
      />
      {data.error && !data.data ? (
        <ErrorState
          message={localize(errorMessage(data.error))}
          retry={() => {
            void data.refetch();
          }}
        />
      ) : data.data ? (
        <div className="profile-grid">
          <section className="panel">
            <div className="profile-identity">
              <span>
                {localize(data.data.username.slice(0, 2).toUpperCase())}
              </span>
              <div>
                <h2>{localize(data.data.username)}</h2>
                <Tag tone="blue">
                  {localize("УРОВЕНЬ ")}
                  {data.data.current_level}
                </Tag>
                <small>
                  {data.data.total_xp}
                  {localize(" XP · с")}{" "}
                  {new Date(data.data.created_at).toLocaleDateString(locale)}
                </small>
              </div>
            </div>
            <div className="panel-heading">
              <h3>{localize("Основные настройки")}</h3>
              <UserRound size={18} />
            </div>
            <ProfileForm
              key={data.data.id}
              user={data.data}
              onSaved={updateUser}
            />
            <ChangeLanguage profile user={data.data} onSaved={updateUser} />
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h3>{localize("Безопасность")}</h3>
              <ShieldCheck size={19} />
            </div>
            <PasswordForm
              onChanged={() => {
                void logout()
                  .catch(() => {})
                  .finally(() => router.replace("/login"));
              }}
            />
          </section>
        </div>
      ) : (
        <PageSkeleton variant="profile" />
      )}
    </>
  );
}
