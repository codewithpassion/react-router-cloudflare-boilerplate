# Phase 2: Photo Submission System

## Overview
Build comprehensive photo upload and management system with drag & drop, metadata editing, and user photo dashboard.

## Duration
**Estimated: 1 Week**

## Prerequisites
- ✅ Phase 1: Core Infrastructure completed
- ✅ tRPC photo router implemented
- ✅ File upload utilities ready

## Tasks

### 1. Photo Upload Component

#### 1.1 File Dropzone Component
**File to create:** `app/components/shared/file-dropzone.tsx`

```typescript
interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

export function FileDropzone({
  onFilesSelected,
  accept = 'image/*',
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 1,
  disabled = false,
  className
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  // Implementation features:
  // - Drag and drop handling
  // - File validation (type, size, count)
  // - Visual feedback for drag states
  // - Error display
  // - Click to browse fallback
}
```

**Features:**
- Visual drag & drop zone with hover states
- File type and size validation
- Multiple file support with preview
- Error handling and user feedback
- Accessible keyboard navigation
- Mobile-friendly touch support

#### 1.2 Upload Progress Component
**File to create:** `app/components/features/photos/upload-progress.tsx`

```typescript
interface UploadProgressProps {
  files: UploadFile[];
  onRemove: (fileId: string) => void;
  onRetry: (fileId: string) => void;
}

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  preview?: string;
}

export function UploadProgress({ files, onRemove, onRetry }: UploadProgressProps) {
  // Implementation features:
  // - Progress bars for each file
  // - Thumbnail previews
  // - Status indicators
  // - Remove/retry actions
  // - Overall upload summary
}
```

#### 1.3 Main Photo Upload Component
**File to create:** `app/components/features/photos/photo-upload.tsx`

```typescript
interface PhotoUploadProps {
  competitionId: string;
  categoryId?: string;
  onSuccess?: (photos: any[]) => void;
  onError?: (error: string) => void;
  maxPhotos?: number;
}

export function PhotoUpload({ 
  competitionId, 
  categoryId,
  onSuccess,
  onError,
  maxPhotos = 3 
}: PhotoUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [currentStep, setCurrentStep] = useState<'select' | 'metadata' | 'uploading'>('select');
  
  const { useUploadBase64, useCreateFromUpload } = usePhotos();
  const uploadMutation = useUploadBase64();
  
  // Implementation features:
  // - Multi-step upload wizard
  // - File validation and compression
  // - Metadata form for each photo
  // - Progress tracking
  // - Error handling and retry logic
  // - Success confirmation
}
```

**Upload Flow:**
1. **File Selection** - Drag & drop or browse files
2. **Metadata Entry** - Title, description, date taken, location, camera info
3. **Upload Progress** - Real-time progress with ability to cancel
4. **Confirmation** - Success message with links to manage photos

### 2. Photo Metadata Form

#### 2.1 Photo Metadata Editor
**File to create:** `app/components/features/photos/photo-metadata-form.tsx`

```typescript
interface PhotoMetadataFormProps {
  photo: {
    id?: string;
    file?: File;
    preview: string;
    title?: string;
    description?: string;
    dateTaken?: string;
    location?: string;
    cameraInfo?: string;
    settings?: string;
  };
  competitionId: string;
  categoryId: string;
  onSubmit: (data: PhotoMetadata) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface PhotoMetadata {
  title: string;
  description: string;
  dateTaken: string;
  location: string;
  cameraInfo?: string;
  settings?: string;
}

export function PhotoMetadataForm({
  photo,
  competitionId,
  categoryId,
  onSubmit,
  onCancel,
  isSubmitting = false
}: PhotoMetadataFormProps) {
  // Implementation with react-hook-form
  // - Required field validation
  // - Character count for description
  // - Date picker for dateTaken
  // - Auto-suggestions for location/camera
  // - Real-time preview updates
}
```

**Form Fields:**
- **Title** (required, max 200 chars)
- **Description** (required, 20-500 chars)
- **Date Taken** (required, date picker)
- **Location** (required, text input with suggestions)
- **Camera Info** (optional, auto-suggestions)
- **Settings** (optional, ISO/aperture/shutter speed)

#### 2.2 EXIF Data Extraction
**File to create:** `app/utils/exif-reader.ts`

