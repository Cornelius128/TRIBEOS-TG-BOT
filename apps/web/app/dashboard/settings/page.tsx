import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const instant = false;
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  const groupCount = await prisma.groupAdmin.count({
    where: { userId: session.user.id as string },
  });

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
      <p className="text-zinc-400 mb-8">Manage your account and preferences.</p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your profile information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-zinc-400">Name</span>
              <span className="text-zinc-200">{user?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-zinc-400">Email</span>
              <span className="text-zinc-200">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-zinc-400">Member since</span>
              <span className="text-zinc-200">
                {user?.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-zinc-400">Communities</span>
              <Badge variant="secondary">{groupCount}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API & Integrations</CardTitle>
            <CardDescription>Connect your Telegram bot.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-zinc-400 space-y-2">
            <p>
              To connect the TribeOS bot to your Telegram group, add{" "}
              <code className="bg-zinc-800 px-1 rounded text-orange-400">@TribeOSBot</code> as an administrator,
              then use the <strong className="text-zinc-200">Link Community</strong> flow in the dashboard.
            </p>
            <p>
              The bot requires <em>Delete messages</em>, <em>Ban users</em>, and{" "}
              <em>Invite users via link</em> permissions to function fully.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
