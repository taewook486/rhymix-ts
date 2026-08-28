/**
 * __fixtures__.ts — Prisma 모델 테스트 픽스처 빌더
 *
 * document.test.ts 의 mock 이 부분 객체를 넘기면 Prisma 모델 타입과 어긋나
 * typecheck 가 깨진다. 더 심각한 문제는, 스키마에 필드가 추가돼도 부분 픽스처는
 * 아무 신호를 주지 않아 "테스트는 통과하는데 런타임에서 터지는" 상태를 만든다는 점이다.
 *
 * 각 빌더는 스키마 기본값을 그대로 반영한 완전한 모델 객체를 만들고,
 * 테스트는 관심 있는 필드만 override 로 덮어쓴다.
 * 반환 타입이 `Model & T` 라서 override 한 필드는 좁혀진 타입 그대로 단언에 쓸 수 있고,
 * include 로 붙는 관계 필드(author 등)도 타입에 남는다.
 */
import type {
  Board,
  Document,
  DocumentExtraKey,
  DocumentUpdateLog,
  Trash,
  User,
} from '@prisma/client';

/** 픽스처 전반에서 공유하는 고정 시각 — 스냅샷 흔들림 방지 */
const FIXED_DATE = new Date('2026-01-01T00:00:00.000Z');

const userDefaults: User = {
  id: 1,
  userId: 'fixture-user',
  emailAddress: 'fixture@example.com',
  passwordHash: '$argon2id$fixture',
  passwordVersion: 'argon2id-v1',
  passwordAlgo: 'argon2id',
  passwordChangedAt: FIXED_DATE,
  userName: null,
  nickName: 'fixture nick',
  phoneNumber: null,
  phoneCountry: null,
  status: 'APPROVED',
  isAdmin: false,
  denied: false,
  lastLoginAt: null,
  lastLoginIp: null,
  extraVars: {},
  dashboardWidgetPrefs: {},
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
  deletedAt: null,
  sessionsRevokedAt: null,
  pointBalance: 0,
  twoFactorSecret: null,
  twoFactorEnabled: false,
  twoFactorConfirmedAt: null,
  twoFactorBackupCodes: [],
  allowMessages: true,
};

const boardDefaults: Board = {
  id: 1,
  moduleInstanceId: 1,
  moduleSrl: null,
  name: 'fixture board',
  description: null,
  skin: null,
  layoutId: null,
  mobileSkin: null,
  mobileLayoutId: null,
  listCount: 20,
  pageCount: 10,
  orderTarget: 'list_order',
  exceptNotice: false,
  consultation: false,
  useAnonymous: false,
  updateLog: false,
  trashUse: true,
  useStatus: ['PUBLIC', 'SECRET', 'TEMP'],
  useCategory: false,
  documentLengthLimit: 1048576,
  commentLengthLimit: 131072,
  protectDeleteContent: 0,
  protectUpdateContent: 0,
  protectDeleteComment: 0,
  protectUpdateComment: 0,
  permissions: {},
  feedConfig: {},
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
  pointPerDocument: 0,
  pointPerComment: 0,
  pointPerVoteUp: 0,
  pointPerVoteDown: 0,
  pointPerDownload: 0,
  pointPerFileUpload: 0,
};

const documentDefaults: Document = {
  id: 1,
  documentSrl: null,
  boardId: 1,
  categoryId: null,
  title: 'fixture document',
  titleBold: false,
  titleColor: null,
  content: '<p>fixture</p>',
  contentText: 'fixture',
  authorId: null,
  userIdSnapshot: null,
  nickName: null,
  memberId: null,
  email: null,
  ipAddress: null,
  password: null,
  readedCount: 0,
  votedCount: 0,
  blamedCount: 0,
  commentCount: 0,
  trackbackCount: 0,
  uploadedCount: 0,
  status: 'PUBLIC',
  commentStatus: 'ALLOW',
  isNotice: false,
  langCode: 'ko',
  allowTrackback: false,
  notifyMessage: false,
  alias: null,
  extraVars: {},
  listOrder: BigInt(0),
  updateOrder: BigInt(0),
  regdate: FIXED_DATE,
  lastUpdate: FIXED_DATE,
  deletedAt: null,
};

const documentExtraKeyDefaults: DocumentExtraKey = {
  id: 1,
  boardId: 1,
  varIdx: 1,
  varName: 'fixture key',
  varType: 'text',
  varIsRequired: false,
  varSearch: false,
  varSort: false,
  varOptions: null,
  langCode: 'ko',
};

const trashDefaults: Trash = {
  id: 1,
  documentId: 1,
  deletedById: null,
  deletedAt: FIXED_DATE,
  expiresAt: FIXED_DATE,
};

const documentUpdateLogDefaults: DocumentUpdateLog = {
  id: 1,
  documentId: 1,
  prevTitle: 'fixture prev title',
  prevContent: 'fixture prev content',
  prevExtraVars: null,
  editorId: null,
  editorIp: null,
  regdate: FIXED_DATE,
};

/**
 * override 로 넘길 수 있는 값의 형태.
 * `Partial<M>` 로 모델 필드는 타입 검사를 받고,
 * `Record<string, unknown>` 으로 include 관계 필드(author, board 등)는 자유롭게 허용한다.
 */
type Overrides<M> = Partial<M> & Record<string, unknown>;

function build<M>(defaults: M) {
  return <T extends Overrides<M>>(overrides: T = {} as T): M & T =>
    ({ ...defaults, ...overrides }) as M & T;
}

/**
 * Prisma create/update 입력(data)을 "저장된 행"처럼 바꾼다. mockImplementation 전용.
 *
 * 좁히기가 두 군데서 불가피하다.
 *  1. 입력 타입은 관계 중첩과 필드 연산자 래퍼({ set: ... } 등)를 포함해 모델 타입과 다르다.
 *  2. create/update 의 선언 반환 타입은 단순 Promise 가 아니라 관계 탐색 메서드가 달린
 *     fluent 클라이언트(Prisma__DocumentClient)라서, 평범한 값/Promise 로는 만족시킬 수 없다.
 *
 * 두 좁히기를 이 함수 한 곳에 모아 테스트 본문에는 캐스트가 흩어지지 않게 한다.
 * 반환되는 "값"은 여전히 완전한 Document 이므로 형태가 가려지지는 않는다.
 * 호출부는 async 가 아닌 일반 함수여야 한다 — 결과는 모두 await 로만 소비되고,
 * await 는 thenable 이 아닌 객체를 그대로 통과시킨다.
 */
export function makeDocumentFromInput<R>(data: unknown, base: Document = documentDefaults): R {
  return { ...base, ...(data as Partial<Document>) } as R;
}

export const makeUser = build(userDefaults);
export const makeBoard = build(boardDefaults);
export const makeDocument = build(documentDefaults);
export const makeDocumentExtraKey = build(documentExtraKeyDefaults);
export const makeTrash = build(trashDefaults);
export const makeDocumentUpdateLog = build(documentUpdateLogDefaults);
