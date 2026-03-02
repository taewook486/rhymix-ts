'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  getPointRules,
  updatePointRulesBatch,
  type PointRule,
  type PointRuleBatchUpdate,
} from '@/app/actions/admin/point-rules'
import {
  type PointRuleFormData,
  pointRuleUpdateSchema,
} from '@/lib/validations/point-settings'

// Rule categories for grouping
const RULE_CATEGORIES = {
  member: {
    label: '회원',
    actions: ['signup', 'login', 'profile_update', 'password_change'],
  },
  content: {
    label: '콘텐츠',
    actions: ['document_insert', 'document_update', 'document_delete', 'comment_insert', 'comment_delete'],
  },
  file: {
    label: '파일',
    actions: ['file_upload', 'file_download'],
  },
  vote: {
    label: '추천/비추천',
    actions: ['vote_up', 'vote_down', 'voted_up', 'voted_down'],
  },
} as const

type CategoryKey = keyof typeof RULE_CATEGORIES

interface RuleFormData {
  [key: string]: PointRuleFormData
}

export function PointRulesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [rules, setRules] = useState<PointRule[]>([])
  const [editedRules, setEditedRules] = useState<RuleFormData>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch initial rules
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const result = await getPointRules()

        if (result.success && result.data) {
          setRules(result.data)
          // Initialize edited rules with current values
          const initialEdited: RuleFormData = {}
          result.data.forEach((rule) => {
            initialEdited[rule.id] = {
              name: rule.name,
              description: rule.description,
              point: rule.point,
              revert_on_delete: rule.revert_on_delete,
              daily_limit: rule.daily_limit,
              per_content_limit: rule.per_content_limit,
              except_notice: rule.except_notice,
              except_admin: rule.except_admin,
              is_active: rule.is_active,
            }
          })
          setEditedRules(initialEdited)
        } else {
          throw new Error(result.error || '규칙을 불러오는데 실패했습니다.')
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '오류',
          description: error instanceof Error ? error.message : '규칙을 불러오는데 실패했습니다.',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchRules()
  }, [toast])

  // Update edited rule
  const updateEditedRule = useCallback((ruleId: string, field: keyof PointRuleFormData, value: any) => {
    setEditedRules((prev) => {
      const updated = {
        ...prev,
        [ruleId]: {
          ...prev[ruleId],
          [field]: value,
        },
      }

      // Check if any changes exist
      const rule = rules.find((r) => r.id === ruleId)
      if (rule) {
        const hasChanged = Object.keys(updated[ruleId]).some(
          (key) => updated[ruleId][key as keyof PointRuleFormData] !== rule[key as keyof PointRule]
        )
        setHasChanges(hasChanged)
      }

      return updated
    })
  }, [rules])

  // Batch save all changes
  const handleBatchSave = async () => {
    setIsSaving(true)
    try {
      // Find changed rules
      const changedRules: PointRuleBatchUpdate[] = []
      rules.forEach((rule) => {
        const edited = editedRules[rule.id]
        if (edited) {
          const hasChanged = Object.keys(edited).some(
            (key) => edited[key as keyof PointRuleFormData] !== rule[key as keyof PointRule]
          )
          if (hasChanged) {
            changedRules.push({
              id: rule.id,
              data: edited,
            })
          }
        }
      })

      if (changedRules.length === 0) {
        toast({
          title: '알림',
          description: '변경된 내용이 없습니다.',
        })
        return
      }

      const result = await updatePointRulesBatch(changedRules)

      if (result.success) {
        toast({
          title: '성공',
          description: result.message || `${changedRules.length}개의 규칙이 저장되었습니다.`,
        })
        setHasChanges(false)
        router.refresh()
        // Refresh rules
        const refreshResult = await getPointRules()
        if (refreshResult.success && refreshResult.data) {
          setRules(refreshResult.data)
        }
      } else {
        throw new Error(result.error || '규칙 저장에 실패했습니다.')
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: error instanceof Error ? error.message : '규칙 저장에 실패했습니다.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Group rules by category
  const getRulesByCategory = (category: CategoryKey): PointRule[] => {
    const categoryActions = RULE_CATEGORIES[category].actions
    return rules.filter((rule) => categoryActions.includes(rule.action))
  }

  // Get uncategorized rules
  const getUncategorizedRules = (): PointRule[] => {
    const allCategoryActions = Object.values(RULE_CATEGORIES).flatMap((c) => c.actions)
    return rules.filter((rule) => !allCategoryActions.includes(rule.action))
  }

  // Render rule row
  const renderRuleRow = (rule: PointRule) => {
    const edited = editedRules[rule.id] || {}

    return (
      <TableRow key={rule.id}>
        <TableCell className="font-mono text-xs">{rule.action}</TableCell>
        <TableCell>
          <Input
            value={edited.name || rule.name}
            onChange={(e) => updateEditedRule(rule.id, 'name', e.target.value)}
            className="h-8 w-40"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            value={edited.point ?? rule.point}
            onChange={(e) => updateEditedRule(rule.id, 'point', parseInt(e.target.value) || 0)}
            className="h-8 w-20"
          />
        </TableCell>
        <TableCell className="text-center">
          <Switch
            checked={edited.revert_on_delete ?? rule.revert_on_delete}
            onCheckedChange={(checked) => updateEditedRule(rule.id, 'revert_on_delete', checked)}
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            placeholder="무제한"
            value={edited.daily_limit ?? rule.daily_limit ?? ''}
            onChange={(e) =>
              updateEditedRule(rule.id, 'daily_limit', e.target.value ? parseInt(e.target.value) : null)
            }
            className="h-8 w-20"
          />
        </TableCell>
        <TableCell className="text-center">
          <Switch
            checked={edited.is_active ?? rule.is_active}
            onCheckedChange={(checked) => updateEditedRule(rule.id, 'is_active', checked)}
          />
        </TableCell>
      </TableRow>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">로딩 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">포인트 규칙</h1>
          <p className="text-muted-foreground">포인트 적립 및 차감 규칙을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="mr-2">
              변경사항 있음
            </Badge>
          )}
          <Button onClick={handleBatchSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                일괄 저장
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Rules Table by Category */}
      {(Object.keys(RULE_CATEGORIES) as CategoryKey[]).map((category) => {
        const categoryRules = getRulesByCategory(category)
        if (categoryRules.length === 0) return null

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{RULE_CATEGORIES[category].label}</CardTitle>
              <CardDescription>
                {RULE_CATEGORIES[category].label} 관련 포인트 규칙
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">액션</TableHead>
                    <TableHead className="w-44">이름</TableHead>
                    <TableHead className="w-24">포인트</TableHead>
                    <TableHead className="w-24 text-center">삭제 시 회수</TableHead>
                    <TableHead className="w-24">일일 제한</TableHead>
                    <TableHead className="w-20 text-center">활성</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryRules.map((rule) => renderRuleRow(rule))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      })}

      {/* Uncategorized Rules */}
      {getUncategorizedRules().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>기타 규칙</CardTitle>
            <CardDescription>기타 포인트 규칙</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">액션</TableHead>
                  <TableHead className="w-44">이름</TableHead>
                  <TableHead className="w-24">포인트</TableHead>
                  <TableHead className="w-24 text-center">삭제 시 회수</TableHead>
                  <TableHead className="w-24">일일 제한</TableHead>
                  <TableHead className="w-20 text-center">활성</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getUncategorizedRules().map((rule) => renderRuleRow(rule))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PointRulesPage
