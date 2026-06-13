/**
 * clamav.test.ts — SPEC-CONTENT-001 REQ-CONTENT-031
 *
 * CL-1 ~ CL-5: ClamAVScanner TCP 소켓 바이러스 스캔 검증.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Socket } from 'net';
import { EventEmitter } from 'events';

// net 모듈을 mock — 실제 TCP 연결 없이 소켓 이벤트를 시뮬레이션
vi.mock('net', () => {
  return {
    default: {
      createConnection: vi.fn(),
    },
    createConnection: vi.fn(),
  };
});

import net from 'net';
import { ClamAVScanner, ClamAVConnectionError } from './clamav';
import { InMemoryStorage } from './memory';

// 테스트용 가짜 소켓 생성 헬퍼
function createMockSocket(responses: string[]): Socket {
  const emitter = new EventEmitter() as Socket;
  let responseIndex = 0;

  // write 호출 시 응답 emit 시뮬레이션
  (emitter as unknown as { write: (data: Buffer | string, cb?: () => void) => boolean }).write = (
    _data: Buffer | string,
    cb?: () => void,
  ): boolean => {
    if (cb) cb();
    return true;
  };
  (emitter as unknown as { setTimeout: (ms: number, cb: () => void) => void }).setTimeout = (
    _ms: number,
    _cb: () => void,
  ): void => {};
  (emitter as unknown as { destroy: () => void }).destroy = (): void => {
    emitter.emit('close');
  };
  (emitter as unknown as { end: () => void }).end = (): void => {};

  // connect 이후 'connect' 이벤트 + PING 응답 순서 자동 emit
  const originalOn = emitter.on.bind(emitter);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (emitter as unknown as { on: typeof originalOn }).on = (event: string, listener: (...args: any[]) => void) => {
    originalOn(event, listener);
    if (event === 'connect') {
      // 다음 틱에 connect 이벤트 발생
      setImmediate(() => emitter.emit('connect'));
    }
    if (event === 'data') {
      // connect 후 데이터 순차 emit
      setImmediate(() => {
        for (const resp of responses) {
          emitter.emit('data', Buffer.from(resp));
          responseIndex++;
        }
        _ = responseIndex; // suppress unused warning
      });
    }
    return emitter;
  };

  return emitter;
}
let _ = 0; // suppress unused warning for responseIndex

// 오류 소켓 생성 헬퍼
function createErrorSocket(): Socket {
  const emitter = new EventEmitter() as Socket;
  (emitter as unknown as { write: () => boolean }).write = (): boolean => true;
  (emitter as unknown as { setTimeout: () => void }).setTimeout = (): void => {};
  (emitter as unknown as { destroy: () => void }).destroy = (): void => {};
  (emitter as unknown as { end: () => void }).end = (): void => {};

  setImmediate(() => {
    emitter.emit('error', new Error('ECONNREFUSED'));
  });

  return emitter;
}

// 타임아웃 소켓 생성 헬퍼 (응답 없이 timeout 이벤트)
function createTimeoutSocket(): Socket {
  const emitter = new EventEmitter() as Socket;
  (emitter as unknown as { write: () => boolean }).write = (): boolean => true;
  (emitter as unknown as { setTimeout: (_ms: number, cb: () => void) => void }).setTimeout = (
    _ms: number,
    cb: () => void,
  ): void => {
    setImmediate(cb);
  };
  (emitter as unknown as { destroy: () => void }).destroy = (): void => {
    emitter.emit('close');
  };
  (emitter as unknown as { end: () => void }).end = (): void => {};

  setImmediate(() => emitter.emit('connect'));

  return emitter;
}

describe('ClamAVScanner', () => {
  let storage: InMemoryStorage;
  const mockCreateConnection = vi.mocked(net.createConnection);

  beforeEach(() => {
    storage = new InMemoryStorage();
    storage.put('test/file.txt', Buffer.from('test content'), 'text/plain');
    mockCreateConnection.mockReset();
  });

  // CL-1: knownSize=0 → 소켓 연결 없이 즉시 clean: true 반환
  it('CL-1: knownSize=0 → 소켓 연결 없이 clean: true 반환', async () => {
    const scanner = new ClamAVScanner();

    const result = await scanner.scan({
      storageKey: 'test/file.txt',
      storage,
      knownContentType: 'text/plain',
      knownSize: 0,
    });

    expect(result.clean).toBe(true);
    expect(result.scannedAt).toBeInstanceOf(Date);
    expect(mockCreateConnection).not.toHaveBeenCalled();
  });

  // CL-2: 소켓 응답 "stream: OK\n" → clean: true
  it('CL-2: 소켓 응답 "stream: OK\\n" → { clean: true }', async () => {
    const mockSocket = createMockSocket(['PONG\n', 'stream: OK\n']);
    mockCreateConnection.mockReturnValue(mockSocket as ReturnType<typeof net.createConnection>);

    const scanner = new ClamAVScanner({ host: 'localhost', port: 3310 });

    const result = await scanner.scan({
      storageKey: 'test/file.txt',
      storage,
      knownContentType: 'text/plain',
      knownSize: 12,
    });

    expect(result.clean).toBe(true);
    expect(result.scannedAt).toBeInstanceOf(Date);
    expect(result.threats).toBeUndefined();
  });

  // CL-3: 소켓 응답 "stream: Eicar-Test-Signature FOUND\n" → { clean: false, threats: ['Eicar-Test-Signature'] }
  it('CL-3: FOUND 응답 → { clean: false, threats: [...] }', async () => {
    const mockSocket = createMockSocket(['PONG\n', 'stream: Eicar-Test-Signature FOUND\n']);
    mockCreateConnection.mockReturnValue(mockSocket as ReturnType<typeof net.createConnection>);

    const scanner = new ClamAVScanner();

    const result = await scanner.scan({
      storageKey: 'test/file.txt',
      storage,
      knownContentType: 'text/plain',
      knownSize: 12,
    });

    expect(result.clean).toBe(false);
    expect(result.threats).toEqual(['Eicar-Test-Signature']);
    expect(result.scannedAt).toBeInstanceOf(Date);
  });

  // CL-4: 소켓 'error' 이벤트 → ClamAVConnectionError throw
  it('CL-4: 소켓 error 이벤트 → ClamAVConnectionError throw', async () => {
    const errorSocket = createErrorSocket();
    mockCreateConnection.mockReturnValue(errorSocket as ReturnType<typeof net.createConnection>);

    const scanner = new ClamAVScanner();

    await expect(
      scanner.scan({
        storageKey: 'test/file.txt',
        storage,
        knownContentType: 'text/plain',
        knownSize: 12,
      }),
    ).rejects.toThrow(ClamAVConnectionError);
  });

  // CL-5: 소켓 타임아웃 → ClamAVConnectionError throw
  it('CL-5: 소켓 타임아웃 → ClamAVConnectionError throw', async () => {
    const timeoutSocket = createTimeoutSocket();
    mockCreateConnection.mockReturnValue(timeoutSocket as ReturnType<typeof net.createConnection>);

    const scanner = new ClamAVScanner({ timeout: 100 });

    await expect(
      scanner.scan({
        storageKey: 'test/file.txt',
        storage,
        knownContentType: 'text/plain',
        knownSize: 12,
      }),
    ).rejects.toThrow(ClamAVConnectionError);
  });
});
