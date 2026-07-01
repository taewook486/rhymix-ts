// @MX:ANCHOR: [AUTO] 문서 도메인 패키지 최상위 exports 진입점
// @MX:REASON: fan_in >= 3 호출처 (@rhymix-ts/board re-export shim + apps/web + 향후 wiki/blog/page)
// @MX:SPEC: SPEC-DOCUMENT-001 REQ-DOC-012

// Document domain functions
export * from './document';
export * from './extra-keys';
export * from './extra-vars-schema';
export * from './history';
export * from './search';
export * from './report';
export * from './rate-limit';
export * from './permissions';
export * from './trash';
export * from './vote';
export * from './category';
export * from './admin';

// Slice C: secret, draft, events
export * from './secret';
export * from './draft';
export * from './events';

// SPEC-BOARD-UI-001: adjacent documents
export * from './adjacent';
