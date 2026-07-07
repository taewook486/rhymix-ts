/**
 * 통계 관련 타입 정의 — SPEC-STATS-001.
 *
 * @MX:SPEC: SPEC-STATS-001
 */

/**
 * 방문자 데이터 포인트
 */
export interface VisitorDataPoint {
  date: string;
  uniqueVisitors: number;
  pageViews: number;
}

/**
 * 신규 콘텐츠 데이터 포인트
 */
export interface NewContentDataPoint {
  date: string;
  newDocuments: number;
  newComments: number;
  newMembers: number;
}

/**
 * 요약 카운트
 */
export interface SummaryCounts {
  members: number;
  documents: number;
  comments: number;
  files: number;
}

/**
 * 전일 대비 증감율
 */
export interface DayOverDay {
  members: number;
  documents: number;
  comments: number;
  files: number;
}

/**
 * 인기 게시물
 */
export interface PopularPost {
  id: number;
  title: string;
  boardName: string;
  viewCount: number;
  author: string;
  regdate: Date;
}

/**
 * 검색어 통계
 */
export interface SearchKeyword {
  keyword: string;
  count: number;
}

/**
 * 통계 상세 데이터
 */
export interface DetailedStats {
  daily: VisitorDataPoint[];
  summary: {
    totalUniqueVisitors: number;
    totalPagesViews: number;
    averageDailyVisitors: number;
  };
}
