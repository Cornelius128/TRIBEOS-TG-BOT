import { redirect } from "next/navigation";

export const instant = false;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  const target = params.callbackUrl || params.redirect || "/dashboard";
  redirect(`/auth/telegram?redirect=${encodeURIComponent(target)}`);
}
