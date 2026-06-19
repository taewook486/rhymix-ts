'use client';
/**
 * 비동기 작업 설정 폼 (Client Component) — SPEC-ADMIN-002 Slice 2D (REQ-ADMIN2-154).
 */
import { useActionState } from 'react';
import { updateAsyncSettingsAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

export function AsyncSettingsForm({
  initial,
}: {
  initial: {
    enabled: boolean;
    driver: 'none' | 'db';
    webcronKey?: string;
    webcronShowError: boolean;
    intervalMinutes: number;
    processCount: number;
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateAsyncSettingsAction,
    initialActionState,
  );

  // Generate crontab/webcron/systemd examples based on current interval
  const generateExamples = (interval: number) => {
    const cronSchedule = `*/${interval} * * * *`;
    return {
      crontab: `${cronSchedule} cd /path/to/rhymix-ts && npx tsx scripts/worker.ts`,
      webcron: `wget -q -O - "https://your-site.com/api/async/cron?key=${initial.webcronKey || 'YOUR_KEY'}"`,
      systemd: `[Unit]
Description=Rhymix Async Worker
[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/rhymix-ts
ExecStart=/usr/bin/npx tsx scripts/worker.ts
Restart=always

[Timer]
OnUnitActiveSec=${interval * 60}s
AccuracySec=1s

[Install]
WantedBy=timers.target`,
    };
  };

  const examples = generateExamples(initial.intervalMinutes);

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="border rounded bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">비동기 작업 설정 (REQ-ADMIN2-154)</h2>

        <div className="space-y-4">
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="enabled"
                className="rounded mr-2"
                defaultChecked={initial.enabled}
              />
              <span className="text-sm font-medium">비동기 작업 사용</span>
            </label>
          </div>

          <div>
            <label htmlFor="driver" className="block text-sm font-medium mb-1">
              드라이버
            </label>
            <select
              id="driver"
              name="driver"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.driver}
            >
              <option value="none">미사용</option>
              <option value="db">DB</option>
            </select>
          </div>

          <div>
            <label htmlFor="webcronKey" className="block text-sm font-medium mb-1">
              웹크론 인증키
            </label>
            <div className="flex gap-2">
              <input
                id="webcronKey"
                name="webcronKey"
                type="text"
                className="flex-1 border rounded px-3 py-2 font-mono text-sm"
                defaultValue={initial.webcronKey || ''}
                placeholder="자동 생성됨"
                pattern="[a-f0-9]{32}"
                maxLength={32}
              />
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                onClick={() => {
                  // Generate new key on click (client-side only for UI)
                  const array = new Uint8Array(16);
                  crypto.getRandomValues(array);
                  const newKey = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
                  (document.querySelector('#webcronKey') as HTMLInputElement).value = newKey;
                }}
              >
                재생성
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              32자 hex 문자열. 웹크론 URL 호출 시 필요합니다. 비워두면 자동 생성됩니다.
            </p>
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="webcronShowError"
                className="rounded mr-2"
                defaultChecked={initial.webcronShowError}
              />
              <span className="text-sm">웹크론 오류 표시</span>
            </label>
          </div>

          <div>
            <label htmlFor="intervalMinutes" className="block text-sm font-medium mb-1">
              호출 간격 (분)
            </label>
            <input
              id="intervalMinutes"
              name="intervalMinutes"
              type="number"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.intervalMinutes}
              min={1}
              max={1440}
            />
            <p className="text-sm text-gray-500 mt-1">
              1분 ~ 1440분(24시간)
            </p>
          </div>

          <div>
            <label htmlFor="processCount" className="block text-sm font-medium mb-1">
              프로세스 갯수
            </label>
            <input
              id="processCount"
              name="processCount"
              type="number"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.processCount}
              min={1}
              max={10}
            />
          </div>
        </div>
      </div>

      {/* Crontab/Webcron/SystemD 예시 - 읽기 전용 */}
      <div className="border rounded bg-gray-50 p-6">
        <h2 className="text-lg font-semibold mb-4">설정 안내 (실행 명령 예시)</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Crontab</h3>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto">
              {examples.crontab}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Webcron</h3>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto">
              {examples.webcron}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Systemd Timer</h3>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto">
              {examples.systemd}
            </pre>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-3">
          ⚠️ 위 명령 예시는 현재 호출 간격({initial.intervalMinutes}분) 기준으로 자동 생성된
          참고용입니다. 실제 환경에 맞게 경로와 설정을 수정하여 사용하세요.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
