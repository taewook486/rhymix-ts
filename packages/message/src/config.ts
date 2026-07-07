/**
 * Message system configuration
 *
 * SPEC-MESSAGE-001 REQ-MSG-005: 관리자 설정 (쪽지 시스템 활성화/비활성화)
 */

export interface MessageConfig {
  enabled: boolean;
  maxContentLength: number;
  maxSubjectLength: number;
  messagePerPage: number;
}

export const defaultMessageConfig: MessageConfig = {
  enabled: true,
  maxContentLength: 2000,
  maxSubjectLength: 200,
  messagePerPage: 20,
};
