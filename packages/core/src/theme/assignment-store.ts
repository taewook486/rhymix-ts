// @MX:NOTE: [AUTO] In-memory ThemeAssignment 스토어 — 순수 로직, DB 없음
// @MX:SPEC: SPEC-THEME-001 Slice B REQ-THEME-050, REQ-THEME-051, REQ-THEME-052

export interface AssignmentEntry {
  scope: 'site' | 'domain' | 'module_instance';
  refType: string;   // 예: 'domain', 'mid', 'site'
  refId: string;     // 예: hostname, mid 값, 'default'
  layoutPath?: string;
  skinName?: string;
  themeName?: string;
}

export interface AssignmentStore {
  set(entry: AssignmentEntry): void;
  resolve(params: { hostname: string; mid?: string }): AssignmentEntry | null;
}

/**
 * 인메모리 ThemeAssignment 스토어를 생성한다.
 * 해석 우선순위: module_instance → domain → site
 *
 * REQ-THEME-050: createAssignment(assignment) — 할당 저장
 * REQ-THEME-051: resolveAssignment({ hostname, mid? }) → ThemeAssignment | null
 * REQ-THEME-052: 도메인 할당 없으면 site(scope='site') 기본값 반환
 */
// @MX:ANCHOR: [AUTO] createAssignmentStore — 스토어 팩토리
// @MX:REASON: REQ-THEME-050/051/052의 핵심 팩토리. 단위 테스트 및 DI 진입점
export function createAssignmentStore(): AssignmentStore {
  const entries: AssignmentEntry[] = [];

  return {
    /**
     * 할당 항목을 스토어에 추가한다.
     * 동일한 scope + refType + refId 조합이 있으면 덮어쓴다.
     */
    set(entry: AssignmentEntry): void {
      const existingIndex = entries.findIndex(
        (e) =>
          e.scope === entry.scope &&
          e.refType === entry.refType &&
          e.refId === entry.refId
      );
      if (existingIndex >= 0) {
        entries[existingIndex] = entry;
      } else {
        entries.push(entry);
      }
    },

    /**
     * 우선순위에 따라 할당 항목을 해석한다.
     * 1. module_instance: mid가 제공되고 해당 mid와 일치하는 항목
     * 2. domain: hostname과 일치하는 domain 항목
     * 3. site: scope='site'인 기본값 항목
     * 4. null: 매칭 없음
     */
    resolve(params: { hostname: string; mid?: string }): AssignmentEntry | null {
      // 1. 모듈 인스턴스 우선 (mid가 있을 때)
      if (params.mid) {
        const midEntry = entries.find(
          (e) => e.scope === 'module_instance' && e.refType === 'mid' && e.refId === params.mid
        );
        if (midEntry) {
          return midEntry;
        }
      }

      // 2. 도메인 할당
      const domainEntry = entries.find(
        (e) => e.scope === 'domain' && e.refId === params.hostname
      );
      if (domainEntry) {
        return domainEntry;
      }

      // 3. 사이트 기본값 (REQ-THEME-052)
      const siteEntry = entries.find((e) => e.scope === 'site');
      if (siteEntry) {
        return siteEntry;
      }

      return null;
    },
  };
}
