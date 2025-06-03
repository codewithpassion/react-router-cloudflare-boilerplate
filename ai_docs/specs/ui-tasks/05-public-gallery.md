# Phase 5: Public Gallery & Discovery

## Overview
Build engaging public photo gallery with advanced filtering, search capabilities, and social features to showcase competition entries and winners.

## Duration
**Estimated: 1 Week**

## Prerequisites
- ✅ Phase 1: Core Infrastructure completed
- ✅ Phase 2: Photo Submission completed
- ✅ Phase 3: Voting System completed
- ✅ Phase 4: Admin Dashboard completed
- ✅ Public API endpoints ready

## Tasks

### 1. Main Gallery Interface

#### 1.1 Public Gallery Landing
**File to create:** `app/routes/gallery.tsx`

```typescript
export default function PublicGallery() {
  const [viewMode, setViewMode] = useState<'masonry' | 'grid' | 'slideshow'>('masonry');
  const [filterBy, setFilterBy] = useState<GalleryFilter>({
    category: null,
    competition: null,
    timeframe: 'all',
    sortBy: 'popular'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  
  const { usePublicPhotos } = usePhotos();
  const { data: photos, isLoading, fetchNextPage, hasNextPage } = usePublicPhotos({
    ...filterBy,
    search: searchQuery
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      <GalleryHeader />
      
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Photo Gallery
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover amazing photography from our community competitions. 
            Browse winning entries and find inspiration.
          </p>
        </div>
        
        {/* Featured Section */}
        <FeaturedPhotosCarousel />
        
        {/* Filter and Search Controls */}
        <GalleryControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        
        {/* Photo Gallery */}
        <GalleryGrid
          photos={photos}
          viewMode={viewMode}
          onPhotoClick={setSelectedPhoto}
          onLoadMore={fetchNextPage}
          hasMore={hasNextPage}
          isLoading={isLoading}
        />
      </div>
      
      {/* Photo Detail Modal */}
      <PhotoDetailModal
        photo={selectedPhoto}
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        showVoting={false}
        showSocial={true}
      />
    </div>
  );
}
```

#### 1.2 Featured Photos Carousel
**File to create:** `app/components/features/gallery/featured-carousel.tsx`

```typescript
export function FeaturedPhotosCarousel() {
  const { useFeaturedPhotos } = usePhotos();
  const { data: featuredPhotos } = useFeaturedPhotos({ limit: 6 });
  const [currentSlide, setCurrentSlide] = useState(0);
  
  if (!featuredPhotos?.length) return null;
  
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Featured Winners</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentSlide(Math.min(featuredPhotos.length - 3, currentSlide + 1))}
            disabled={currentSlide >= featuredPhotos.length - 3}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="relative overflow-hidden">
        <div 
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 33.333}%)` }}
        >
          {featuredPhotos.map((photo) => (
            <div key={photo.id} className="w-1/3 flex-shrink-0 px-3">
              <FeaturedPhotoCard photo={photo} />
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: Math.max(1, featuredPhotos.length - 2) }).map((_, index) => (
          <button
            key={index}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              currentSlide === index ? 'bg-primary' : 'bg-gray-300'
            )}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </div>
  );
}
```

### 2. Advanced Gallery Components

#### 2.1 Masonry Layout Gallery
**File to create:** `app/components/features/gallery/masonry-gallery.tsx`

```typescript
interface MasonryGalleryProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  isLoading?: boolean;
}

