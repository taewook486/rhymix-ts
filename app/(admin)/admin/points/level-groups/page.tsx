'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save, Link2, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  getLevelGroupMapping,
  updateLevelGroupMapping,
  getLevelGroups,
  updateLevelGroup,
  getGroupsList,
  type LevelGroupMapping,
  type LevelGroup,
  type Group,
} from '@/app/actions/admin/level-group-mapping'
import {
  type LevelGroupMappingFormData,
  type LevelGroupFormData,
  levelGroupMappingUpdateSchema,
} from '@/lib/validations/point-settings'

interface LevelGroupState {
  [level: number]: string | null
}

export function LevelGroupsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isSavingMappings, setIsSavingMappings] = useState(false)

  // Mapping settings state
  const [mappingSettings, setMappingSettings] = useState<LevelGroupMappingFormData>({
    group_sync_mode: 'replace',
    point_decrease_mode: 'keep',
  })

  // Level-group assignments state
  const [levelGroups, setLevelGroups] = useState<LevelGroupState>({})
  const [originalLevelGroups, setOriginalLevelGroups] = useState<LevelGroupState>({})
  const [hasMappingChanges, setHasMappingChanges] = useState(false)

  // Available groups for dropdown
  const [groups, setGroups] = useState<Group[]>([])

  // Max level from settings (default 30)
  const maxLevel = 30

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch in parallel
        const [mappingResult, levelGroupsResult, groupsResult] = await Promise.all([
          getLevelGroupMapping(),
          getLevelGroups(),
          getGroupsList(),
        ])

        // Process mapping settings
        if (mappingResult.success && mappingResult.data) {
          setMappingSettings({
            group_sync_mode: mappingResult.data.group_sync_mode,
            point_decrease_mode: mappingResult.data.point_decrease_mode,
          })
        }

        // Process level groups
        if (levelGroupsResult.success && levelGroupsResult.data) {
          const lg: LevelGroupState = {}
          levelGroupsResult.data.forEach((item) => {
            lg[item.level] = item.group_id
          })
          setLevelGroups(lg)
          setOriginalLevelGroups({ ...lg })
        }

        // Process groups list
        if (groupsResult.success && groupsResult.data) {
          setGroups(groupsResult.data)
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '오류',
          description: error instanceof Error ? error.message : '데이터를 불러오는데 실패했습니다.',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  // Debounced save for settings
  const debouncedSaveSettings = useCallback(
    debounce(async (data: LevelGroupMappingFormData) => {
      setIsSavingSettings(true)
      try {
        const result = await updateLevelGroupMapping(data)

        if (result.success) {
          toast({
            title: '성공',
            description: result.message || '설정이 저장되었습니다.',
          })
          router.refresh()
        } else {
          throw new Error(result.error || '설정 저장에 실패했습니다.')
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '오류',
          description: error instanceof Error ? error.message : '설정 저장에 실패했습니다.',
        })
      } finally {
        setIsSavingSettings(false)
      }
    }, 500),
    [toast, router]
  )

  // Update mapping setting
  const updateMappingSetting = <K extends keyof LevelGroupMappingFormData>(
    key: K,
    value: LevelGroupMappingFormData[K]
  ) => {
    const newSettings = { ...mappingSettings, [key]: value }
    setMappingSettings(newSettings)
    debouncedSaveSettings(newSettings)
  }

  // Update level group assignment
  const updateLevelGroupAssignment = (level: number, groupId: string | null) => {
    setLevelGroups((prev) => {
      const updated = { ...prev, [level]: groupId }
      // Check for changes
      const hasChanges = Object.keys(updated).some(
        (lvl) => updated[parseInt(lvl)] !== originalLevelGroups[parseInt(lvl)]
      )
      setHasMappingChanges(hasChanges)
      return updated
    })
  }

  // Batch save level-group mappings
  const handleSaveMappings = async () => {
    setIsSavingMappings(true)
    try {
      // Find changed levels
      const changedLevels: { level: number; groupId: string | null }[] = []
      for (let level = 1; level <= maxLevel; level++) {
        if (levelGroups[level] !== originalLevelGroups[level]) {
          changedLevels.push({
            level,
            groupId: levelGroups[level],
          })
        }
      }

      if (changedLevels.length === 0) {
        toast({
          title: '알림',
          description: '변경된 내용이 없습니다.',
        })
        return
      }

      // Update each changed level
      let successCount = 0
      for (const { level, groupId } of changedLevels) {
        const result = await updateLevelGroup(level, groupId)
        if (result.success) {
          successCount++
        }
      }

      if (successCount === changedLevels.length) {
        toast({
          title: '성공',
          description: `${successCount}개의 레벨 그룹 할당이 저장되었습니다.`,
        })
        setHasMappingChanges(false)
        setOriginalLevelGroups({ ...levelGroups })
        router.refresh()
      } else {
        toast({
          variant: 'destructive',
          title: '일부 실패',
          description: `${successCount}/${changedLevels.length}개의 할당이 저장되었습니다.`,
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: error instanceof Error ? error.message : '저장에 실패했습니다.',
      })
    } finally {
      setIsSavingMappings(false)
    }
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
          <h1 className="text-2xl font-bold">레벨-그룹 연동</h1>
          <p className="text-muted-foreground">회원 레벨에 따른 그룹 자동 할당을 설정합니다</p>
        </div>
        {isSavingSettings && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            설정 저장 중...
          </div>
        )}
      </div>

      {/* Section 1: Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            연동 설정
          </CardTitle>
          <CardDescription>레벨과 그룹 간의 연동 방식을 설정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Group Sync Mode */}
          <div className="space-y-2">
            <Label htmlFor="group_sync_mode">그룹 연동 방식</Label>
            <Select
              value={mappingSettings.group_sync_mode}
              onValueChange={(value) =>
                updateMappingSetting('group_sync_mode', value as 'replace' | 'add')
              }
            >
              <SelectTrigger id="group_sync_mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replace">대체 (기존 그룹 제거 후 새 그룹 할당)</SelectItem>
                <SelectItem value="add">추가 (기존 그룹 유지하며 새 그룹 추가)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              레벨 변경 시 그룹을 어떻게 처리할지 선택합니다
            </p>
          </div>

          {/* Point Decrease Mode */}
          <div className="space-y-2">
            <Label htmlFor="point_decrease_mode">포인트 감소 시 처리</Label>
            <Select
              value={mappingSettings.point_decrease_mode}
              onValueChange={(value) =>
                updateMappingSetting('point_decrease_mode', value as 'keep' | 'demote')
              }
            >
              <SelectTrigger id="point_decrease_mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep">유지 (현재 그룹 유지)</SelectItem>
                <SelectItem value="demote">강등 (레벨에 맞는 그룹으로 변경)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              포인트가 감소하여 레벨이 내려갈 때 그룹 처리 방식을 선택합니다
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Level-Group Mappings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                레벨별 그룹 할당
              </CardTitle>
              <CardDescription>각 레벨에 할당할 그룹을 선택합니다</CardDescription>
            </div>
            <Button
              onClick={handleSaveMappings}
              disabled={isSavingMappings || !hasMappingChanges}
              size="sm"
            >
              {isSavingMappings ? (
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
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {Array.from({ length: maxLevel }, (_, i) => i + 1).map((level) => (
              <div key={level} className="space-y-2">
                <Label htmlFor={`level-${level}`} className="flex items-center gap-2">
                  <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                    Lv.{level}
                  </span>
                </Label>
                <Select
                  value={levelGroups[level] || 'none'}
                  onValueChange={(value) =>
                    updateLevelGroupAssignment(level, value === 'none' ? null : value)
                  }
                >
                  <SelectTrigger id={`level-${level}`}>
                    <SelectValue placeholder="그룹 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">없음</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LevelGroupsPage

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}
