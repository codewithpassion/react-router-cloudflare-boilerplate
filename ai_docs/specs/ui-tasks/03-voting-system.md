# Phase 3: Voting System UI

## Overview
Build comprehensive voting interface with real-time updates, vote analytics, and user engagement features for photo competitions.

## Duration
**Estimated: 1 Week**

## Prerequisites
- ✅ Phase 1: Core Infrastructure completed
- ✅ Phase 2: Photo Submission completed
- ✅ tRPC voting router implemented
- ✅ Real-time voting system ready

## Tasks

### 1. Voting Interface Components

#### 1.1 Vote Button Component
**File to create:** `app/components/features/voting/vote-button.tsx`

```typescript
interface VoteButtonProps {
  photoId: string;
  currentVotes: number;
  userHasVoted: boolean;
  canVote: boolean;
  competitionStatus: 'open' | 'voting' | 'closed';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button' | 'card';
  onVoteChange?: (voted: boolean, newCount: number) => void;
}

export function VoteButton({
  photoId,
  currentVotes,
  userHasVoted,
  canVote,
  competitionStatus,
  size = 'md',
  variant = 'button',
  onVoteChange
}: VoteButtonProps) {
  const { useVote, useUnvote } = useVoting();
  const voteMutation = useVote();
  const unvoteMutation = useUnvote();
  
  // Implementation features:
  // - Animated heart/star icon
  // - Vote count with smooth transitions
  // - Loading states during vote submission
  // - Error handling with toast notifications
  // - Optimistic updates
  // - Disabled states for non-voting periods
}
```

**Features:**
- Animated heart/star icon that fills on vote
- Smooth vote count transitions
- Optimistic UI updates
- Error rollback on failed votes
- Disabled states with tooltips
- Multiple visual variants (icon-only, with count, etc.)

#### 1.2 Voting Statistics Display
**File to create:** `app/components/features/voting/vote-stats.tsx`

```typescript
interface VoteStatsProps {
  photoId: string;
  totalVotes: number;
  averageScore?: number;
  voteHistory?: VoteHistoryData;
  showChart?: boolean;
  showBreakdown?: boolean;
}

interface VoteHistoryData {
  daily: Array<{ date: string; votes: number }>;
  hourly: Array<{ hour: number; votes: number }>;
}

export function VoteStats({
  photoId,
  totalVotes,
  averageScore,
  voteHistory,
  showChart = false,
  showBreakdown = false
}: VoteStatsProps) {
  // Implementation features:
  // - Vote count with trend indicators
  // - Simple vote history chart
  // - Peak voting times display
  // - Vote velocity calculations
}
```

#### 1.3 Real-time Vote Updates
**File to create:** `app/hooks/use-realtime-votes.ts`

```typescript
export function useRealtimeVotes(photoId: string) {
  const [votes, setVotes] = useState<number>(0);
  const [userHasVoted, setUserHasVoted] = useState<boolean>(false);
  
  // Use tRPC subscription for real-time updates
  trpc.voting.subscribeToPhoto.useSubscription(
    { photoId },
    {
      onData: (update) => {
        setVotes(update.totalVotes);
        setUserHasVoted(update.userHasVoted);
      },
    }
  );
  
  return {
    votes,
    userHasVoted,
    refreshVotes: () => {
      // Manual refresh function
    }
  };
}
```

### 2. Competition Voting Pages

#### 2.1 Competition Voting Gallery
**File to create:** `app/routes/competitions.$id.tsx`

```typescript
export default function CompetitionVoting() {
  const { id } = useParams();
  const { useById: useCompetitionById } = useCompetitions();
  const { usePhotosForVoting } = usePhotos();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'random' | 'recent' | 'popular'>('random');
  const [viewMode, setViewMode] = useState<'grid' | 'slideshow' | 'list'>('grid');
  
  const { data: competition } = useCompetitionById(id!);
  const { data: photos, isLoading } = usePhotosForVoting({
    competitionId: id!,
    categoryId: selectedCategory,
    sort: sortBy
  });
  
  if (!competition) return <NotFound />;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <CompetitionHeader 
        competition={competition}
        showVotingInfo={true}
      />
      
      <div className="container mx-auto px-4 py-8">
        <VotingControls
          categories={competition.categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        
        {competition.status !== 'voting' ? (
          <VotingNotAvailable 
            status={competition.status}
            startDate={competition.votingStartDate}
            endDate={competition.votingEndDate}
          />
        ) : (
          <VotingGallery
            photos={photos}
            viewMode={viewMode}
            isLoading={isLoading}
            onPhotoClick={handlePhotoClick}
          />
        )}
      </div>
    </div>
  );
}
```

