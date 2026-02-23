'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Languages,
  Plus,
  Search,
  Download,
  Upload,
  AlertTriangle,
  Trash2,
  Edit,
  MoreHorizontal,
  RefreshCw,
  FileJson,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  getTranslations,
  getMissingTranslations,
  getTranslationStats,
  getNamespaces,
  createTranslation,
  updateTranslation,
  deleteTranslation,
  exportTranslations,
  importTranslations,
  type Translation,
  type MissingTranslation,
  type TranslationStats,
} from '@/app/actions/translations'
import { locales, localeNames, type Locale } from '@/lib/i18n/config'

// =====================================================
// Translation Editor Component
// =====================================================

function TranslationEditor({
  translation,
  onSave,
  onCancel,
}: {
  translation: Translation | null
  onSave: (data: { namespace: string; key: string; value: string }) => void
  onCancel: () => void
}) {
  const [namespace, setNamespace] = useState(translation?.namespace || 'core')
  const [key, setKey] = useState(translation?.key || '')
  const [value, setValue] = useState(translation?.value || '')
  const [langCode, setLangCode] = useState(translation?.lang_code || 'en')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lang">Language</Label>
          <Select value={langCode} onValueChange={setLangCode}>
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {locales.map((locale) => (
                <SelectItem key={locale} value={locale}>
                  {localeNames[locale]} ({locale})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="namespace">Namespace</Label>
          <Input
            id="namespace"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            placeholder="e.g., core, common, admin"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="key">Key</Label>
        <Input
          id="key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="e.g., common.welcome"
          disabled={!!translation}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="value">Value</Label>
        <Textarea
          id="value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Translation text"
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave({ namespace, key, value })} disabled={!namespace || !key || !value}>
          {translation ? 'Update' : 'Create'}
        </Button>
      </DialogFooter>
    </div>
  )
}

// =====================================================
// Import Dialog Component
// =====================================================

function ImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (data: Record<string, any>, overwrite: boolean) => void
}) {
  const [jsonText, setJsonText] = useState('')
  const [overwrite, setOverwrite] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImport = () => {
    try {
      const data = JSON.parse(jsonText)
      onImport(data, overwrite)
      setJsonText('')
      setError(null)
      onOpenChange(false)
    } catch {
      setError('Invalid JSON format')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setJsonText(event.target?.result as string)
      }
      reader.readAsText(file)
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Import Translations</DialogTitle>
        <DialogDescription>Import translations from a JSON file or paste JSON directly.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Upload File</Label>
          <Input type="file" accept=".json" onChange={handleFileUpload} />
        </div>
        <div className="space-y-2">
          <Label>Or paste JSON</Label>
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={`{
  "en": {
    "core": {
      "common.welcome": "Welcome"
    }
  }
}`}
            rows={10}
            className="font-mono text-sm"
          />
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="overwrite"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="overwrite" className="text-sm font-normal">
            Overwrite existing translations
          </Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={!jsonText}>
          Import
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

// =====================================================
// Missing Translations Tab
// =====================================================

function MissingTranslationsTab({
  missing,
  onAddMissing,
}: {
  missing: MissingTranslation[]
  onAddMissing: (namespace: string, key: string, langs: string[]) => void
}) {
  if (missing.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <p className="text-lg font-medium">All translations complete!</p>
          <p className="text-muted-foreground">No missing translations detected.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Missing Translations ({missing.length})
        </CardTitle>
        <CardDescription>These translation keys are missing in one or more languages.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namespace</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Missing Languages</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {missing.map((item, index) => (
              <TableRow key={`${item.namespace}.${item.key}-${index}`}>
                <TableCell>
                  <Badge variant="outline">{item.namespace}</Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{item.key}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.missing_langs.map((lang) => (
                      <Badge key={lang} variant="secondary" className="text-xs">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddMissing(item.namespace, item.key, item.missing_langs)}
                  >
                    Add
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// =====================================================
// Main Translations Page
// =====================================================

export default function TranslationsPage() {
  const { toast } = useToast()
  const [translations, setTranslations] = useState<Translation[]>([])
  const [missing, setMissing] = useState<MissingTranslation[]>([])
  const [stats, setStats] = useState<TranslationStats | null>(null)
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLang, setSelectedLang] = useState<string>('all')
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all')

  // Dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingTranslation, setEditingTranslation] = useState<Translation | null>(null)

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [translationsRes, missingRes, statsRes, namespacesRes] = await Promise.all([
        getTranslations({
          lang_code: selectedLang !== 'all' ? selectedLang : undefined,
          namespace: selectedNamespace !== 'all' ? selectedNamespace : undefined,
          search: searchQuery || undefined,
        }),
        getMissingTranslations(),
        getTranslationStats(),
        getNamespaces(),
      ])

      if (translationsRes.success && translationsRes.data) {
        setTranslations(translationsRes.data)
      }
      if (missingRes.success && missingRes.data) {
        setMissing(missingRes.data)
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
      }
      if (namespacesRes.success && namespacesRes.data) {
        setNamespaces(namespacesRes.data)
      }
    } catch (error) {
      console.error('Error fetching translations:', error)
      toast({
        title: 'Error',
        description: 'Failed to load translations',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [selectedLang, selectedNamespace, searchQuery, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Create translation
  const handleCreate = async (data: { namespace: string; key: string; value: string }) => {
    const result = await createTranslation({
      lang_code: selectedLang !== 'all' ? selectedLang : 'en',
      namespace: data.namespace,
      key: data.key,
      value: data.value,
    })

    if (result.success) {
      toast({ title: 'Success', description: result.message || 'Translation created' })
      setEditDialogOpen(false)
      fetchData()
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    }
  }

  // Update translation
  const handleUpdate = async (data: { namespace: string; key: string; value: string }) => {
    if (!editingTranslation) return

    const result = await updateTranslation(editingTranslation.id, { value: data.value })

    if (result.success) {
      toast({ title: 'Success', description: result.message || 'Translation updated' })
      setEditDialogOpen(false)
      setEditingTranslation(null)
      fetchData()
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    }
  }

  // Delete translation
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this translation?')) return

    const result = await deleteTranslation(id)

    if (result.success) {
      toast({ title: 'Success', description: result.message || 'Translation deleted' })
      fetchData()
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    }
  }

  // Export translations
  const handleExport = async () => {
    const result = await exportTranslations({
      lang_code: selectedLang !== 'all' ? selectedLang : undefined,
      namespace: selectedNamespace !== 'all' ? selectedNamespace : undefined,
    })

    if (result.success && result.data) {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `translations-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: 'Success', description: 'Translations exported' })
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    }
  }

  // Import translations
  const handleImport = async (data: Record<string, any>, overwrite: boolean) => {
    const result = await importTranslations(data, { overwrite })

    if (result.success) {
      toast({ title: 'Success', description: result.message })
      fetchData()
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    }
  }

  // Add missing translation
  const handleAddMissing = (namespace: string, key: string, langs: string[]) => {
    setEditingTranslation({
      id: '',
      lang_code: langs[0],
      namespace,
      key,
      value: '',
      is_active: true,
      is_system: false,
      created_at: '',
      updated_at: '',
    })
    setEditDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Languages className="h-8 w-8" />
            Translations
          </h1>
          <p className="text-muted-foreground">Manage multi-language translations for your site.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </DialogTrigger>
            <ImportDialog
              open={importDialogOpen}
              onOpenChange={setImportDialogOpen}
              onImport={handleImport}
            />
          </Dialog>
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Translation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTranslation ? 'Edit Translation' : 'Add Translation'}</DialogTitle>
                <DialogDescription>
                  {editingTranslation
                    ? 'Update the translation value.'
                    : 'Add a new translation key and value.'}
                </DialogDescription>
              </DialogHeader>
              <TranslationEditor
                translation={editingTranslation}
                onSave={editingTranslation ? handleUpdate : handleCreate}
                onCancel={() => {
                  setEditDialogOpen(false)
                  setEditingTranslation(null)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Translations</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.active}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>System</CardDescription>
              <CardTitle className="text-2xl">{stats.system}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Missing</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">{stats.missing_count}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="sr-only">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by key or value..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[180px]">
              <Label className="sr-only">Language</Label>
              <Select value={selectedLang} onValueChange={setSelectedLang}>
                <SelectTrigger>
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {locales.map((locale) => (
                    <SelectItem key={locale} value={locale}>
                      {localeNames[locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Label className="sr-only">Namespace</Label>
              <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
                <SelectTrigger>
                  <SelectValue placeholder="All Namespaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Namespaces</SelectItem>
                  {namespaces.map((ns) => (
                    <SelectItem key={ns} value={ns}>
                      {ns}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="icon" onClick={() => fetchData()}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="translations">
        <TabsList>
          <TabsTrigger value="translations">Translations ({translations.length})</TabsTrigger>
          <TabsTrigger value="missing">
            Missing ({missing.length})
            {missing.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {missing.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="by-language">By Language</TabsTrigger>
        </TabsList>

        <TabsContent value="translations" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : translations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Languages className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No translations found</p>
                  <p className="text-muted-foreground">Try adjusting your filters or add a new translation.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Language</TableHead>
                      <TableHead>Namespace</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {translations.map((translation) => (
                      <TableRow key={translation.id}>
                        <TableCell>
                          <Badge variant="outline">{translation.lang_code}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{translation.namespace}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{translation.key}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{translation.value}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {translation.is_active ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            {translation.is_system && (
                              <Badge variant="outline" className="text-xs">
                                System
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingTranslation(translation)
                                  setEditDialogOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {!translation.is_system && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(translation.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missing" className="mt-4">
          <MissingTranslationsTab missing={missing} onAddMissing={handleAddMissing} />
        </TabsContent>

        <TabsContent value="by-language" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {locales.map((locale) => (
              <Card key={locale}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline">{locale}</Badge>
                    {localeNames[locale]}
                  </CardTitle>
                  <CardDescription>{stats?.by_lang[locale] || 0} translations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats?.by_namespace || {})
                      .slice(0, 5)
                      .map(([ns, count]) => (
                        <div key={ns} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{ns}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setSelectedLang(locale)}
                  >
                    View Translations
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
