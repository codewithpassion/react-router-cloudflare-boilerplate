# Phase 4: Admin Dashboard & Competition Management

## Overview
Build comprehensive admin interface for managing competitions, moderating content, and monitoring platform activity with advanced analytics and bulk operations.

## Duration
**Estimated: 1 Week**

## Prerequisites
- ✅ Phase 1: Core Infrastructure completed
- ✅ Phase 2: Photo Submission completed  
- ✅ Phase 3: Voting System completed
- ✅ tRPC admin router implemented
- ✅ Role-based access control ready

## Tasks

### 1. Admin Dashboard Overview

#### 1.1 Main Admin Dashboard
**File to modify:** `app/routes/_auth.admin.dashboard.tsx`

```typescript
export default function AdminDashboard() {
  const { useStats, useRecentActivity } = useAdmin();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: recentActivity } = useRecentActivity({ limit: 10 });
  
  return (
    <div className="space-y-6">
      <DashboardHeader />
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Competitions"
          value={stats?.activeCompetitions || 0}
          change={stats?.competitionsChange}
          icon={TrophyIcon}
          trend="up"
        />
        <MetricCard
          title="Pending Photos"
          value={stats?.pendingPhotos || 0}
          change={stats?.photosChange}
          icon={PhotoIcon}
          trend="up"
          urgent={stats?.pendingPhotos > 50}
        />
        <MetricCard
          title="Total Votes Today"
          value={stats?.todayVotes || 0}
          change={stats?.votesChange}
          icon={HeartIcon}
          trend="up"
        />
        <MetricCard
          title="Active Users"
          value={stats?.activeUsers || 0}
          change={stats?.usersChange}
          icon={UserIcon}
          trend="up"
        />
      </div>
      
      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityChart data={stats?.activityChart} />
        <PopularCategoriesChart data={stats?.categoriesChart} />
      </div>
      
      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivityFeed activities={recentActivity} />
        </div>
        <div>
          <QuickActions />
          <ModerationQueue />
        </div>
      </div>
    </div>
  );
}
```

#### 1.2 Dashboard Components
**File to create:** `app/components/features/admin/dashboard-header.tsx`

```typescript
export function DashboardHeader() {
  const { user } = useAuth();
  const { useSystemHealth } = useAdmin();
  const { data: health } = useSystemHealth();
  
  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back, {user?.name}
        </h1>
        <p className="text-gray-600">
          {format(new Date(), 'EEEE, MMMM do, yyyy')}
        </p>
      </div>
      
      <div className="flex items-center gap-4">
        <SystemHealthIndicator health={health} />
        <Button asChild>
          <Link to="/admin/competitions/new">
            <PlusIcon className="w-4 h-4 mr-2" />
            New Competition
          </Link>
        </Button>
      </div>
    </div>
  );
}
```

### 2. Competition Management

#### 2.1 Competition List Page
**File to create:** `app/routes/_auth.admin.competitions._index.tsx`

```typescript
export default function AdminCompetitions() {
  const { useAllCompetitions, useDelete, useBulkUpdate } = useCompetitions();
  const [selectedCompetitions, setSelectedCompetitions] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<CompetitionStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: competitions, isLoading } = useAllCompetitions({
    status: filterStatus === 'all' ? undefined : filterStatus,
    sort: sortBy,
    search: searchQuery
  });
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Competition Management</h1>
          <p className="text-gray-600">Create and manage photo competitions</p>
        </div>
        <Button asChild>
          <Link to="/admin/competitions/new">
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Competition
          </Link>
        </Button>
      </div>
      
      <CompetitionFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      
      <CompetitionTable
        competitions={competitions}
        selectedCompetitions={selectedCompetitions}
        onSelectionChange={setSelectedCompetitions}
        onEdit={(id) => navigate(`/admin/competitions/${id}/edit`)}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
      
      {selectedCompetitions.length > 0 && (
        <BulkCompetitionActions
          selectedCount={selectedCompetitions.length}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setSelectedCompetitions([])}
        />
      )}
    </div>
  );
}
```

