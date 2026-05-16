/**
 * PrismaClient singleton — SPEC-ADMIN-001 Slice B.
 *
 * @rhymix-ts/db 패키지의 singleton 을 재사용하여 connection pooling 을 일관적으로 유지한다.
 */
export { prisma } from '@rhymix-ts/db';