export function MasonryGallery({ photos, onPhotoClick, isLoading }: MasonryGalleryProps) {
  const [columns, setColumns] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Responsive column calculation
  useEffect(() => {
    const updateColumns = () => {
      const width = containerRef.current?.offsetWidth || 0;
      if (width < 768) setColumns(1);
      else if (width < 1024) setColumns(2);
      else if (width < 1536) setColumns(3);
      else setColumns(4);
    };
    
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);
  
  // Distribute photos across columns
  const photoColumns = useMemo(() => {
    const cols: Photo[][] = Array.from({ length: columns }, () => []);
    photos.forEach((photo, index) => {
      cols[index % columns].push(photo);
    });
    return cols;
  }, [photos, columns]);
  
  return (
    <div ref={containerRef} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {photoColumns.map((columnPhotos, columnIndex) => (
        <div key={columnIndex} className="space-y-4">
          {columnPhotos.map((photo) => (
            <MasonryPhotoCard
              key={photo.id}
              photo={photo}
              onClick={() => onPhotoClick(photo)}
            />
          ))}
        </div>
      ))}
      
      {isLoading && (
        <div className="col-span-full">
          <MasonryLoadingSkeleton columns={columns} />
        </div>
      )}
    </div>
  );
}
```

#### 2.2 Gallery Filter System
**File to create:** `app/components/features/gallery/gallery-filters.tsx`

```typescript
interface GalleryFiltersProps {
  filterBy: GalleryFilter;
  onFilterChange: (filter: GalleryFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface GalleryFilter {
  category: string | null;
  competition: string | null;
  timeframe: 'week' | 'month' | 'year' | 'all';
  sortBy: 'popular' | 'recent' | 'random' | 'votes';
}

export function GalleryFilters({
  filterBy,
  onFilterChange,
  searchQuery,
  onSearchChange
}: GalleryFiltersProps) {
  const { useCategories } = useCategories();
  const { useRecentCompetitions } = useCompetitions();
  
  const { data: categories } = useCategories();
  const { data: competitions } = useRecentCompetitions({ limit: 20 });
  
  return (
    <Card className="p-6 mb-8">
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search photos by title, photographer, or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={filterBy.category || 'all'}
              onValueChange={(value) => 
                onFilterChange({ 
                  ...filterBy, 
                  category: value === 'all' ? null : value 
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Competition Filter */}
          <div>
            <Label htmlFor="competition">Competition</Label>
            <Select
              value={filterBy.competition || 'all'}
              onValueChange={(value) => 
                onFilterChange({ 
                  ...filterBy, 
                  competition: value === 'all' ? null : value 
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Competitions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Competitions</SelectItem>
                {competitions?.map((competition) => (
                  <SelectItem key={competition.id} value={competition.id}>
                    {competition.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Timeframe Filter */}
          <div>
            <Label htmlFor="timeframe">Time Period</Label>
            <Select
              value={filterBy.timeframe}
              onValueChange={(value) => 
                onFilterChange({ 
                  ...filterBy, 
                  timeframe: value as GalleryFilter['timeframe']
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Sort Filter */}
          <div>
            <Label htmlFor="sort">Sort By</Label>
            <Select
              value={filterBy.sortBy}
              onValueChange={(value) => 
                onFilterChange({ 
                  ...filterBy, 
                  sortBy: value as GalleryFilter['sortBy']
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="votes">Most Votes</SelectItem>
                <SelectItem value="random">Random</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Active Filters Display */}
        <ActiveFilters 
          filterBy={filterBy}
          onClearFilter={onFilterChange}
          searchQuery={searchQuery}
          onClearSearch={() => onSearchChange('')}
        />
      </div>
    </Card>
  );
}
```

### 3. Photography Competition Archives

#### 3.1 Competition Archives Page
**File to create:** `app/routes/gallery.competitions.tsx`

```typescript
export default function CompetitionArchives() {
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed'>('completed');
  const [sortBy, setSortBy] = useState<'date' | 'popularity' | 'entries'>('date');
  
  const { useCompetitionArchives } = useCompetitions();
  const { data: competitions, isLoading } = useCompetitionArchives({
    year: filterYear,
    status: filterStatus === 'all' ? undefined : filterStatus,
    sort: sortBy
  });
  
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Competition Archives
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Browse past photography competitions and discover award-winning images 
          from our community.
        </p>
      </div>
      
      <CompetitionArchiveFilters
        filterYear={filterYear}
        onYearChange={setFilterYear}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {competitions?.map((competition) => (
          <CompetitionArchiveCard
            key={competition.id}
            competition={competition}
            onClick={() => navigate(`/gallery/competitions/${competition.id}`)}
          />
        ))}
      </div>
      
      {isLoading && <CompetitionArchivesSkeleton />}
    </div>
  );
}
```

#### 3.2 Individual Competition Gallery
**File to create:** `app/routes/gallery.competitions.$id.tsx`

```typescript
export default function CompetitionGallery() {
  const { id } = useParams();
  const { useById: useCompetitionById } = useCompetitions();
  const { useCompetitionPhotos } = usePhotos();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'winners' | 'all'>('winners');
  
  const { data: competition } = useCompetitionById(id!);
  const { data: photos } = useCompetitionPhotos({
    competitionId: id!,
    categoryId: selectedCategory,
    winnersOnly: viewMode === 'winners'
  });
  
  if (!competition) return <NotFound />;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <CompetitionGalleryHeader competition={competition} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Competition Winners Section */}
        {viewMode === 'winners' && competition.winners && (
          <CompetitionWinnersSection 
            winners={competition.winners}
            categories={competition.categories}
          />
        )}
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-semibold">
              {viewMode === 'winners' ? 'Award Winners' : 'All Entries'}
            </h2>
            <p className="text-gray-600">
              {photos?.length || 0} photos in this competition
            </p>
          </div>
          
          <div className="flex gap-4">
            <CategoryFilter
              categories={competition.categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </div>
        
        <CompetitionPhotoGrid
          photos={photos}
          competition={competition}
          showAwards={viewMode === 'winners'}
        />
      </div>
    </div>
  );
}
```

### 4. Social Features & Engagement

#### 4.1 Photo Sharing Components
**File to create:** `app/components/features/gallery/photo-sharing.tsx`

```typescript
interface PhotoSharingProps {
  photo: Photo;
  competition?: Competition;
}

export function PhotoSharing({ photo, competition }: PhotoSharingProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    setShareUrl(`${window.location.origin}/gallery/photos/${photo.id}`);
  }, [photo.id]);
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };
  
  const shareTitle = `${photo.title} by ${photo.photographer.name}`;
  const shareDescription = competition 
    ? `Amazing photo from ${competition.title} competition`
    : 'Check out this amazing photograph';
  
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Share this photo</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Twitter */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
            window.open(twitterUrl, '_blank');
          }}
        >
          <TwitterIcon className="w-4 h-4 mr-2" />
          Twitter
        </Button>
        
        {/* Facebook */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
            window.open(facebookUrl, '_blank');
          }}
        >
          <FacebookIcon className="w-4 h-4 mr-2" />
          Facebook
        </Button>
        
        {/* Pinterest */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(photo.filePath)}&description=${encodeURIComponent(shareDescription)}`;
            window.open(pinterestUrl, '_blank');
          }}
        >
          <PinterestIcon className="w-4 h-4 mr-2" />
          Pinterest
        </Button>
        
        {/* Copy Link */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
        >
          {copied ? (
            <CheckIcon className="w-4 h-4 mr-2" />
          ) : (
            <LinkIcon className="w-4 h-4 mr-2" />
          )}
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>
      </div>
      
      {/* Embed Code */}
      <div>
        <Label htmlFor="embed-code">Embed Code</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="embed-code"
            value={`<iframe src="${shareUrl}/embed" width="400" height="300" frameborder="0"></iframe>`}
            readOnly
            className="text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const embedCode = `<iframe src="${shareUrl}/embed" width="400" height="300" frameborder="0"></iframe>`;
              navigator.clipboard.writeText(embedCode);
            }}
          >
            Copy
          </Button>
        </div>
      </div>
    </div>
  );
}
```

#### 4.2 Photo Collections/Favorites
**File to create:** `app/components/features/gallery/photo-collections.tsx`

```typescript
interface PhotoCollectionsProps {
  photoId: string;
  userCollections?: Collection[];
}

interface Collection {
  id: string;
  name: string;
  description: string;
  photoCount: number;
  isPublic: boolean;
  containsPhoto: boolean;
}

export function PhotoCollections({ photoId, userCollections }: PhotoCollectionsProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { useAddToCollection, useRemoveFromCollection } = useCollections();
  
  const addMutation = useAddToCollection();
  const removeMutation = useRemoveFromCollection();
  
  const handleToggleCollection = (collectionId: string, currentlyInCollection: boolean) => {
    if (currentlyInCollection) {
      removeMutation.mutate({ collectionId, photoId });
    } else {
      addMutation.mutate({ collectionId, photoId });
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Add to Collection</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateModal(true)}
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          New Collection
        </Button>
      </div>
      
      <div className="space-y-2">
        {userCollections?.map((collection) => (
          <div
            key={collection.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{collection.name}</h4>
                {collection.isPublic ? (
                  <GlobeIcon className="w-4 h-4 text-gray-400" />
                ) : (
                  <LockIcon className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <p className="text-sm text-gray-600">
                {collection.photoCount} photos
              </p>
            </div>
            
            <Checkbox
              checked={collection.containsPhoto}
              onCheckedChange={() => 
                handleToggleCollection(collection.id, collection.containsPhoto)
              }
            />
          </div>
        ))}
        
        {(!userCollections || userCollections.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <FolderIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No collections yet.</p>
            <p className="text-sm">Create your first collection to save photos.</p>
          </div>
        )}
      </div>
      
      <CreateCollectionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        photoId={photoId}
      />
    </div>
  );
}
```

### 5. Gallery Search & Discovery

#### 5.1 Advanced Search Interface
**File to create:** `app/routes/gallery.search.tsx`

```typescript
export default function GallerySearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedSearchFilters>({
    query: searchParams.get('q') || '',
    photographer: '',
    camera: '',
    location: '',
    dateRange: null,
    colorPalette: [],
    orientation: 'all',
    minVotes: null,
    hasWon: false
  });
  
  const { useAdvancedSearch } = usePhotos();
  const { data: searchResults, isLoading } = useAdvancedSearch(advancedFilters);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Search Sidebar */}
        <div className="lg:col-span-1">
          <AdvancedSearchFilters
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
          />
        </div>
        
        {/* Search Results */}
        <div className="lg:col-span-3">
          <SearchResults
            results={searchResults}
            query={advancedFilters.query}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
```

#### 5.2 Photo Recommendation Engine
**File to create:** `app/components/features/gallery/photo-recommendations.tsx`

```typescript
interface PhotoRecommendationsProps {
  currentPhoto: Photo;
  userId?: string;
  limit?: number;
}

export function PhotoRecommendations({
  currentPhoto,
  userId,
  limit = 8
}: PhotoRecommendationsProps) {
  const { useRecommendations } = usePhotos();
  const { data: recommendations } = useRecommendations({
    photoId: currentPhoto.id,
    userId,
    limit
  });
  
  if (!recommendations?.length) return null;
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Similar Photos</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {recommendations.map((photo) => (
          <RecommendationCard
            key={photo.id}
            photo={photo}
            reason={photo.recommendationReason}
            onClick={() => navigate(`/gallery/photos/${photo.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  photo: Photo & { recommendationReason: string };
  onClick: () => void;
}

function RecommendationCard({ photo, onClick }: RecommendationCardProps) {
  return (
    <div
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
        <img
          src={photo.filePath}
          alt={photo.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
      </div>
      <div className="mt-2">
        <p className="text-sm font-medium truncate">{photo.title}</p>
        <p className="text-xs text-gray-500 truncate">
          by {photo.photographer.name}
        </p>
        <p className="text-xs text-blue-600 mt-1">
          {photo.recommendationReason}
        </p>
      </div>
    </div>
  );
}
```

### 6. Gallery Analytics & Insights

#### 6.1 Popular Content Dashboard
**File to create:** `app/routes/gallery.trending.tsx`

```typescript
export default function TrendingGallery() {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [category, setCategory] = useState<string | null>(null);
  
  const { useTrendingPhotos, usePopularCategories } = useGallery();
  const { data: trendingPhotos } = useTrendingPhotos({ timeframe, category });
  const { data: popularCategories } = usePopularCategories({ timeframe });
  
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Trending Photos
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover the most popular and trending photos in our community.
        </p>
      </div>
      
      <TrendingFilters
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        category={category}
        onCategoryChange={setCategory}
      />
      
      {/* Popular Categories */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Popular Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {popularCategories?.map((category) => (
            <CategoryTrendCard
              key={category.id}
              category={category}
              trend={category.trend}
              onClick={() => setCategory(category.id)}
            />
          ))}
        </div>
      </div>
      
      {/* Trending Photos */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Most Popular This {timeframe === 'day' ? 'Day' : timeframe === 'week' ? 'Week' : timeframe === 'month' ? 'Month' : 'Year'}
        </h2>
        <TrendingPhotoGrid photos={trendingPhotos} />
      </div>
    </div>
  );
}
```

## Acceptance Criteria

### ✅ Gallery Interface
- [ ] All view modes (masonry, grid, slideshow) work smoothly
- [ ] Infinite scroll loads additional photos seamlessly
- [ ] Image lazy loading improves performance
- [ ] Responsive design works on all screen sizes
- [ ] Photo detail modal shows complete information

### ✅ Search & Discovery
- [ ] Basic search returns relevant results
- [ ] Advanced filters work correctly
- [ ] Search results are properly paginated
- [ ] Photo recommendations are relevant
- [ ] Search performance is acceptable

### ✅ Competition Archives
- [ ] Past competitions are properly organized
- [ ] Winners are prominently displayed
- [ ] Competition galleries load correctly
- [ ] Archive filters work as expected
- [ ] Navigation between competitions is smooth

### ✅ Social Features
- [ ] Photo sharing works on all platforms
- [ ] Collections can be created and managed
- [ ] Embed codes generate correctly
- [ ] Social links open in new windows
- [ ] Favorites/collections sync properly

### ✅ Performance
- [ ] Gallery loads quickly with many photos
- [ ] Image optimization reduces load times
- [ ] Scroll performance is smooth
- [ ] Memory usage remains reasonable
- [ ] Search results appear quickly

## Testing Checklist

### Manual Testing
- [ ] Test gallery with different photo counts
- [ ] Verify responsive design on mobile
- [ ] Test all sharing functionality
- [ ] Check search with various queries
- [ ] Verify collections and favorites
- [ ] Test infinite scroll performance

### Integration Testing
- [ ] Test with public API endpoints
- [ ] Verify image CDN integration
- [ ] Check search indexing
- [ ] Test social sharing metadata
- [ ] Verify analytics tracking

### Performance Testing
- [ ] Test with large photo galleries
- [ ] Verify image lazy loading
- [ ] Check scroll performance
- [ ] Test on slower connections
- [ ] Verify memory usage patterns

## Dependencies

### New Dependencies
```json
{
  "react-intersection-observer": "^9.5.0",
  "react-masonry-css": "^1.0.16",
  "react-window": "^1.8.8",
  "react-window-infinite-loader": "^1.0.9",
  "fuse.js": "^7.0.0"
}
```

## Notes

### Image Optimization Strategy
- Use responsive images with multiple sizes
- Implement progressive JPEG loading
- Add WebP format support with fallbacks
- Use CDN for optimized delivery
- Implement smart caching strategies

### Search Implementation
- Use full-text search for basic queries
- Implement faceted search for filters
- Add search suggestions/autocomplete
- Cache popular searches
- Track search analytics

### Performance Optimization
- Implement virtual scrolling for large galleries
- Use intersection observer for lazy loading
- Optimize image sizes for different viewports
- Add service worker for offline browsing
- Implement smart prefetching

### Social Features Strategy
- Generate Open Graph meta tags for sharing
- Add structured data for SEO
- Implement Pinterest-friendly image metadata
- Support embed codes for external sites
- Add social media analytics tracking

### Gallery Experience
- Support keyboard navigation
- Add photo zoom functionality
- Implement smooth transitions
- Support touch gestures on mobile
- Add accessibility features for screen readers