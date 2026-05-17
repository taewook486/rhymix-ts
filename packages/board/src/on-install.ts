/**
 * on-install.ts — SPEC-CONTENT-001 Slice A
 *
 * onInstall 훅: ModuleInstance 생성 트랜잭션 안에서 Board row 1건을 생성한다.
 *
 * @MX:WARN [AUTO]: tx.board.create 가 ModuleInstance commit 전에 실행됨.
 * @MX:REASON: 외부 tx 컨텍스트 밖에서 호출 금지. 같은 트랜잭션 안에서만 FK 참조 안전.
 */
import type { ModuleLifecycleContext } from '@rhymix-ts/core/modules';
import { defaultBoardConfig } from './config.js';

export async function onInstallBoard(ctx: ModuleLifecycleContext): Promise<void> {
  await ctx.tx.board.create({
    data: {
      moduleInstanceId: ctx.instance.id,
      name: ctx.instance.name,
      // BoardConfig 기본값을 컬럼에 펼침
      skin: defaultBoardConfig.skin,
      layoutId: defaultBoardConfig.layoutId,
      mobileSkin: defaultBoardConfig.mobileSkin,
      mobileLayoutId: defaultBoardConfig.mobileLayoutId,
      listCount: defaultBoardConfig.listCount,
      pageCount: defaultBoardConfig.pageCount,
      orderTarget: defaultBoardConfig.orderTarget,
      exceptNotice: defaultBoardConfig.exceptNotice,
      consultation: defaultBoardConfig.consultation,
      useAnonymous: defaultBoardConfig.useAnonymous,
      updateLog: defaultBoardConfig.updateLog,
      trashUse: defaultBoardConfig.trashUse,
      useCategory: defaultBoardConfig.useCategory,
      documentLengthLimit: defaultBoardConfig.documentLengthLimit,
      commentLengthLimit: defaultBoardConfig.commentLengthLimit,
      // permissions, useStatus 는 모델 default 사용
    },
  });
}
