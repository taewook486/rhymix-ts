/**
 * FileStorage + VirusScanner interface — SPEC-CONTENT-001 Slice E
 *
 * @MX:NOTE [AUTO]: FileStorage 는 S3/MinIO/R2 호환 스토리지 추상화.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-030, OQ-CONTENT-002
 */

/**
 * S3 호환 스토리지 인터페이스.
 * S3Storage (AWS SDK v3), InMemoryStorage (테스트) 두 구현체를 지원.
 */
export interface FileStorage {
  /**
   * presigned PUT URL 발급 — 클라이언트가 이 URL 에 binary PUT 으로 직접 업로드.
   */
  getUploadPresignedUrl(input: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresIn?: number;
  }): Promise<{
    url: string;
    method: 'PUT';
    headers: Record<string, string>;
    key: string;
  }>;

  /**
   * 다운로드/조회용 presigned GET URL.
   */
  getDownloadUrl(input: {
    key: string;
    expiresIn?: number;
    forceAttachment?: boolean;
    filename?: string;
  }): Promise<string>;

  /**
   * 파일 삭제.
   */
  delete(key: string): Promise<void>;

  /**
   * 메타데이터 조회 — completeUpload 시 실제 사이즈/Content-Type 검증용.
   */
  head(key: string): Promise<{ size: number; contentType: string } | null>;
}

/**
 * 바이러스 스캐너 인터페이스.
 *
 * @MX:NOTE [AUTO]: NoopScanner 는 Slice E 기본값. 운영 환경 ClamAVScanner 는 SPEC-INFRA-001 이월.
 */
export interface VirusScanner {
  scan(input: {
    storageKey: string;
    storage: FileStorage;
    knownContentType: string;
    knownSize: number;
  }): Promise<{
    clean: boolean;
    threats?: string[];
    scannedAt: Date;
  }>;
}
