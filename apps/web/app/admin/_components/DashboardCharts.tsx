/**
 * 대시보드 차트 컴포넌트들 — SPEC-STATS-001 REQ-STATS-003.
 *
 * Recharts 기반 시각화:
 * - 최근 30일 방문자(UV/PV) 라인 차트
 * - 최근 7일 신규 콘텐츠(게시물/댓글/회원) 바 차트
 *
 * @MX:SPEC: SPEC-STATS-001 REQ-STATS-003
 */
'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface VisitorDataPoint {
  date: string;
  uniqueVisitors: number;
  pageViews: number;
}

interface VisitorChartProps {
  data: VisitorDataPoint[];
  error?: boolean;
}

/**
 * 방문자 차트 - 최근 30일 UV/PV 라인 차트
 * - REQ-STATS-003: Recharts 사용, tRPC로 데이터 조회
 */
export function VisitorChart({ data, error }: VisitorChartProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">방문자 추이</h3>
        <p className="text-sm text-red-600">
          ⚠️ 차트 데이터를 불러오지 못했습니다.
        </p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">방문자 추이 (최근 30일)</h3>
        <p className="text-sm text-zinc-500">데이터가 없습니다.</p>
      </div>
    );
  }

  // 날짜 포맷 (MM-DD)
  const formattedData = data.map(item => ({
    ...item,
    date: item.date.substring(5), // MM-DD
  }));

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6">
      <h3 className="text-sm font-semibold text-zinc-700 mb-4">방문자 추이 (최근 30일)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData.reverse()}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            interval={Math.ceil(data.length / 10)}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
            labelStyle={{ color: '#666' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="uniqueVisitors"
            stroke="#3b82f6"
            name="순방문자(UV)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="pageViews"
            stroke="#10b981"
            name="페이지뷰(PV)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface NewContentDataPoint {
  date: string;
  newDocuments: number;
  newComments: number;
  newMembers: number;
}

interface NewContentChartProps {
  data: NewContentDataPoint[];
  error?: boolean;
}

/**
 * 신규 콘텐츠 차트 - 최근 7일 게시물/댓글/회원 바 차트
 * - REQ-STATS-003: Recharts 사용
 */
export function NewContentChart({ data, error }: NewContentChartProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">신규 콘텐츠</h3>
        <p className="text-sm text-red-600">
          ⚠️ 차트 데이터를 불러오지 못했습니다.
        </p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-4">신규 콘텐츠 (최근 7일)</h3>
        <p className="text-sm text-zinc-500">데이터가 없습니다.</p>
      </div>
    );
  }

  // 날짜 포맷 (MM-DD)
  const formattedData = data.map(item => ({
    ...item,
    date: item.date.substring(5), // MM-DD
  }));

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6">
      <h3 className="text-sm font-semibold text-zinc-700 mb-4">신규 콘텐츠 (최근 7일)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formattedData.reverse()}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
            labelStyle={{ color: '#666' }}
          />
          <Legend />
          <Bar dataKey="newDocuments" fill="#3b82f6" name="게시물" />
          <Bar dataKey="newComments" fill="#10b981" name="댓글" />
          <Bar dataKey="newMembers" fill="#f59e0b" name="회원" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
