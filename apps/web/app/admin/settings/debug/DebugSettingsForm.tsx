'use client';
/**
 * 디버그 설정 폼 (Client Component) — SPEC-ADMIN-002 Slice 3E (REQ-ADMIN2-117/159/160).
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-117, REQ-ADMIN2-159, REQ-ADMIN2-160
 */
import { useActionState } from 'react';
import { updateDebugSettingsAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

export type DebugFormSettings = {
  enabled: boolean;
  slowQueryThreshold: number;
  slowTriggerThreshold: number;
  slowWidgetThreshold: number;
  slowExternalThreshold: number;
  displayMethods: ('html_comment' | 'screen_panel' | 'file_log')[];
  contentTypes: (
    | 'request_response'
    | 'debug_message'
    | 'error'
    | 'query'
    | 'slow_query'
    | 'slow_trigger'
    | 'slow_widget'
    | 'slow_external'
  )[];
  logFilePath: string;
  displayTarget: 'admin_only' | 'allowed_ips' | 'all';
  allowedIps: string[];
  addQueryComment: boolean;
  showFullCallStack: boolean;
  deduplicateErrors: boolean;
  errorLogLevel: 'all_errors_warnings' | 'critical_only';
};

export function DebugSettingsForm({
  initialSettings,
}: {
  initialSettings: {
    enabled: boolean;
    slowQueryThreshold: number;
    slowTriggerThreshold: number;
    slowWidgetThreshold: number;
    slowExternalThreshold: number;
    displayMethods: ('html_comment' | 'screen_panel' | 'file_log')[];
    contentTypes: (
      | 'request_response'
      | 'debug_message'
      | 'error'
      | 'query'
      | 'slow_query'
      | 'slow_trigger'
      | 'slow_widget'
      | 'slow_external'
    )[];
    logFilePath: string;
    displayTarget: 'admin_only' | 'allowed_ips' | 'all';
    allowedIps: string[];
    addQueryComment: boolean;
    showFullCallStack: boolean;
    deduplicateErrors: boolean;
    errorLogLevel: 'all_errors_warnings' | 'critical_only';
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateDebugSettingsAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-6 max-w-4xl">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="text-sm text-green-600" role="status">
          설정이 저장되었습니다.
        </p>
      )}

      {/* REQ-ADMIN2-117: 디버그 기능 활성화 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">디버그 기능</h3>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            name="enabled"
            defaultChecked={initialSettings.enabled}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
            디버그 기능 활성화
          </label>
        </div>
      </div>

      {/* REQ-ADMIN2-159: 느린 작업 임계값 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">느린 작업 임계값 (초 단위)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="slowQueryThreshold" className="block text-sm font-medium text-gray-700">
              느린 쿼리
            </label>
            <input
              type="number"
              id="slowQueryThreshold"
              name="slowQueryThreshold"
              step="0.1"
              min="0"
              defaultValue={initialSettings.slowQueryThreshold}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            />
          </div>
          <div>
            <label htmlFor="slowTriggerThreshold" className="block text-sm font-medium text-gray-700">
              느린 트리거
            </label>
            <input
              type="number"
              id="slowTriggerThreshold"
              name="slowTriggerThreshold"
              step="0.1"
              min="0"
              defaultValue={initialSettings.slowTriggerThreshold}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            />
          </div>
          <div>
            <label htmlFor="slowWidgetThreshold" className="block text-sm font-medium text-gray-700">
              느린 위젯
            </label>
            <input
              type="number"
              id="slowWidgetThreshold"
              name="slowWidgetThreshold"
              step="0.1"
              min="0"
              defaultValue={initialSettings.slowWidgetThreshold}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            />
          </div>
          <div>
            <label htmlFor="slowExternalThreshold" className="block text-sm font-medium text-gray-700">
              느린 외부 요청
            </label>
            <input
              type="number"
              id="slowExternalThreshold"
              name="slowExternalThreshold"
              step="0.1"
              min="0"
              defaultValue={initialSettings.slowExternalThreshold}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            />
          </div>
        </div>
      </div>

      {/* REQ-ADMIN2-159: 디버그 정보 표시 방법 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">디버그 정보 표시 방법</h3>
        <div className="space-y-2">
          {[
            { value: 'html_comment', label: 'HTML 소스 주석' },
            { value: 'screen_panel', label: '화면 패널' },
            { value: 'file_log', label: '파일 기록' },
          ].map((method) => (
            <div key={method.value} className="flex items-center">
              <input
                type="checkbox"
                id={`displayMethod-${method.value}`}
                name="displayMethods"
                value={method.value}
                defaultChecked={(initialSettings.displayMethods as readonly string[]).includes(method.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={`displayMethod-${method.value}`} className="ml-2 block text-sm text-gray-900">
                {method.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* REQ-ADMIN2-159: 디버그 정보 표시 내용 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">디버그 정보 표시 내용</h3>
        <div className="space-y-2">
          {[
            { value: 'request_response', label: '요청·응답 정보' },
            { value: 'debug_message', label: '디버그 메시지' },
            { value: 'error', label: '에러' },
            { value: 'query', label: '쿼리' },
            { value: 'slow_query', label: '느린 쿼리' },
            { value: 'slow_trigger', label: '느린 트리거' },
            { value: 'slow_widget', label: '느린 위젯' },
            { value: 'slow_external', label: '느린 외부 요청' },
          ].map((type) => (
            <div key={type.value} className="flex items-center">
              <input
                type="checkbox"
                id={`contentType-${type.value}`}
                name="contentTypes"
                value={type.value}
                defaultChecked={(initialSettings.contentTypes as readonly string[]).includes(type.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={`contentType-${type.value}`} className="ml-2 block text-sm text-gray-900">
                {type.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* REQ-ADMIN2-159: 로그 파일 경로 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">로그 파일 경로</h3>
        <div>
          <label htmlFor="logFilePath" className="block text-sm font-medium text-gray-700">
            파일 경로 (날짜 패턴 지원: {'{date}'}, {'{Y}{m}{d}'})
          </label>
          <input
            type="text"
            id="logFilePath"
            name="logFilePath"
            defaultValue={initialSettings.logFilePath}
            placeholder="/var/log/rhymix/debug_{date}.log"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>
      </div>

      {/* REQ-ADMIN2-117/159: 디버그 정보 표시 대상 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">디버그 정보 표시 대상</h3>
        <div className="space-y-2">
          {[
            { value: 'admin_only', label: '관리자에게만' },
            { value: 'allowed_ips', label: '지정 IP의 방문자에게만' },
            { value: 'all', label: '모두에게' },
          ].map((target) => (
            <div key={target.value} className="flex items-center">
              <input
                type="radio"
                id={`displayTarget-${target.value}`}
                name="displayTarget"
                value={target.value}
                defaultChecked={initialSettings.displayTarget === target.value}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor={`displayTarget-${target.value}`} className="ml-2 block text-sm text-gray-900">
                {target.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* REQ-ADMIN2-159: 허용 IP 목록 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">디버그 허용 IP 목록</h3>
        <div>
          <label htmlFor="allowedIps" className="block text-sm font-medium text-gray-700">
            IP 주소 (한 줄에 하나씩)
          </label>
          <textarea
            id="allowedIps"
            name="allowedIps"
            rows={4}
            defaultValue={initialSettings.allowedIps.join('\n')}
            placeholder="192.168.1.100&#10;10.0.0.1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>
      </div>

      {/* REQ-ADMIN2-160: 쿼리 진단 옵션 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">쿼리 진단 옵션</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="addQueryComment"
              name="addQueryComment"
              defaultChecked={initialSettings.addQueryComment}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="addQueryComment" className="ml-2 block text-sm text-gray-900">
              쿼리에 주석(쿼리명+IP) 추가
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showFullCallStack"
              name="showFullCallStack"
              defaultChecked={initialSettings.showFullCallStack}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="showFullCallStack" className="ml-2 block text-sm text-gray-900">
              쿼리 콜 스택 전체 표시
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="deduplicateErrors"
              name="deduplicateErrors"
              defaultChecked={initialSettings.deduplicateErrors}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="deduplicateErrors" className="ml-2 block text-sm text-gray-900">
              동일 위치 반복 오류/쿼리 중복 정리
            </label>
          </div>
        </div>
      </div>

      {/* REQ-ADMIN2-160: 에러 로그 기록 수준 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">에러 로그 기록 수준</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="radio"
              id="errorLogLevel_critical_only"
              name="errorLogLevel"
              value="critical_only"
              defaultChecked={initialSettings.errorLogLevel === 'critical_only'}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="errorLogLevel_critical_only" className="ml-2 block text-sm text-gray-900">
              치명적인 에러만 기록 (기본값)
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="errorLogLevel_all_errors_warnings"
              name="errorLogLevel"
              value="all_errors_warnings"
              defaultChecked={initialSettings.errorLogLevel === 'all_errors_warnings'}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="errorLogLevel_all_errors_warnings" className="ml-2 block text-sm text-gray-900">
              모든 에러와 경고를 기록
            </label>
          </div>
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