```typescript
export interface ExifData {
  dateTaken?: Date;
  camera?: string;
  lens?: string;
  settings?: {
    iso?: number;
    aperture?: string;
    shutterSpeed?: string;
    focalLength?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

export function extractExifData(file: File): Promise<ExifData> {
  // Implementation using exif-js or similar library
  // - Extract camera make/model
  // - Get photo settings (ISO, aperture, etc.)
  // - Extract GPS coordinates if available
  // - Format data for form population
}

export function formatCameraInfo(exif: ExifData): string {
  // Format camera info string from EXIF data
}

export function formatSettings(exif: ExifData): string {
  // Format settings string from EXIF data
}
```

### 3. User Photo Management

#### 3.1 User Photos Dashboard
**File to create:** `app/routes/_auth.photos.tsx`

```typescript
export default function UserPhotos() {
  const { useUserPhotos, useDelete } = usePhotos();
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'votes'>('date');
  
  const { data: photos, isLoading } = useUserPhotos({});
  const deleteMutation = useDelete();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">My Photos</h1>
          <p className="text-gray-600">Manage your photo submissions</p>
        </div>
        <Button asChild>
          <Link to="/competitions">Submit New Photo</Link>
        </Button>
      </div>
      
      <PhotoFilters 
        status={filterStatus}
        sortBy={sortBy}
        onStatusChange={setFilterStatus}
        onSortChange={setSortBy}
      />
      
      <PhotoGrid 
        photos={photos}
        selectedPhotos={selectedPhotos}
        onSelect={setSelectedPhotos}
        onEdit={(photoId) => navigate(`/photos/${photoId}/edit`)}
        onDelete={(photoId) => handleDelete(photoId)}
        enableSelection={true}
      />
      
      {selectedPhotos.length > 0 && (
        <BulkActions 
          selectedCount={selectedPhotos.length}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setSelectedPhotos([])}
        />
      )}
    </div>
  );
}
```

#### 3.2 Photo Grid Component
**File to create:** `app/components/features/photos/photo-grid.tsx`

```typescript
interface PhotoGridProps {
  photos: Photo[];
  selectedPhotos?: string[];
  onSelect?: (photoIds: string[]) => void;
  onEdit?: (photoId: string) => void;
  onDelete?: (photoId: string) => void;
  enableSelection?: boolean;
  enableVoting?: boolean;
  layout?: 'grid' | 'masonry' | 'list';
  size?: 'sm' | 'md' | 'lg';
}

export function PhotoGrid({
  photos,
  selectedPhotos = [],
  onSelect,
  onEdit,
  onDelete,
  enableSelection = false,
  enableVoting = false,
  layout = 'grid',
  size = 'md'
}: PhotoGridProps) {
  // Implementation features:
  // - Responsive grid/masonry layout
  // - Photo selection with checkboxes
  // - Lazy loading with intersection observer
  // - Infinite scroll support
  // - Empty states
  // - Loading skeletons
}
```

#### 3.3 Photo Edit Page
**File to create:** `app/routes/_auth.photos.$id.edit.tsx`

```typescript
export default function EditPhoto() {
  const { id } = useParams();
  const { usePhotoById, useUpdate } = usePhotos();
  
  const { data: photo, isLoading } = usePhotoById(id!);
  const updateMutation = useUpdate();
  
  if (isLoading) return <PhotoEditSkeleton />;
  if (!photo) return <NotFound />;
  if (photo.status !== 'pending') {
    return <Alert>This photo cannot be edited after moderation.</Alert>;
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link to="/photos">← Back to Photos</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Edit Photo</h1>
          <p className="text-gray-600">Update your photo details</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <img 
            src={photo.filePath} 
            alt={photo.title}
            className="w-full rounded-lg shadow-lg"
          />
        </div>
        
        <PhotoMetadataForm
          photo={photo}
          competitionId={photo.competitionId}
          categoryId={photo.categoryId}
          onSubmit={handleUpdate}
          onCancel={() => navigate('/photos')}
          isSubmitting={updateMutation.isLoading}
        />
      </div>
    </div>
  );
}
```

### 4. Image Processing Utilities

#### 4.1 Image Compression
**File to create:** `app/utils/image-processing.ts`

```typescript
export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'jpeg' | 'webp';
}

export function compressImage(
  file: File, 
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    format = 'jpeg'
  } = options;
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      const { width, height } = calculateDimensions(
        img.width, 
        img.height, 
        maxWidth, 
        maxHeight
      );
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: `image/${format}`,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Compression failed'));
          }
        },
        `image/${format}`,
        quality
      );
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // Implementation for aspect ratio calculation
}
```

#### 4.2 Image Preview Generation
**File to create:** `app/utils/image-preview.ts`

```typescript
export function generatePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function generateThumbnail(
  file: File, 
  size: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      
      // Calculate crop to center square
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      
      ctx?.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
```

### 5. Submission Flow Components