#### 2.2 Competition Form (Create/Edit)
**File to create:** `app/routes/_auth.admin.competitions.new.tsx`

```typescript
export default function CreateCompetition() {
  const { useCreate } = useCompetitions();
  const createMutation = useCreate();
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link to="/admin/competitions">← Back to Competitions</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Create New Competition</h1>
          <p className="text-gray-600">Set up a new photo competition</p>
        </div>
      </div>
      
      <CompetitionForm
        mode="create"
        onSubmit={handleCreate}
        onCancel={() => navigate('/admin/competitions')}
        isSubmitting={createMutation.isLoading}
      />
    </div>
  );
}
```

**File to create:** `app/components/features/admin/competition-form.tsx`

```typescript
interface CompetitionFormProps {
  competition?: Competition;
  mode: 'create' | 'edit';
  onSubmit: (data: CompetitionFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CompetitionForm({
  competition,
  mode,
  onSubmit,
  onCancel,
  isSubmitting = false
}: CompetitionFormProps) {
  const form = useForm<CompetitionFormData>({
    defaultValues: competition || getDefaultCompetitionValues(),
    resolver: zodResolver(competitionFormSchema)
  });
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Competition title, description, and basic settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Competition Title *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter competition title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="open">Open for Submissions</SelectItem>
                      <SelectItem value="voting">Voting Phase</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description *</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Describe the competition theme, rules, and prizes..."
                    rows={4}
                  />
                </FormControl>
                <FormDescription>
                  Provide a detailed description including theme, rules, and prizes
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
      
      {/* Dates and Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>
            Set important dates for the competition phases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompetitionDatesForm control={form.control} />
        </CardContent>
      </Card>
      
      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Define competition categories and submission limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoriesForm control={form.control} />
        </CardContent>
      </Card>
      
      {/* Rules and Prizes */}
      <Card>
        <CardHeader>
          <CardTitle>Rules & Prizes</CardTitle>
          <CardDescription>
            Competition rules, judging criteria, and prize information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RulesAndPrizesForm control={form.control} />
        </CardContent>
      </Card>
      
      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
          {mode === 'create' ? 'Create Competition' : 'Update Competition'}
        </Button>
      </div>
    </form>
  );
}
```

### 3. Content Moderation System

#### 3.1 Moderation Queue
**File to create:** `app/routes/_auth.admin.moderation.tsx`

```typescript
export default function ModerationQueue() {
  const { usePendingPhotos, useModerate, useBulkModerate } = useModeration();
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'reports' | 'competition'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'detailed'>('grid');
  
  const { data: pendingPhotos, isLoading } = usePendingPhotos({
    categoryId: filterCategory,
    sort: sortBy
  });
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Content Moderation</h1>
          <p className="text-gray-600">Review and moderate photo submissions</p>
        </div>
        <ModerationStats />
      </div>
      
      <ModerationFilters
        filterCategory={filterCategory}
        onCategoryChange={setFilterCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      <ModerationGrid
        photos={pendingPhotos}
        selectedPhotos={selectedPhotos}
        onSelectionChange={setSelectedPhotos}
        viewMode={viewMode}
        onModerate={handleModerate}
        isLoading={isLoading}
      />
      
      {selectedPhotos.length > 0 && (
        <BulkModerationActions
          selectedCount={selectedPhotos.length}
          onBulkApprove={() => handleBulkModerate('approved')}
          onBulkReject={() => handleBulkModerate('rejected')}
          onClearSelection={() => setSelectedPhotos([])}
        />
      )}
    </div>
  );
}
```

#### 3.2 Photo Moderation Component
**File to create:** `app/components/features/admin/photo-moderation-card.tsx`

