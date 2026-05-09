/**
 * 환경 진단 결과 테이블 (server component, 순수 표시 컴포넌트).
 * SPEC-INSTALL-001 REQ-INSTALL-010, REQ-INSTALL-012.
 */
import type { EnvCheckReport, EnvCheckStatus } from '@rhymix-ts/core';

const STATUS_LABEL: Record<EnvCheckStatus, string> = {
  ok: 'OK',
  warn: 'WARN',
  error: 'ERROR',
};

const STATUS_CLASS: Record<EnvCheckStatus, string> = {
  ok: 'bg-green-100 text-green-800',
  warn: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
};

export interface DiagnosticsTableProps {
  report: EnvCheckReport;
}

export function DiagnosticsTable({ report }: DiagnosticsTableProps) {
  return (
    <table className="w-full border-collapse text-sm" data-testid="diagnostics-table">
      <thead>
        <tr className="border-b text-left">
          <th className="py-2 pr-4 font-semibold">항목</th>
          <th className="py-2 pr-4 font-semibold">상태</th>
          <th className="py-2 font-semibold">메시지</th>
        </tr>
      </thead>
      <tbody>
        {report.results.map((r) => (
          <tr key={r.key} className="border-b last:border-b-0">
            <td className="py-2 pr-4 font-mono text-xs">{r.key}</td>
            <td className="py-2 pr-4">
              <span
                className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[r.status]}`}
                data-status={r.status}
              >
                {STATUS_LABEL[r.status]}
              </span>
            </td>
            <td className="py-2">{r.message}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
