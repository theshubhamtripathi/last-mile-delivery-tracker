import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Writes an immutable audit record on every admin configuration change and
 * every status override. before/after are stored as JSON so a reviewer can see
 * exactly what changed and who changed it.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    actorUserId: string,
    entityType: string,
    entityId: string,
    action: string,
    beforeState: unknown,
    afterState: unknown,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        entityType,
        entityId,
        action,
        beforeState: (beforeState ?? undefined) as object | undefined,
        afterState: (afterState ?? undefined) as object | undefined,
      },
    });
  }

  list(params: { entityType?: string; take?: number }) {
    return this.prisma.auditLog.findMany({
      where: params.entityType ? { entityType: params.entityType } : undefined,
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 100,
      include: { actor: { select: { fullName: true, email: true, role: true } } },
    });
  }
}
