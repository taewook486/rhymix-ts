'use client';
/**
 * 고급 설정 폼 (Client Component) — SPEC-ADMIN-002 Slice 2D (REQ-ADMIN2-116/157/158).
 */
import { useState } from 'react';
import { useActionState } from 'react';
import { updateAdvancedSettingsAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

type TabType = 'routing' | 'localization' | 'performance';

export function AdvancedSettingsForm({
  initialRouting,
  initialLocalization,
  initialPerformance,
}: {
  initialRouting: {
    siteTimezone: string;
    defaultLanguage: string;
    cacheDriver: 'file' | 'redis' | 'memcached';
  };
  initialLocalization: {
    shortUrlPolicy: 'disabled' | 'xe_compat' | 'all';
    mobileViewEnabled: boolean;
    tabletAsMobile: boolean;
    autoLanguageSelection: boolean;
    supportedLanguages: string[];
    defaultLanguage: string;
    mobileViewport: string;
  };
  initialPerformance: {
    sessionDbUse: boolean;
    sessionDelayStart: boolean;
    templateCacheDelay: boolean;
    thumbnailTarget: 'attached' | 'all' | 'none';
    thumbnailMethod: 'gd' | 'imagick' | 'none';
    cacheEnabled: boolean;
    cacheDefaultTtl: number;
    cacheDeleteMethod: 'folder' | 'content';
    cacheControlOptions: string[];
    adminLayout: 'module' | 'admin';
    jsCompressionPolicy: 'none' | 'common' | 'all';
    jsMergePolicy: 'none' | 'css' | 'js' | 'both';
    cssCompressionPolicy: 'none' | 'common' | 'all';
    cssMergePolicy: 'none' | 'css' | 'js' | 'both';
    jqueryVersion: '2.2.4' | '3.7.1';
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateAdvancedSettingsAction,
    initialActionState,
  );
  const [activeTab, setActiveTab] = useState<TabType>('routing');

  const SUPPORTED_LANGUAGES = [
    { code: 'ko', name: '한국어' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'zh-CN', name: '简体中文' },
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ru', name: 'Русский' },
    { code: 'pt', name: 'Português' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'th', name: 'ไทย' },
    { code: 'id', name: 'Bahasa Indonesia' },
  ];

  return (
    <form action={formAction} className="space-y-6 max-w-4xl">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      {/* 탭 네비게이션 */}
      <div className="border-b">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('routing')}
            className={`${
              activeTab === 'routing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            라우팅
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('localization')}
            className={`${
              activeTab === 'localization'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            지역화
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`${
              activeTab === 'performance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            성능/캐시
          </button>
        </nav>
      </div>

      {/* 라우팅 탭 */}
      {activeTab === 'routing' && (
        <div className="space-y-6">
          <div className="border rounded bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">기본 라우팅 설정 (REQ-ADMIN2-116)</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="siteTimezone" className="block text-sm font-medium mb-1">
                  사이트 시간대
                </label>
                <input
                  id="siteTimezone"
                  name="siteTimezone"
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialRouting.siteTimezone}
                  placeholder="Asia/Seoul"
                />
                <p className="text-sm text-gray-500 mt-1">
                  PHP timezone 문자열 (예: Asia/Seoul, America/New_York).
                </p>
              </div>

              <div>
                <label htmlFor="defaultLanguage_routing" className="block text-sm font-medium mb-1">
                  기본 언어
                </label>
                <select
                  id="defaultLanguage_routing"
                  name="defaultLanguage"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialRouting.defaultLanguage}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="cacheDriver" className="block text-sm font-medium mb-1">
                  캐시 드라이버
                </label>
                <select
                  id="cacheDriver"
                  name="cacheDriver"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialRouting.cacheDriver}
                >
                  <option value="file">파일</option>
                  <option value="redis">Redis</option>
                  <option value="memcached">Memcached</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 지역화 탭 */}
      {activeTab === 'localization' && (
        <div className="space-y-6">
          <div className="border rounded bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">라우팅 및 모바일 (REQ-ADMIN2-157)</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="shortUrlPolicy" className="block text-sm font-medium mb-1">
                  짧은 주소 사용 정책
                </label>
                <select
                  id="shortUrlPolicy"
                  name="shortUrlPolicy"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialLocalization.shortUrlPolicy}
                >
                  <option value="disabled">사용안함</option>
                  <option value="xe_compat">XE 호환 주소만</option>
                  <option value="all">모든 주소 형태</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="mobileViewEnabled"
                    className="rounded mr-2"
                    defaultChecked={initialLocalization.mobileViewEnabled}
                  />
                  <span className="text-sm">모바일 뷰 사용</span>
                </label>
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="tabletAsMobile"
                    className="rounded mr-2"
                    defaultChecked={initialLocalization.tabletAsMobile}
                  />
                  <span className="text-sm">태블릿을 모바일로 취급</span>
                </label>
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="autoLanguageSelection"
                    className="rounded mr-2"
                    defaultChecked={initialLocalization.autoLanguageSelection}
                  />
                  <span className="text-sm">언어 자동 선택</span>
                </label>
              </div>

              <div>
                <label htmlFor="defaultLanguage_loc" className="block text-sm font-medium mb-1">
                  기본 언어
                </label>
                <select
                  id="defaultLanguage_loc"
                  name="defaultLanguage"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialLocalization.defaultLanguage}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  지원 언어 (다중 선택)
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <label key={lang.code} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        name="supportedLanguages"
                        value={lang.code}
                        className="rounded mr-2"
                        defaultChecked={initialLocalization.supportedLanguages.includes(lang.code)}
                      />
                      {lang.name}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="mobileViewport" className="block text-sm font-medium mb-1">
                  모바일 Viewport 설정
                </label>
                <input
                  id="mobileViewport"
                  name="mobileViewport"
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialLocalization.mobileViewport}
                  placeholder="width=device-width, initial-scale=1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 성능/캐시 탭 */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="border rounded bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">성능 설정 (REQ-ADMIN2-158)</h2>

            <div className="space-y-4">
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="sessionDbUse"
                    className="rounded mr-2"
                    defaultChecked={initialPerformance.sessionDbUse}
                  />
                  <span className="text-sm">인증 세션 DB 사용</span>
                </label>
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="sessionDelayStart"
                    className="rounded mr-2"
                    defaultChecked={initialPerformance.sessionDelayStart}
                  />
                  <span className="text-sm">세션 시작 지연</span>
                </label>
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="templateCacheDelay"
                    className="rounded mr-2"
                    defaultChecked={initialPerformance.templateCacheDelay}
                  />
                  <span className="text-sm">템플릿 변환 지연</span>
                </label>
              </div>

              <div>
                <label htmlFor="thumbnailTarget" className="block text-sm font-medium mb-1">
                  썸네일 생성 대상
                </label>
                <select
                  id="thumbnailTarget"
                  name="thumbnailTarget"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialPerformance.thumbnailTarget}
                >
                  <option value="attached">첨부 이미지만</option>
                  <option value="all">모든 이미지</option>
                  <option value="none">생성 안 함</option>
                </select>
              </div>

              <div>
                <label htmlFor="thumbnailMethod" className="block text-sm font-medium mb-1">
                  썸네일 생성 방식
                </label>
                <select
                  id="thumbnailMethod"
                  name="thumbnailMethod"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialPerformance.thumbnailMethod}
                >
                  <option value="gd">GD</option>
                  <option value="imagick">ImageMagick</option>
                  <option value="none">없음</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border rounded bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">캐시 설정 (REQ-ADMIN2-158)</h2>

            <div className="space-y-4">
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="cacheEnabled"
                    className="rounded mr-2"
                    defaultChecked={initialPerformance.cacheEnabled}
                  />
                  <span className="text-sm">캐시 사용</span>
                </label>
              </div>

              <div>
                <label htmlFor="cacheDefaultTtl" className="block text-sm font-medium mb-1">
                  기본 TTL (초)
                </label>
                <input
                  id="cacheDefaultTtl"
                  name="cacheDefaultTtl"
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialPerformance.cacheDefaultTtl}
                  min={0}
                  max={86400}
                />
              </div>

              <div>
                <label htmlFor="cacheDeleteMethod" className="block text-sm font-medium mb-1">
                  캐시 삭제 방식
                </label>
                <select
                  id="cacheDeleteMethod"
                  name="cacheDeleteMethod"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialPerformance.cacheDeleteMethod}
                >
                  <option value="folder">폴더 삭제</option>
                  <option value="content">내용만 삭제</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  HTTP Cache-Control 옵션 (다중 선택)
                </label>
                <div className="space-y-2 mt-2">
                  {(['no-cache', 'no-store', 'must-revalidate'] as const).map((option) => (
                    <label key={option} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        name="cacheControlOptions"
                        value={option}
                        className="rounded mr-2"
                        defaultChecked={initialPerformance.cacheControlOptions.includes(option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="adminLayout" className="block text-sm font-medium mb-1">
                  관리자 화면 표시 레이아웃
                </label>
                <select
                  id="adminLayout"
                  name="adminLayout"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialPerformance.adminLayout}
                >
                  <option value="module">해당 모듈 레이아웃</option>
                  <option value="admin">관리자 레이아웃</option>
                </select>
              </div>

              <div>
                <label htmlFor="jsCompressionPolicy" className="block text-sm font-medium mb-1">
                  JS 압축 정책
                </label>
                <select
                  id="jsCompressionPolicy"
                  name="jsCompressionPolicy"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialPerformance.jsCompressionPolicy}
                >
                  <option value="none">압축 안 함</option>
                  <option value="common">공통 파일만</option>
                  <option value="all">모든 파일</option>
                </select>
                <p className="text-sm text-orange-600 mt-1">
                  ⚠️ 정책 미적용 (안내 표시만)
                </p>
              </div>

              <div>
                <label htmlFor="cssCompressionPolicy" className="block text-sm font-medium mb-1">
                  CSS 압축 정책
                </label>
                <select
                  id="cssCompressionPolicy"
                  name="cssCompressionPolicy"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialPerformance.cssCompressionPolicy}
                >
                  <option value="none">압축 안 함</option>
                  <option value="common">공통 파일만</option>
                  <option value="all">모든 파일</option>
                </select>
                <p className="text-sm text-orange-600 mt-1">
                  ⚠️ 정책 미적용 (안내 표시만)
                </p>
              </div>

              <div>
                <label htmlFor="jsMergePolicy" className="block text-sm font-medium mb-1">
                  JS/CSS 병합 정책
                </label>
                <select
                  id="jsMergePolicy"
                  name="jsMergePolicy"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialPerformance.jsMergePolicy}
                >
                  <option value="none">합치지 않음</option>
                  <option value="css">CSS만</option>
                  <option value="js">JS만</option>
                  <option value="both">CSS+JS</option>
                </select>
                <p className="text-sm text-orange-600 mt-1">
                  ⚠️ 정책 미적용 (안내 표시만)
                </p>
              </div>

              <div>
                <label htmlFor="jqueryVersion" className="block text-sm font-medium mb-1">
                  jQuery 버전
                </label>
                <select
                  id="jqueryVersion"
                  name="jqueryVersion"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={initialPerformance.jqueryVersion}
                >
                  <option value="2.2.4">2.2.4</option>
                  <option value="3.7.1">3.7.1</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

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
