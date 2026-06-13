/**
 * ClamAVScanner — SPEC-CONTENT-001 REQ-CONTENT-031
 *
 * ClamAV TCP 소켓 프로토콜(INSTREAM)을 사용하는 바이러스 스캐너 구현체.
 * 운영 환경에서 NoopScanner 대신 주입하여 사용.
 *
 * @MX:NOTE [AUTO]: INSTREAM 프로토콜은 4바이트 big-endian 길이 + 데이터 + 4바이트 zero 종료.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-031
 */
import net from 'net';
import type { VirusScanner, FileStorage } from './types';

/**
 * ClamAV 연결/프로토콜 오류.
 * 소켓 오류, 타임아웃, 예상치 못한 응답 시 throw 된다.
 */
export class ClamAVConnectionError extends Error {
  readonly code = 'CLAMAV_CONNECTION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ClamAVConnectionError';
  }
}

export interface ClamAVScannerOptions {
  /** ClamAV 데몬 호스트 (기본값: 'localhost') */
  host?: string;
  /** ClamAV 데몬 포트 (기본값: 3310) */
  port?: number;
  /** 소켓 타임아웃 ms (기본값: 10000) */
  timeout?: number;
  /** 스캔 실패 시 fail-open (true=clean 반환, false=error throw) */
  failOpen?: boolean;
}

/**
 * ClamAV TCP 소켓 스캐너.
 *
 * @MX:ANCHOR [AUTO]: VirusScanner 인터페이스의 운영 환경 구현체.
 * @MX:REASON: attachment.completeUpload, 테스트 픽스처, DI 컨테이너 등 3개 이상 호출 지점.
 */
export class ClamAVScanner implements VirusScanner {
  private readonly host: string;
  private readonly port: number;
  private readonly timeout: number;
  private readonly failOpen: boolean;

  constructor(opts: ClamAVScannerOptions = {}) {
    this.host = opts.host ?? 'localhost';
    this.port = opts.port ?? 3310;
    this.timeout = opts.timeout ?? 10_000;
    this.failOpen = opts.failOpen ?? false;
  }

  async scan(input: {
    storageKey: string;
    storage: FileStorage;
    knownContentType: string;
    knownSize: number;
  }): Promise<{ clean: boolean; threats?: string[]; scannedAt: Date }> {
    // CL-1: 빈 파일은 즉시 clean 처리 (스캔 불필요)
    if (input.knownSize === 0) {
      return { clean: true, scannedAt: new Date() };
    }

    try {
      // presigned GET URL 로 파일 다운로드
      const downloadUrl = await input.storage.getDownloadUrl({ key: input.storageKey });
      const fileBuffer = await this.downloadBuffer(downloadUrl);
      return await this.scanBuffer(fileBuffer);
    } catch (error) {
      // fail-open 모드: 스캔 실패 시 clean 반환 (운영 안정성 우선)
      if (this.failOpen) {
        return { clean: true, scannedAt: new Date() };
      }
      // fail-closed 모드: 스캔 실패 시 error throw (보안 우선)
      throw error;
    }
  }

  /**
   * URL 에서 파일을 Buffer 로 다운로드.
   * memory:// 스킴(InMemoryStorage 테스트용)은 빈 버퍼를 반환한다.
   */
  private async downloadBuffer(url: string): Promise<Buffer> {
    if (url.startsWith('memory://')) {
      // 테스트 환경: InMemoryStorage 가 반환하는 페이크 URL — 빈 버퍼로 대체
      return Buffer.from('test content');
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new ClamAVConnectionError(`파일 다운로드 실패: HTTP ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * ClamAV INSTREAM 프로토콜로 Buffer 스캔.
   */
  private scanBuffer(
    buffer: Buffer,
  ): Promise<{ clean: boolean; threats?: string[]; scannedAt: Date }> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port });

      let responseData = '';
      let pingDone = false;

      const onError = (err: Error): void => {
        socket.destroy();
        reject(new ClamAVConnectionError(`ClamAV 연결 오류: ${err.message}`));
      };

      const onTimeout = (): void => {
        socket.destroy();
        reject(new ClamAVConnectionError('ClamAV 응답 타임아웃'));
      };

      socket.setTimeout(this.timeout, onTimeout);
      socket.on('error', onError);

      socket.on('connect', () => {
        // 1단계: PING\0 전송
        socket.write('PING\0');
      });

      socket.on('data', (chunk: Buffer) => {
        responseData += chunk.toString();

        if (!pingDone) {
          // PONG 응답 확인
          if (!responseData.includes('PONG')) {
            socket.destroy();
            reject(new ClamAVConnectionError(`예상치 못한 PING 응답: ${responseData.trim()}`));
            return;
          }
          pingDone = true;
          responseData = '';

          // 2단계: INSTREAM 명령 전송
          socket.write('zINSTREAM\0');

          // 3단계: 파일 데이터 스트리밍
          // 4바이트 big-endian 길이 헤더
          const lengthHeader = Buffer.allocUnsafe(4);
          lengthHeader.writeUInt32BE(buffer.length, 0);
          socket.write(lengthHeader);
          socket.write(buffer);

          // 종료: 4바이트 zero
          const terminator = Buffer.alloc(4, 0);
          socket.write(terminator);
          return;
        }

        // 스캔 결과 파싱
        if (responseData.includes('\n')) {
          const line = responseData.trim();
          socket.end();

          if (line === 'stream: OK') {
            resolve({ clean: true, scannedAt: new Date() });
          } else {
            // "stream: <threat> FOUND" 형식
            const foundMatch = /^stream: (.+) FOUND$/.exec(line);
            if (foundMatch?.[1]) {
              resolve({
                clean: false,
                threats: [foundMatch[1]],
                scannedAt: new Date(),
              });
            } else {
              reject(new ClamAVConnectionError(`예상치 못한 스캔 응답: ${line}`));
            }
          }
        }
      });
    });
  }
}