#### 5.1 Competition Photo Submission
**File to create:** `app/routes/_auth.competitions.$id.submit.tsx`

```typescript
export default function SubmitPhoto() {
  const { id } = useParams();
  const { useById: useCompetitionById } = useCompetitions();
  const { useSubmissionCounts } = usePhotos();
  
  const { data: competition } = useCompetitionById(id!);
  const { data: submissionCounts } = useSubmissionCounts(id);
  
  if (!competition) return <NotFound />;
  if (competition.status !== 'open') {
    return <Alert>This competition is not currently accepting submissions.</Alert>;
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Submit to {competition.title}</h1>
        <p className="text-gray-600">Upload your photos for this competition</p>
      </div>
      
      <CompetitionInfo competition={competition} />
      
      <CategorySelector 
        categories={competition.categories}
        submissionCounts={submissionCounts}
        onCategorySelect={setSelectedCategory}
      />
      
      {selectedCategory && (
        <PhotoUpload 
          competitionId={id!}
          categoryId={selectedCategory.id}
          maxPhotos={selectedCategory.maxPhotosPerUser}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
```

#### 5.2 Category Selector
**File to create:** `app/components/features/competitions/category-selector.tsx`

```typescript
interface CategorySelectorProps {
  categories: Category[];
  submissionCounts: Record<string, number>;
  onCategorySelect: (category: Category) => void;
  selectedCategory?: Category;
}

export function CategorySelector({
  categories,
  submissionCounts,
  onCategorySelect,
  selectedCategory
}: CategorySelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Select Category</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const currentCount = submissionCounts[category.id] || 0;
          const isAvailable = currentCount < category.maxPhotosPerUser;
          
          return (
            <Card 
              key={category.id}
              className={cn(
                'cursor-pointer transition-colors',
                selectedCategory?.id === category.id && 'ring-2 ring-primary',
                !isAvailable && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => isAvailable && onCategorySelect(category)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{category.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {category.description}
                    </p>
                  </div>
                  <Badge variant={isAvailable ? 'secondary' : 'destructive'}>
                    {currentCount}/{category.maxPhotosPerUser}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

## Acceptance Criteria

### ✅ File Upload
- [ ] Drag & drop works on desktop and mobile
- [ ] File validation prevents invalid uploads
- [ ] Progress tracking shows real-time updates
- [ ] Error handling with retry options
- [ ] Multiple file upload support

### ✅ Photo Management
- [ ] Users can view all their photos
- [ ] Filtering and sorting works correctly
- [ ] Photo editing updates metadata
- [ ] Bulk actions work for multiple photos
- [ ] Deletion requires confirmation

### ✅ Metadata Forms
- [ ] All required fields are validated
- [ ] EXIF data auto-populates when available
- [ ] Character limits are enforced
- [ ] Date picker works correctly
- [ ] Form saves draft state

### ✅ Image Processing
- [ ] Images are compressed before upload
- [ ] Thumbnails generate correctly
- [ ] Large files are handled gracefully
- [ ] Memory usage is optimized

### ✅ Performance
- [ ] Upload progress is smooth
- [ ] Large galleries load quickly
- [ ] Image lazy loading works
- [ ] No memory leaks in file handling

## Testing Checklist

### Manual Testing
- [ ] Upload various file types and sizes
- [ ] Test drag & drop on different browsers
- [ ] Verify mobile upload experience
- [ ] Check form validation edge cases
- [ ] Test network interruptions during upload

### Integration Testing
- [ ] Test with tRPC endpoints
- [ ] Verify file upload to storage
- [ ] Check metadata persistence
- [ ] Test permission checks

## Dependencies

### New Dependencies
```json
{
  "react-hook-form": "^7.48.0",
  "@hookform/resolvers": "^3.3.0",
  "react-intersection-observer": "^9.5.0",
  "exif-js": "^2.3.0",
  "date-fns": "^3.0.0"
}
```

## Notes

### File Upload Strategy
- Use base64 for files < 2MB (simpler, works with tRPC)
- Use traditional multipart for larger files
- Implement chunked upload for very large files (future)
- Add client-side compression to reduce upload times

### Error Handling
- Network errors: Show retry button
- Validation errors: Highlight specific fields
- Upload errors: Allow individual file retry
- Server errors: Show user-friendly messages

### Performance Considerations
- Lazy load images in galleries
- Compress images before upload
- Use intersection observer for infinite scroll
- Implement virtual scrolling for large lists

### Mobile Experience
- Touch-friendly drag areas
- Optimized file picker
- Responsive metadata forms
- Simplified bulk actions