#### 2.2 Photo Detail Modal for Voting
**File to create:** `app/components/features/voting/photo-detail-modal.tsx`

```typescript
interface PhotoDetailModalProps {
  photo: Photo | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  competitionStatus: 'open' | 'voting' | 'closed';
}

export function PhotoDetailModal({
  photo,
  isOpen,
  onClose,
  onNavigate,
  competitionStatus
}: PhotoDetailModalProps) {
  if (!photo) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
          {/* Image Section */}
          <div className="lg:col-span-2 relative bg-black">
            <NavigationButton 
              direction="prev" 
              onClick={() => onNavigate('prev')}
              className="absolute left-4 top-1/2 z-10"
            />
            <img 
              src={photo.filePath}
              alt={photo.title}
              className="w-full h-full object-contain"
            />
            <NavigationButton 
              direction="next" 
              onClick={() => onNavigate('next')}
              className="absolute right-4 top-1/2 z-10"
            />
          </div>
          
          {/* Details Section */}
          <div className="p-6 space-y-6 overflow-y-auto">
            <PhotoMetadata photo={photo} />
            
            {competitionStatus === 'voting' && (
              <VoteSection 
                photoId={photo.id}
                currentVotes={photo.voteCount}
                userHasVoted={photo.userHasVoted}
              />
            )}
            
            <PhotoStats photo={photo} />
            <PhotographerInfo photographer={photo.photographer} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Voting Dashboard & Analytics

#### 3.1 User Voting History
**File to create:** `app/routes/_auth.voting.tsx`

```typescript
export default function UserVoting() {
  const { useUserVotingHistory, useUserStats } = useVoting();
  const [filterPeriod, setFilterPeriod] = useState<'week' | 'month' | 'all'>('month');
  const [sortBy, setSortBy] = useState<'recent' | 'competition'>('recent');
  
  const { data: votingHistory } = useUserVotingHistory({ period: filterPeriod });
  const { data: stats } = useUserStats();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Voting Activity</h1>
        <p className="text-gray-600">Track your votes and discover new favorites</p>
      </div>
      
      <VotingStatsCards stats={stats} />
      
      <VotingFilters
        period={filterPeriod}
        onPeriodChange={setFilterPeriod}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      
      <VotingHistoryList 
        history={votingHistory}
        onRemoveVote={handleRemoveVote}
      />
    </div>
  );
}
```

#### 3.2 Competition Leaderboard
**File to create:** `app/components/features/voting/leaderboard.tsx`

```typescript
interface LeaderboardProps {
  competitionId: string;
  categoryId?: string;
  limit?: number;
  showPhotos?: boolean;
  variant?: 'full' | 'compact' | 'mini';
}

export function Leaderboard({
  competitionId,
  categoryId,
  limit = 10,
  showPhotos = true,
  variant = 'full'
}: LeaderboardProps) {
  const { useLeaderboard } = useVoting();
  const { data: leaderboard, isLoading } = useLeaderboard({
    competitionId,
    categoryId,
    limit
  });
  
  if (isLoading) return <LeaderboardSkeleton variant={variant} />;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Top Photos</h3>
        <Badge variant="secondary">{leaderboard?.length || 0} entries</Badge>
      </div>
      
      <div className="space-y-2">
        {leaderboard?.map((entry, index) => (
          <LeaderboardEntry
            key={entry.photoId}
            entry={entry}
            rank={index + 1}
            showPhoto={showPhotos}
            variant={variant}
          />
        ))}
      </div>
      
      {variant === 'mini' && leaderboard && leaderboard.length > 3 && (
        <Button variant="outline" size="sm" asChild>
          <Link to={`/competitions/${competitionId}/leaderboard`}>
            View Full Leaderboard
          </Link>
        </Button>
      )}
    </div>
  );
}
```

### 4. Advanced Voting Features

#### 4.1 Voting Recommendations
**File to create:** `app/components/features/voting/voting-recommendations.tsx`

```typescript
interface VotingRecommendationsProps {
  competitionId: string;
  userId: string;
  limit?: number;
}