```typescript
interface PhotoModerationCardProps {
  photo: PendingPhoto;
  onModerate: (photoId: string, action: 'approve' | 'reject', reason?: string) => void;
  viewMode: 'grid' | 'detailed';
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export function PhotoModerationCard({
  photo,
  onModerate,
  viewMode,
  isSelected = false,
  onSelect
}: PhotoModerationCardProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  return (
    <>
      <Card className={cn(
        'transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}>
        <div className="relative">
          {onSelect && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="absolute top-2 left-2 z-10 bg-white"
            />
          )}
          
          <div className="aspect-square overflow-hidden rounded-t-lg">
            <img
              src={photo.filePath}
              alt={photo.title}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setShowDetailModal(true)}
            />
          </div>
        </div>
        
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-medium truncate">{photo.title}</h3>
              <p className="text-sm text-gray-600">
                by {photo.photographer.name}
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CalendarIcon className="w-3 h-3" />
              {format(new Date(photo.createdAt), 'MMM dd, HH:mm')}
            </div>
            
            <CompetitionBadge competition={photo.competition} />
            
            {photo.reports && photo.reports.length > 0 && (
              <Alert className="p-2">
                <AlertTriangleIcon className="w-3 h-3" />
                <AlertDescription className="text-xs">
                  {photo.reports.length} report(s)
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onModerate(photo.id, 'approve')}
                className="flex-1"
              >
                <CheckIcon className="w-3 h-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowRejectModal(true)}
                className="flex-1"
              >
                <XIcon className="w-3 h-3 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Photo Detail Modal */}
      <PhotoModerationModal
        photo={photo}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onModerate={onModerate}
      />
    </>
  );
}
```

### 4. User Management

#### 4.1 User Management Page
**File to create:** `app/routes/_auth.admin.users.tsx`

```typescript
export default function UserManagement() {
  const { useAllUsers, useUpdateUserRole, useBanUser } = useAdmin();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'active' | 'banned' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: users, isLoading } = useAllUsers({
    role: filterRole === 'all' ? undefined : filterRole,
    status: filterStatus === 'all' ? undefined : filterStatus,
    search: searchQuery
  });
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>
        <UserStats />
      </div>
      
      <UserFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterRole={filterRole}
        onRoleChange={setFilterRole}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
      />
      
      <UserTable
        users={users}
        selectedUsers={selectedUsers}
        onSelectionChange={setSelectedUsers}
        onRoleChange={handleRoleChange}
        onBanUser={handleBanUser}
        onViewProfile={handleViewProfile}
        isLoading={isLoading}
      />
      
      {selectedUsers.length > 0 && (
        <BulkUserActions
          selectedCount={selectedUsers.length}
          onBulkRoleChange={handleBulkRoleChange}
          onBulkBan={handleBulkBan}
          onClearSelection={() => setSelectedUsers([])}
        />
      )}
    </div>
  );
}
```

### 5. Analytics and Reporting

#### 5.1 Analytics Dashboard
**File to create:** `app/routes/_auth.admin.analytics.tsx`

```typescript
export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'submissions', 'votes', 'users'
  ]);
  
  const { useAnalytics } = useAdmin();
  const { data: analytics, isLoading } = useAnalytics({
    from: dateRange.from,
    to: dateRange.to,
    metrics: selectedMetrics
  });
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Analytics & Reports</h1>
          <p className="text-gray-600">Track platform performance and user engagement</p>
        </div>
        <div className="flex gap-2">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <Button variant="outline">
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>
      
      <AnalyticsFilters
        selectedMetrics={selectedMetrics}
        onMetricsChange={setSelectedMetrics}
      />
      
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard
          title="Total Submissions"
          value={analytics?.totalSubmissions}
          change={analytics?.submissionsChange}
          period="vs last period"
        />
        <KPICard
          title="Total Votes"
          value={analytics?.totalVotes}
          change={analytics?.votesChange}
          period="vs last period"
        />
        <KPICard
          title="Active Users"
          value={analytics?.activeUsers}
          change={analytics?.usersChange}
          period="vs last period"
        />
        <KPICard
          title="Competitions Created"
          value={analytics?.competitionsCreated}
          change={analytics?.competitionsChange}
          period="vs last period"
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubmissionsChart data={analytics?.submissionsChart} />
        <VotingChart data={analytics?.votingChart} />
        <UserEngagementChart data={analytics?.engagementChart} />
        <CompetitionPerformanceChart data={analytics?.competitionChart} />
      </div>
      
      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopPerformingPhotos data={analytics?.topPhotos} />
        <MostActiveUsers data={analytics?.activeUsers} />
      </div>
    </div>
  );
}
```

