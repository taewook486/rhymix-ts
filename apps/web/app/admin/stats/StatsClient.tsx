/**
 * 통계 페이지 클라이언트 컴포넌트 — SPEC-STATS-001 REQ-STATS-004.
 *
 * 기간 선택, 지표 탭, 인기 게시물, CSV 내보내기 기능:
 * - 지표 선택 탭 (방문자/콘텐츠/검색어)
 * - 인기 게시물 TOP 10 테이블
 * - CSV 내보내기 버튼
 *
 * @MX:SPEC: SPEC-STATS-001 REQ-STATS-004
 */
'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@rhymix-ts/ui/components';
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
import Papa from 'papaparse';

interface StatsClientProps {
  initialVisitStats?: {
    daily: Array<{ date: string; uniqueVisitors: number; pageViews: number }>;
    summary: {
      totalUniqueVisitors: number;
      totalPagesViews: number;
      averageDailyVisitors: number;
    };
  };
  initialPopularPosts?: Array<{
    id: number;
    title: string;
    boardName: string;
    viewCount: number;
    author: string;
    regdate: Date;
  }>;
  visitStatsError?: boolean;
  popularPostsError?: boolean;
  siteId: number;
}

type MetricTab = 'visitors' | 'content' | 'keywords';

export function StatsClient({
  initialVisitStats,
  initialPopularPosts,
  visitStatsError,
  popularPostsError,
  siteId,
}: StatsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<MetricTab>('visitors');
  const [days, setDays] = useState(30);

  function setDaysParam(next: number) {
    setDays(next);
    router.push(`${pathname}?days=${next}`);
  }

  // CSV 내보내기
  function exportToCSV() {
    if (!initialVisitStats) return;

    const csvData = initialVisitStats.daily.map((day) => ({
      날짜: day.date,
      순방문자: day.uniqueVisitors,
      페이지뷰: day.pageViews,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stats_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* 기간 선택 버튼 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-600 mr-2">기간:</span>
        <Button
          variant={days === 7 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDaysParam(7)}
        >
          7일
        </Button>
        <Button
          variant={days === 30 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDaysParam(30)}
        >
          30일
        </Button>
        <Button
          variant={days === 90 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDaysParam(90)}
        >
          90일
        </Button>
        <Button
          variant={days === 365 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDaysParam(365)}
        >
          1년
        </Button>
      </div>

      {/* 지표 탭 */}
      <div className="border-b border-zinc-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('visitors')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'visitors'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            방문자
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'content'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            콘텐츠
          </button>
          <button
            onClick={() => setActiveTab('keywords')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'keywords'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            검색어
          </button>
        </nav>
      </div>

      {/* 방문자 탭 */}
      {activeTab === 'visitors' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <p className="text-sm text-zinc-500 mb-2">총 방문자</p>
              <p className="text-3xl font-bold text-zinc-900">
                {initialVisitStats?.summary.totalUniqueVisitors.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <p className="text-sm text-zinc-500 mb-2">총 페이지뷰</p>
              <p className="text-3xl font-bold text-zinc-900">
                {initialVisitStats?.summary.totalPagesViews.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <p className="text-sm text-zinc-500 mb-2">일일 평균 방문자</p>
              <p className="text-3xl font-bold text-zinc-900">
                {initialVisitStats?.summary.averageDailyVisitors.toLocaleString() || 0}
              </p>
            </div>
          </div>

          {/* CSV 내보내기 버튼 */}
          <div className="flex justify-end">
            <Button size="sm" onClick={exportToCSV} disabled={!initialVisitStats}>
              📥 CSV 내보내기
            </Button>
          </div>

          {/* Recharts 라인 차트 */}
          {visitStatsError ? (
            <div className="bg-white rounded-lg border border-red-200 p-6">
              <p className="text-sm text-red-600">
                ⚠️ 방문자 데이터를 불러오지 못했습니다.
              </p>
            </div>
          ) : initialVisitStats && initialVisitStats.daily.length > 0 ? (
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <h3 className="text-lg font-semibold mb-4">일별 방문자 추이</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={initialVisitStats.daily.map((d) => ({
                    ...d,
                    date: d.date.substring(5), // MM-DD
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    interval={Math.ceil(initialVisitStats.daily.length / 10)}
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
          ) : (
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <p className="text-sm text-zinc-500">표시할 데이터가 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* 콘텐츠 탭 */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {popularPostsError ? (
            <div className="bg-white rounded-lg border border-red-200 p-6">
              <p className="text-sm text-red-600">
                ⚠️ 인기 게시물 데이터를 불러오지 못했습니다.
              </p>
            </div>
          ) : initialPopularPosts && initialPopularPosts.length > 0 ? (
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <h3 className="text-lg font-semibold mb-4">인기 게시물 TOP 10</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left py-2 px-3">순위</th>
                      <th className="text-left py-2 px-3">제목</th>
                      <th className="text-left py-2 px-3">게시판</th>
                      <th className="text-right py-2 px-3">조회수</th>
                      <th className="text-left py-2 px-3">작성자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialPopularPosts.map((post, index) => (
                      <tr key={post.id} className="border-b border-zinc-100">
                        <td className="py-2 px-3 font-medium">{index + 1}</td>
                        <td className="py-2 px-3">
                          <a
                            href={`/board/${post.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {post.title}
                          </a>
                        </td>
                        <td className="py-2 px-3 text-zinc-600">{post.boardName}</td>
                        <td className="py-2 px-3 text-right font-medium">
                          {post.viewCount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-zinc-600">{post.author}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <p className="text-sm text-zinc-500">표시할 데이터가 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* 검색어 탭 */}
      {activeTab === 'keywords' && (
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <h3 className="text-lg font-semibold mb-4">인기 검색어 TOP 10</h3>
          <p className="text-sm text-zinc-500">
            검색어 통계는 SPEC-SEARCH-001에서 구현 예정입니다.
          </p>
        </div>
      )}
    </div>
  );
}