export function VotingRecommendations({
  competitionId,
  userId,
  limit = 6
}: VotingRecommendationsProps) {
  const { useRecommendations } = useVoting();
  const { data: recommendations } = useRecommendations({
    competitionId,
    userId,
    limit
  });
  
  if (!recommendations?.length) return null;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SparklesIcon className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold">Photos You Might Like</h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {recommendations.map((photo) => (
          <RecommendationCard
            key={photo.id}
            photo={photo}
            reason={photo.recommendationReason}
            onVote={handleVote}
          />
        ))}
      </div>
    </div>
  );
}
```

#### 4.2 Voting Progress Tracker
**File to create:** `app/components/features/voting/voting-progress.tsx`

```typescript
interface VotingProgressProps {
  competitionId: string;
  totalPhotos: number;
  votedPhotos: number;
  categories: Category[];
}

export function VotingProgress({
  competitionId,
  totalPhotos,
  votedPhotos,
  categories
}: VotingProgressProps) {
  const progressPercentage = (votedPhotos / totalPhotos) * 100;
  
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Voting Progress</h3>
          <Badge variant="secondary">
            {votedPhotos}/{totalPhotos} voted
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        <div className="space-y-2">
          {categories.map((category) => (
            <CategoryProgress 
              key={category.id}
              category={category}
              competitionId={competitionId}
            />
          ))}
        </div>
        
        {progressPercentage >= 100 && (
          <Alert>
            <CheckCircleIcon className="h-4 w-4" />
            <AlertDescription>
              Great job! You've voted on all photos in this competition.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}
```

### 5. Voting Controls & Filters

#### 5.1 Advanced Voting Filters
**File to create:** `app/components/features/voting/voting-filters.tsx`

```typescript
interface VotingFiltersProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  sortBy: 'random' | 'recent' | 'popular' | 'least-voted';
  onSortChange: (sort: string) => void;
  showOnlyUnvoted?: boolean;
  onShowUnvotedChange?: (show: boolean) => void;
}

export function VotingFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  showOnlyUnvoted = false,
  onShowUnvotedChange
}: VotingFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-lg border space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Label htmlFor="category">Category:</Label>
          <Select value={selectedCategory || 'all'} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Sort Filter */}
        <div className="flex items-center gap-2">
          <Label htmlFor="sort">Sort by:</Label>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="random">Random</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="least-voted">Least Voted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Show Only Unvoted */}
        {onShowUnvotedChange && (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="unvoted"
              checked={showOnlyUnvoted}
              onCheckedChange={onShowUnvotedChange}
            />
            <Label htmlFor="unvoted">Show only unvoted</Label>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 5.2 Voting View Modes
**File to create:** `app/components/features/voting/view-mode-selector.tsx`

```typescript
interface ViewModeSelectorProps {
  currentMode: 'grid' | 'slideshow' | 'list';
  onModeChange: (mode: 'grid' | 'slideshow' | 'list') => void;
}

export function ViewModeSelector({ currentMode, onModeChange }: ViewModeSelectorProps) {
  const modes = [
    { id: 'grid', label: 'Grid', icon: GridIcon },
    { id: 'slideshow', label: 'Slideshow', icon: PlayIcon },
    { id: 'list', label: 'List', icon: ListIcon },
  ] as const;
  
  return (
    <div className="flex rounded-lg border bg-white p-1">
      {modes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onModeChange(id)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
            currentMode === id 
              ? 'bg-primary text-primary-foreground' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
```

### 6. Voting Results & Winners

#### 6.1 Results Display Component
**File to create:** `app/components/features/voting/voting-results.tsx`

```typescript
interface VotingResultsProps {
  competitionId: string;
  showWinners?: boolean;
  categoryId?: string;
}

export function VotingResults({
  competitionId,
  showWinners = true,
  categoryId
}: VotingResultsProps) {
  const { useResults } = useVoting();
  const { data: results, isLoading } = useResults({
    competitionId,
    categoryId
  });
  
  if (isLoading) return <ResultsSkeleton />;
  
  return (
    <div className="space-y-8">
      {showWinners && results?.winners && (
        <WinnersSection winners={results.winners} />
      )}
      
      <div className="space-y-6">
        <h3 className="text-2xl font-semibold">Final Results</h3>
        
        {results?.categories.map((category) => (
          <CategoryResults
            key={category.id}
            category={category}
            results={category.results}
          />
        ))}
      </div>
      
      <VotingStatistics 
        totalVotes={results?.totalVotes}
        totalParticipants={results?.totalParticipants}
        votingPeriod={results?.votingPeriod}
      />
    </div>
  );
}
```

#### 6.2 Winners Announcement
**File to create:** `app/components/features/voting/winners-section.tsx`

```typescript
interface WinnersSectionProps {
  winners: Winner[];
}

interface Winner {
  rank: number;
  photo: Photo;
  votes: number;
  category: Category;
  prize?: string;
}

export function WinnersSection({ winners }: WinnersSectionProps) {
  const [selectedWinner, setSelectedWinner] = useState<Winner | null>(null);
  
  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-8 rounded-xl">
      <div className="text-center mb-8">
        <TrophyIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900">Competition Winners</h2>
        <p className="text-gray-600 mt-2">Congratulations to our amazing photographers!</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {winners.slice(0, 3).map((winner, index) => (
          <WinnerCard
            key={winner.photo.id}
            winner={winner}
            rank={index + 1}
            onClick={() => setSelectedWinner(winner)}
          />
        ))}
      </div>
      
      {winners.length > 3 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Other Category Winners</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {winners.slice(3).map((winner) => (
              <CompactWinnerCard
                key={winner.photo.id}
                winner={winner}
                onClick={() => setSelectedWinner(winner)}
              />
            ))}
          </div>
        </div>
      )}
      
      {selectedWinner && (
        <WinnerDetailModal
          winner={selectedWinner}
          onClose={() => setSelectedWinner(null)}
        />
      )}
    </div>
  );
}
```

## Acceptance Criteria

### ✅ Voting Interface
- [ ] Vote buttons respond immediately with optimistic updates
- [ ] Real-time vote counts update across all users
- [ ] Voting restrictions work correctly (timing, user auth)
- [ ] Vote removal works when allowed
- [ ] Loading states are smooth and non-intrusive

### ✅ Gallery Experience
- [ ] Photos load quickly in all view modes
- [ ] Navigation between photos is smooth
- [ ] Filters and sorting work correctly
- [ ] Photo detail modal functions properly
- [ ] Mobile touch gestures work for navigation

### ✅ Analytics & Progress
- [ ] Voting progress tracks accurately
- [ ] Leaderboards update in real-time
- [ ] User voting history is comprehensive
- [ ] Statistics display correctly
- [ ] Recommendations are relevant

### ✅ Results & Winners
- [ ] Final results calculate correctly
- [ ] Winners display prominently
- [ ] Category results are organized well
- [ ] Vote statistics are accurate
- [ ] Results are cached for performance

### ✅ Performance
- [ ] Real-time updates don't cause performance issues
- [ ] Large galleries render smoothly
- [ ] Vote animations are smooth
- [ ] Image loading is optimized
- [ ] Memory usage is reasonable

## Testing Checklist

### Manual Testing
- [ ] Vote on photos across different competitions
- [ ] Test real-time updates with multiple users
- [ ] Verify voting restrictions work
- [ ] Check mobile voting experience
- [ ] Test all view modes and filters

### Integration Testing
- [ ] Test with tRPC voting endpoints
- [ ] Verify real-time subscriptions
- [ ] Check vote count accuracy
- [ ] Test permission checks
- [ ] Verify analytics calculations

### Performance Testing
- [ ] Test with high vote volumes
- [ ] Check real-time update performance
- [ ] Verify memory usage with long sessions
- [ ] Test on slower devices/connections

## Dependencies

### New Dependencies
```json
{
  "@tanstack/react-query": "^5.79.2", // Already installed
  "framer-motion": "^12.6.3", // Already installed - for animations
  "react-intersection-observer": "^9.5.0",
  "react-use-websocket": "^4.5.0" // For real-time updates
}
```

## Notes

### Real-time Updates Strategy
- Use tRPC subscriptions for vote updates
- Implement optimistic updates for immediate feedback
- Add error handling with automatic retry
- Cache vote counts to reduce server load

### Vote Integrity
- Implement client-side vote validation
- Use server-side verification for all votes
- Track vote timestamps for analytics
- Prevent duplicate voting attempts

### Performance Optimization
- Lazy load images in voting galleries
- Implement virtual scrolling for large lists
- Cache voting state in localStorage
- Use intersection observer for vote tracking

### Mobile Experience
- Touch-friendly vote buttons
- Swipe gestures for photo navigation
- Optimized image sizes for mobile
- Fast vote feedback on touch devices

### Analytics Considerations
- Track voting patterns for insights
- Monitor popular photos and categories
- Generate voting behavior reports
- Identify potential voting irregularities