#### 5.2 Reports Generator
**File to create:** `app/components/features/admin/reports-generator.tsx`

```typescript
interface ReportsGeneratorProps {
  onGenerate: (reportConfig: ReportConfig) => void;
}

interface ReportConfig {
  type: 'competition' | 'user-activity' | 'moderation' | 'financial';
  dateRange: { from: Date; to: Date };
  filters: Record<string, any>;
  format: 'pdf' | 'csv' | 'xlsx';
  includeCharts: boolean;
}

export function ReportsGenerator({ onGenerate }: ReportsGeneratorProps) {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    type: 'competition',
    dateRange: { from: subDays(new Date(), 30), to: new Date() },
    filters: {},
    format: 'pdf',
    includeCharts: true
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Custom Report</CardTitle>
        <CardDescription>
          Create detailed reports for analysis and record keeping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Report Type</Label>
            <Select
              value={reportConfig.type}
              onValueChange={(type) => setReportConfig({ ...reportConfig, type })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="competition">Competition Analysis</SelectItem>
                <SelectItem value="user-activity">User Activity</SelectItem>
                <SelectItem value="moderation">Moderation Report</SelectItem>
                <SelectItem value="financial">Financial Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Export Format</Label>
            <Select
              value={reportConfig.format}
              onValueChange={(format) => setReportConfig({ ...reportConfig, format })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Report</SelectItem>
                <SelectItem value="csv">CSV Data</SelectItem>
                <SelectItem value="xlsx">Excel Spreadsheet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <Label>Date Range</Label>
          <DateRangePicker
            value={reportConfig.dateRange}
            onChange={(dateRange) => setReportConfig({ ...reportConfig, dateRange })}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeCharts"
            checked={reportConfig.includeCharts}
            onCheckedChange={(includeCharts) => 
              setReportConfig({ ...reportConfig, includeCharts })
            }
          />
          <Label htmlFor="includeCharts">Include charts and visualizations</Label>
        </div>
        
        <Button onClick={() => onGenerate(reportConfig)} className="w-full">
          <FileTextIcon className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 6. System Settings

#### 6.1 Platform Settings
**File to create:** `app/routes/_auth.admin.settings.tsx`

```typescript
export default function PlatformSettings() {
  const { useSettings, useUpdateSettings } = useAdmin();
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  
  const [activeTab, setActiveTab] = useState('general');
  
  if (isLoading) return <SettingsSkeleton />;
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform Settings</h1>
        <p className="text-gray-600">Configure platform behavior and policies</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="competition">Competitions</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <GeneralSettingsForm
            settings={settings?.general}
            onSave={(data) => updateMutation.mutate({ general: data })}
            isLoading={updateMutation.isLoading}
          />
        </TabsContent>
        
        <TabsContent value="competition">
          <CompetitionSettingsForm
            settings={settings?.competition}
            onSave={(data) => updateMutation.mutate({ competition: data })}
            isLoading={updateMutation.isLoading}
          />
        </TabsContent>
        
        <TabsContent value="moderation">
          <ModerationSettingsForm
            settings={settings?.moderation}
            onSave={(data) => updateMutation.mutate({ moderation: data })}
            isLoading={updateMutation.isLoading}
          />
        </TabsContent>
        
        <TabsContent value="email">
          <EmailSettingsForm
            settings={settings?.email}
            onSave={(data) => updateMutation.mutate({ email: data })}
            isLoading={updateMutation.isLoading}
          />
        </TabsContent>
        
        <TabsContent value="storage">
          <StorageSettingsForm
            settings={settings?.storage}
            onSave={(data) => updateMutation.mutate({ storage: data })}
            isLoading={updateMutation.isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## Acceptance Criteria

### ✅ Dashboard Functionality
- [ ] All metrics display accurately and update in real-time
- [ ] Charts render correctly with proper data visualization
- [ ] Quick actions work from dashboard
- [ ] System health monitoring functions
- [ ] Recent activity feed shows relevant updates

### ✅ Competition Management
- [ ] Competitions can be created with all required fields
- [ ] Editing preserves all data correctly
- [ ] Status transitions work properly
- [ ] Bulk operations handle multiple competitions
- [ ] Form validation prevents invalid data

### ✅ Content Moderation
- [ ] Pending photos display in moderation queue
- [ ] Approval/rejection actions work immediately
- [ ] Bulk moderation handles multiple items
- [ ] Rejection reasons are captured and stored
- [ ] Moderation history is tracked

### ✅ User Management
- [ ] User list displays with proper filtering
- [ ] Role changes take effect immediately
- [ ] User banning/unbanning works correctly
- [ ] Bulk user operations function properly
- [ ] User activity tracking is accurate

### ✅ Analytics & Reporting
- [ ] Charts display meaningful data
- [ ] Date range filtering works correctly
- [ ] Report generation produces valid files
- [ ] Export functionality works for all formats
- [ ] KPIs calculate accurately

### ✅ System Settings
- [ ] All settings save and persist correctly
- [ ] Form validation prevents invalid configurations
- [ ] Settings changes take effect immediately
- [ ] Default values are reasonable
- [ ] Changes are logged for audit trail

## Testing Checklist

### Manual Testing
- [ ] Test all admin functions with admin user
- [ ] Verify non-admin users cannot access admin routes
- [ ] Test competition creation and management
- [ ] Verify moderation workflow
- [ ] Test user role changes and banning
- [ ] Verify analytics data accuracy

### Integration Testing
- [ ] Test with tRPC admin endpoints
- [ ] Verify permission checks work
- [ ] Test file upload and storage
- [ ] Check email notification triggers
- [ ] Test real-time updates

### Performance Testing
- [ ] Test with large datasets
- [ ] Verify chart rendering performance
- [ ] Test bulk operations with many items
- [ ] Check memory usage during admin tasks

## Dependencies

### New Dependencies
```json
{
  "recharts": "^2.8.0",
  "react-hook-form": "^7.48.0",
  "@hookform/resolvers": "^3.3.0",
  "date-fns": "^3.0.0",
  "jspdf": "^2.5.0",
  "xlsx": "^0.18.0"
}
```

## Notes

### Permission Strategy
- Use role-based access control throughout
- Implement feature-level permissions for granular control
- Log all admin actions for audit trail
- Use middleware to protect all admin routes

### Performance Considerations
- Implement pagination for large datasets
- Use virtual scrolling for long lists
- Cache frequently accessed data
- Optimize chart rendering for large datasets

### Security Best Practices
- Validate all admin inputs server-side
- Use CSRF protection for state-changing operations
- Implement rate limiting on admin endpoints
- Log security-sensitive actions

### Data Export Strategy
- Support multiple export formats (PDF, CSV, Excel)
- Include data visualization in PDF reports
- Implement streaming for large exports
- Add custom report templates

### Monitoring and Alerts
- Track system performance metrics
- Monitor for unusual activity patterns
- Alert on moderation queue buildup
- Track competition engagement metrics