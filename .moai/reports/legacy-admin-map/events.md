# 레거시 관리자 이벤트 → 서버 호출 대응표

- 핸들러 함수: 22종 (화면 164개에서 수집)
- 서버 대상 확인: 11종 / 폼 제출: 1종 / 미해결: 10종
- 레거시 소스: /mnt/d/project/rhymix (JS 556개, 함수 1090개 색인)

## 서버 호출이 확인된 핸들러

| 핸들러 | 사용 | 서버 대상 | 정의 위치 |
|---|---:|---|---|
| `doClearSession` | 159 | `session.procSessionAdminClear` | modules/session/tpl/js/session.js |
| `doResetAdminMenu` | 158 | `admin.procAdminMenuReset` | modules/admin/tpl/js/config.js |
| `doRecompileCacheFile` | 158 | `admin.procAdminRecompileCacheFile` | modules/admin/tpl/js/config.js |
| `doUpdateDeniedID` | 38 | `member.procMemberAdminUpdateDeniedID` | modules/member/tpl/js/signup_config.js |
| `doToggleFavoriteModule` | 32 | `admin.procAdminToggleFavorite` | modules/module/tpl/js/module_admin.js |
| `doUpdateModule` | 28 | `install.procInstallAdminUpdate` | modules/admin/tpl/js/admin.js |
| `doCancelDeclare` | 6 | `comment.procCommentAdminCancelDeclare` | modules/comment/tpl/js/comment_admin.js |
| `doReloadTreeCategory` | 3 | `document.procDocumentMakeXmlFile` | modules/document/tpl/js/document_category.js |
| `getFileList` | 2 | `file.procFileGetList` | modules/file/tpl/js/file_admin.js |
| `doDeleteAllThumbnail` | 1 | `document.procDocumentAdminDeleteAllThumbnail` | modules/document/tpl/js/document_admin.js |
| `doPointRecal` | 1 | `point.procPointAdminApplyPoint` | modules/point/tpl/js/point_admin.js |

## 폼 제출로 동작하는 핸들러 (대상은 폼의 act)

| 핸들러 | 사용 | 정의 위치 |
|---|---:|---|
| `doSubmitConfig` | 3 | modules/layout/tpl/js/layout_modify.js |

## 미해결 — 정의를 찾지 못했거나 서버 호출이 없는 핸들러

| 핸들러 | 사용 | 정의 위치 |
|---|---:|---|
| `doChangeLangType` | 158 | common/js/common.js |
| `popopen` | 33 | common/js/common.js |
| `deleteImage` | 13 | modules/layout/tpl/js/layout_modify.js |
| `doInsertAdmin` | 6 | modules/module/tpl/js/module_admin.js |
| `doDeleteAdmin` | 6 | modules/module/tpl/js/module_admin.js |
| `addLayoutCopyInputbox` | 3 | modules/layout/tpl/js/layout_admin.js |
| `close` | 3 | (정의 못 찾음) |
| `addRow` | 2 | common/js/plugins/filebox/filebox.js |
| `clearRow` | 2 | common/js/plugins/filebox/filebox.js |
| `go` | 1 | (정의 못 찾음) |
