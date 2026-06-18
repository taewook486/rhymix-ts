'use client';
/**
 * 파일 설정 폼 (Client Component) — SPEC-ADMIN-002 Slice 2B (REQ-ADMIN2-080, REQ-ADMIN2-081).
 */
import { useActionState } from 'react';
import { updateUploadSettingsAction, updateDownloadSettingsAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

export function FileSettingsForm({
  initialUpload,
  initialDownload,
}: {
  initialUpload: {
    allowedExtensions: string[];
    maxFileSize: number;
    maxAttachmentsPerPost: number;
    imageAutoResize: { width: number; height: number };
  };
  initialDownload: {
    downloadPermission: 'unlimited' | 'member_only' | 'point_deduction';
    pointDeduction?: number;
    hotlinkProtection: boolean;
  };
}) {
  const [uploadState, uploadAction, isUploadPending] = useActionState(
    updateUploadSettingsAction,
    initialActionState,
  );

  const [downloadState, downloadAction, isDownloadPending] = useActionState(
    updateDownloadSettingsAction,
    initialActionState,
  );

  return (
    <div className="space-y-6">
      {/* 업로드 설정 */}
      <form action={uploadAction} className="border rounded bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">업로드 설정</h2>

        {uploadState.error && (
          <p className="text-sm text-red-600 mb-4" role="alert">
            {uploadState.error}
          </p>
        )}

        {uploadState.success && (
          <p className="text-sm text-green-600 mb-4" role="status">
            업로드 설정이 저장되었습니다.
          </p>
        )}

        <div className="space-y-4 max-w-2xl">
          <div>
            <label htmlFor="allowedExtensions" className="block text-sm font-medium mb-1">
              허용 확장자
            </label>
            <input
              id="allowedExtensions"
              name="allowedExtensions"
              type="text"
              className="w-full border rounded px-3 py-2"
              defaultValue={initialUpload.allowedExtensions.join(', ')}
              placeholder="jpg, png, gif, jpeg, webp"
            />
            <p className="text-sm text-gray-500 mt-1">콤마로 구분하여 입력하세요.</p>
          </div>

          <div>
            <label htmlFor="maxFileSize" className="block text-sm font-medium mb-1">
              최대 파일 크기 (바이트)
            </label>
            <input
              id="maxFileSize"
              name="maxFileSize"
              type="number"
              className="w-full border rounded px-3 py-2"
              defaultValue={initialUpload.maxFileSize}
              min={1024}
              max={1073741824}
            />
            <p className="text-sm text-gray-500 mt-1">
              현재: {(initialUpload.maxFileSize / 1024 / 1024).toFixed(1)} MB (최대 1GB)
            </p>
          </div>

          <div>
            <label htmlFor="maxAttachmentsPerPost" className="block text-sm font-medium mb-1">
              게시물당 최대 첨부 수
            </label>
            <input
              id="maxAttachmentsPerPost"
              name="maxAttachmentsPerPost"
              type="number"
              className="w-full border rounded px-3 py-2"
              defaultValue={initialUpload.maxAttachmentsPerPost}
              min={1}
              max={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="resizeWidth" className="block text-sm font-medium mb-1">
                이미지 자동 리사이즈 너비
              </label>
              <input
                id="resizeWidth"
                name="resizeWidth"
                type="number"
                className="w-full border rounded px-3 py-2"
                defaultValue={initialUpload.imageAutoResize.width}
                min={100}
                max={4096}
              />
            </div>

            <div>
              <label htmlFor="resizeHeight" className="block text-sm font-medium mb-1">
                이미지 자동 리사이즈 높이
              </label>
              <input
                id="resizeHeight"
                name="resizeHeight"
                type="number"
                className="w-full border rounded px-3 py-2"
                defaultValue={initialUpload.imageAutoResize.height}
                min={100}
                max={4096}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={isUploadPending}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isUploadPending ? '저장 중...' : '업로드 설정 저장'}
            </button>
          </div>
        </div>
      </form>

      {/* 다운로드 설정 */}
      <form action={downloadAction} className="border rounded bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">다운로드 설정</h2>

        {downloadState.error && (
          <p className="text-sm text-red-600 mb-4" role="alert">
            {downloadState.error}
          </p>
        )}

        {downloadState.success && (
          <p className="text-sm text-green-600 mb-4" role="status">
            다운로드 설정이 저장되었습니다.
          </p>
        )}

        <div className="space-y-4 max-w-2xl">
          <div>
            <label htmlFor="downloadPermission" className="block text-sm font-medium mb-1">
              다운로드 권한 정책
            </label>
            <select
              id="downloadPermission"
              name="downloadPermission"
              className="w-full border rounded px-3 py-2"
              defaultValue={initialDownload.downloadPermission}
            >
              <option value="unlimited">무제한</option>
              <option value="member_only">회원만</option>
              <option value="point_deduction">포인트 차감</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              {initialDownload.downloadPermission === 'point_deduction'
                ? '포인트 차감 시 다운로드마다 지정된 포인트를 차감합니다.'
                : '선택된 정책에 따라 다운로드를 제한합니다.'}
            </p>
          </div>

          {initialDownload.downloadPermission === 'point_deduction' && (
            <div>
              <label htmlFor="pointDeduction" className="block text-sm font-medium mb-1">
                차감 포인트
              </label>
              <input
                id="pointDeduction"
                name="pointDeduction"
                type="number"
                className="w-full border rounded px-3 py-2"
                defaultValue={initialDownload.pointDeduction || 0}
                min={0}
                max={1000}
              />
              <p className="text-sm text-gray-500 mt-1">다운로드 시 차감할 포인트 (0~1000)</p>
            </div>
          )}

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="hotlinkProtection"
                className="rounded mr-2"
                defaultChecked={initialDownload.hotlinkProtection}
              />
              <span className="text-sm font-medium">핫링크 보안</span>
            </label>
            <p className="text-sm text-gray-500 ml-4">
              외부 사이트에서의 직접 링크를 차단합니다.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={isDownloadPending}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isDownloadPending ? '저장 중...' : '다운로드 설정 저장'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
