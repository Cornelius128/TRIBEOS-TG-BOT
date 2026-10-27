import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SybilFilterSchema = z.object({
  minAccountAgeDays: z.number().int().min(0).max(365).default(0),
  requireWalletConnect: z.boolean().default(false),
  filterLevel: z.enum(["off", "easy", "medium", "hardcore"]).default("off"),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const userId = session.user.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const config = await prisma.groupModuleConfig.findUnique({
    where: { groupId_moduleId: { groupId, moduleId: "anti_fraud" } },
  });

  return NextResponse.json(config?.config ?? { minAccountAgeDays: 0, requireWalletConnect: false, filterLevel: "off" });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const userId = session.user.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!admin || admin.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = SybilFilterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.groupModuleConfig.findUnique({
    where: { groupId_moduleId: { groupId, moduleId: "anti_fraud" } },
  });

  const config = await prisma.groupModuleConfig.upsert({
    where: { groupId_moduleId: { groupId, moduleId: "anti_fraud" } },
    update: {
      config: parsed.data,
      enabled: true,
      version: { increment: 1 },
    },
    create: {
      groupId,
      moduleId: "anti_fraud",
      enabled: true,
      config: parsed.data,
    },
  });

  if (existing) {
    await prisma.configVersion.create({
      data: {
        moduleConfigId: config.id,
        config: existing.config as import("@prisma/client").Prisma.InputJsonValue,
        version: existing.version,
        changedBy: userId,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      groupId,
      userId,
      eventType: "MODULE_CONFIG_UPDATED",
      description: `Anti-fraud sybil filter updated: level=${parsed.data.filterLevel}`,
      metadata: parsed.data,
    },
  });

  return NextResponse.json(config);
}
