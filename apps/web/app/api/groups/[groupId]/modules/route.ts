import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const UpdateSchema = z.object({
  moduleId: z.string().min(1),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!admin || admin.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { moduleId, enabled, config } = parsed.data;
  const configJson = (config ?? {}) as Prisma.InputJsonValue;

  const existing = await prisma.groupModuleConfig.findUnique({
    where: { groupId_moduleId: { groupId, moduleId } },
  });

  let result;
  if (existing) {
    // Save config version
    await prisma.configVersion.create({
      data: {
        moduleConfigId: existing.id,
        config: existing.config as Prisma.InputJsonValue,
        version: existing.version,
        changedBy: userId,
      },
    });

    result = await prisma.groupModuleConfig.update({
      where: { groupId_moduleId: { groupId, moduleId } },
      data: {
        enabled,
        ...(config !== undefined && { config: configJson }),
        version: { increment: 1 },
        updatedBy: userId,
      },
    });
  } else {
    result = await prisma.groupModuleConfig.create({
      data: {
        groupId,
        moduleId,
        enabled,
        config: configJson,
        updatedBy: userId,
      },
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      groupId,
      userId,
      eventType: enabled ? "MODULE_ENABLED" : "MODULE_DISABLED",
      description: `Module "${moduleId}" ${enabled ? "enabled" : "disabled"}`,
      metadata: { moduleId, enabled } as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(result);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const configs = await prisma.groupModuleConfig.findMany({
    where: { groupId },
  });

  return NextResponse.json(configs);
}
