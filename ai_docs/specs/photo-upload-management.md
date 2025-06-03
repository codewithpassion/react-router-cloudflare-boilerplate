# Photo Upload & Management Specification

## Overview
Photo submission system for users to upload, manage, and edit their competition entries with validation, file handling, and metadata management.

## Features

### 1. Photo Upload
- File validation (JPEG, PNG, max 10MB)
- Required metadata validation
- Per-category submission limits
- Image optimization and storage
- Progress tracking and error handling

### 2. Photo Management
- View user's submissions
- Edit photo metadata
- Delete submissions
- Preview before final submission
- Submission status tracking

## Data Validation Rules

### Required Fields
- **Photo File**: JPEG/PNG, max 10MB
- **Title**: Non-empty after trimming
- **Description**: 20-500 characters after trimming
- **Date Taken**: Valid datetime
- **Location**: Non-empty after trimming

### Optional Fields
- **Camera/Lens**: Equipment information
- **Settings**: Camera settings (ISO, aperture, etc.)

### Business Rules
- Users limited by `maxPhotosPerUser` per category
- Can only submit to active competitions
- Cannot modify photos once approved by admin
- File size and type validation on both client and server

## API Endpoints

### Photo Upload
```typescript
POST /api/photos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: <photo file>
- categoryId: string
- title: string
- description: string (20-500 chars)
- dateTaken: datetime
- location: string
- cameraInfo?: string
- settings?: string

Response:
{
  "id": "photo_123",
  "title": "Mountain Wildlife",
  "status": "pending",
  "filePath": "/uploads/comp_123/photo_123.jpg",
  "categoryId": "cat_1",
  "competitionId": "comp_123",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Update Photo Metadata
```typescript
PUT /api/photos/:id
Authorization: Bearer <token>

Request:
{
  "title": "Updated Photo Title",
  "description": "Updated description with at least 20 characters",
  "dateTaken": "2024-01-10T15:30:00Z",
  "location": "Updated Location",
  "cameraInfo": "Canon EOS R5",
  "settings": "ISO 800, f/5.6, 1/500s"
}

Response:
{
  "id": "photo_123",
  "title": "Updated Photo Title",
  "status": "pending",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

### Delete Photo
```typescript
DELETE /api/photos/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

### Get User Photos
```typescript
GET /api/photos/mine?competitionId=comp_123&categoryId=cat_1

Response:
{
  "photos": [
    {
      "id": "photo_123",
      "title": "Mountain Wildlife",
      "description": "A beautiful capture of wildlife in their natural habitat...",
      "status": "pending",
      "categoryId": "cat_1",
      "categoryName": "Landscape",
      "filePath": "/uploads/comp_123/photo_123.jpg",
      "voteCount": 0,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "submissionCounts": {
    "cat_1": 2,
    "cat_2": 1
  },
  "limits": {
    "cat_1": 5,
    "cat_2": 3
  }
}
```

## Implementation

### 1. Photo Service

#### File: `api/services/photo.service.ts`

```typescript
import { db } from '../database/db';
import { photos, categories, competitions } from '../database/competition-schema';
import { eq, and, count } from 'drizzle-orm';
import { generateId } from '../utils/id';

export interface PhotoUploadData {
  userId: string;
  categoryId: string;
  title: string;
  description: string;
  dateTaken: string;
  location: string;
  cameraInfo?: string;
  settings?: string;
  file: File;
}

export class PhotoService {
  
  async uploadPhoto(data: PhotoUploadData): Promise<any> {
    // Validate competition is active
    const category = await db
      .select({
        id: categories.id,
        competitionId: categories.competitionId,
        maxPhotosPerUser: categories.maxPhotosPerUser,
        competition: {
          status: competitions.status
        }
      })
      .from(categories)
      .innerJoin(competitions, eq(categories.competitionId, competitions.id))
      .where(eq(categories.id, data.categoryId))
      .get();

    if (!category) {
      throw new Error('Category not found');
    }

    if (category.competition.status !== 'active') {
      throw new Error('Competition is not active');
    }

    // Check submission limits
    const userPhotoCount = await db
      .select({ count: count() })
      .from(photos)
      .where(and(
        eq(photos.userId, data.userId),
        eq(photos.categoryId, data.categoryId),
        eq(photos.status, 'pending') // Only count pending/approved photos
      ))
      .get();

    if (userPhotoCount.count >= category.maxPhotosPerUser) {
      throw new Error(`Maximum ${category.maxPhotosPerUser} photos allowed per category`);
    }

    // Validate photo metadata
    this.validatePhotoData(data);

    // Upload file to Cloudflare R2/Images
    const filePath = await this.uploadFile(data.file, category.competitionId);

    // Save photo record
    const photoId = generateId('photo');
    const [photo] = await db.insert(photos).values({
      id: photoId,
      userId: data.userId,
      categoryId: data.categoryId,
      competitionId: category.competitionId,
      title: data.title.trim(),
      description: data.description.trim(),
      dateTaken: data.dateTaken,
      location: data.location.trim(),
      cameraInfo: data.cameraInfo?.trim(),
      settings: data.settings?.trim(),
      filePath,
      fileSize: data.file.size,
      mimeType: data.file.type,
      status: 'pending',
    }).returning();

    return photo;
  }

  async updatePhoto(id: string, userId: string, updates: Partial<{
    title: string;
    description: string;
    dateTaken: string;
    location: string;
    cameraInfo: string;
    settings: string;
  }>) {
    // Get current photo
    const currentPhoto = await db
      .select()
      .from(photos)
      .where(and(
        eq(photos.id, id),
        eq(photos.userId, userId)
      ))
      .get();

    if (!currentPhoto) {
      throw new Error('Photo not found');
    }

    // Check if photo can be edited (not approved)
    if (currentPhoto.status === 'approved') {
      throw new Error('Cannot edit approved photos');
    }

    // Validate updates
    if (updates.title !== undefined) {
      if (!updates.title.trim()) {
        throw new Error('Title cannot be empty');
      }
      updates.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      const desc = updates.description.trim();
      if (desc.length < 20 || desc.length > 500) {
        throw new Error('Description must be between 20-500 characters');
      }
      updates.description = desc;
    }

    if (updates.location !== undefined) {
      if (!updates.location.trim()) {
        throw new Error('Location cannot be empty');
      }
      updates.location = updates.location.trim();
    }

    // Update photo
    const [updated] = await db
      .update(photos)
      .set({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(photos.id, id))
      .returning();

    return updated;
  }

  async deletePhoto(id: string, userId: string) {
    const photo = await db
      .select()
      .from(photos)
      .where(and(
        eq(photos.id, id),
        eq(photos.userId, userId)
      ))
      .get();

    if (!photo) {
      throw new Error('Photo not found');
    }

    if (photo.status === 'approved') {
      throw new Error('Cannot delete approved photos');
    }

    // Delete file from storage
    await this.deleteFile(photo.filePath);

    // Delete photo record
    await db.delete(photos).where(eq(photos.id, id));

    return { success: true };
  }

  async getUserPhotos(userId: string, competitionId?: string, categoryId?: string) {
    let query = db
      .select({
        id: photos.id,
        title: photos.title,
        description: photos.description,
        status: photos.status,
        categoryId: photos.categoryId,
        categoryName: categories.name,
        filePath: photos.filePath,
        dateTaken: photos.dateTaken,
        location: photos.location,
        cameraInfo: photos.cameraInfo,
        settings: photos.settings,
        createdAt: photos.createdAt,
        updatedAt: photos.updatedAt,
      })
      .from(photos)
      .innerJoin(categories, eq(photos.categoryId, categories.id))
      .where(eq(photos.userId, userId));

    if (competitionId) {
      query = query.where(and(
        eq(photos.userId, userId),
        eq(photos.competitionId, competitionId)
      ));
    }

    if (categoryId) {
      query = query.where(and(
        eq(photos.userId, userId),
        eq(photos.categoryId, categoryId)
      ));
    }

    const userPhotos = await query;

    // Get submission counts per category
    const submissionCounts = await this.getUserSubmissionCounts(userId, competitionId);

    return {
      photos: userPhotos,
      submissionCounts,
    };
  }

  private async getUserSubmissionCounts(userId: string, competitionId?: string) {
    // Implementation to count photos per category for the user
    // Returns object like { "cat_1": 2, "cat_2": 1 }
  }

  private validatePhotoData(data: PhotoUploadData) {
    // Title validation
    if (!data.title.trim()) {
      throw new Error('Title is required');
    }

    // Description validation
    const desc = data.description.trim();
    if (desc.length < 20 || desc.length > 500) {
      throw new Error('Description must be between 20-500 characters');
    }

    // Location validation
    if (!data.location.trim()) {
      throw new Error('Location is required');
    }

    // Date validation
    const dateTaken = new Date(data.dateTaken);
    if (isNaN(dateTaken.getTime())) {
      throw new Error('Invalid date format');
    }

    // File validation
    if (!data.file) {
      throw new Error('Photo file is required');
    }

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(data.file.type)) {
      throw new Error('Only JPEG and PNG files are allowed');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (data.file.size > maxSize) {
      throw new Error('File size cannot exceed 10MB');
    }
  }

  private async uploadFile(file: File, competitionId: string): Promise<string> {
    // Implementation for Cloudflare R2/Images upload
    // Returns the file path/URL
    const fileName = `${generateId('img')}.${file.name.split('.').pop()}`;
    const filePath = `competitions/${competitionId}/${fileName}`;
    
    // Upload to Cloudflare R2 or Images
    // This would use the Cloudflare SDK or API
    
    return filePath;
  }

  private async deleteFile(filePath: string): Promise<void> {
    // Implementation to delete file from Cloudflare storage
  }
}
```

### 2. Photo Upload API Routes

#### File: `api/routes/photos.ts`

```typescript
import { Hono } from 'hono';
import { PhotoService } from '../services/photo.service';
import { authMiddleware } from '../../workers/auth-middleware';

const app = new Hono();
const photoService = new PhotoService();

// User photo management
app.use('/*', authMiddleware);

app.post('/upload', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'Photo file is required' }, 400);
    }

    const photoData = {
      userId: user.id,
      categoryId: formData.get('categoryId') as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      dateTaken: formData.get('dateTaken') as string,
      location: formData.get('location') as string,
      cameraInfo: formData.get('cameraInfo') as string || undefined,
      settings: formData.get('settings') as string || undefined,
      file,
    };

    const photo = await photoService.uploadPhoto(photoData);
    return c.json(photo, 201);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

app.put('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const updates = await c.req.json();

  try {
    const photo = await photoService.updatePhoto(id, user.id, updates);
    return c.json(photo);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  try {
    const result = await photoService.deletePhoto(id, user.id);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/mine', async (c) => {
  const user = c.get('user');
  const competitionId = c.req.query('competitionId');
  const categoryId = c.req.query('categoryId');

  try {
    const result = await photoService.getUserPhotos(user.id, competitionId, categoryId);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

export default app;
```

### 3. Frontend Upload Component

#### File: `app/components/photo-upload.tsx`

```typescript
import { useState, useRef } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { useSubmitPost } from '~/hooks/use-submit-post';

interface PhotoUploadProps {
  competitionId: string;
  categories: Array<{
    id: string;
    name: string;
    maxPhotosPerUser: number;
  }>;
  userSubmissionCounts: Record<string, number>;
  onSuccess?: (photo: any) => void;
}

export function PhotoUpload({ 
  competitionId, 
  categories, 
  userSubmissionCounts,
  onSuccess 
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    title: '',
    description: '',
    dateTaken: '',
    location: '',
    cameraInfo: '',
    settings: '',
  });

  const { submit, loading, error } = useSubmitPost('/api/photos/upload');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('Only JPEG and PNG files are allowed');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size cannot exceed 10MB');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Please select a photo');
      return;
    }

    // Validate required fields
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    const description = formData.description.trim();
    if (description.length < 20 || description.length > 500) {
      alert('Description must be between 20-500 characters');
      return;
    }

    if (!formData.location.trim()) {
      alert('Location is required');
      return;
    }

    if (!formData.dateTaken) {
      alert('Date taken is required');
      return;
    }

    if (!formData.categoryId) {
      alert('Please select a category');
      return;
    }

    // Check submission limits
    const category = categories.find(c => c.id === formData.categoryId);
    const currentCount = userSubmissionCounts[formData.categoryId] || 0;
    
    if (currentCount >= (category?.maxPhotosPerUser || 0)) {
      alert(`Maximum ${category?.maxPhotosPerUser} photos allowed for ${category?.name}`);
      return;
    }

    try {
      const submitData = new FormData();
      submitData.append('file', selectedFile);
      submitData.append('categoryId', formData.categoryId);
      submitData.append('title', formData.title.trim());
      submitData.append('description', description);
      submitData.append('dateTaken', formData.dateTaken);
      submitData.append('location', formData.location.trim());
      
      if (formData.cameraInfo.trim()) {
        submitData.append('cameraInfo', formData.cameraInfo.trim());
      }
      
      if (formData.settings.trim()) {
        submitData.append('settings', formData.settings.trim());
      }

      const result = await submit(submitData);
      
      // Reset form
      setSelectedFile(null);
      setPreview(null);
      setFormData({
        categoryId: '',
        title: '',
        description: '',
        dateTaken: '',
        location: '',
        cameraInfo: '',
        settings: '',
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onSuccess?.(result);
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  const getAvailableCategories = () => {
    return categories.filter(category => {
      const currentCount = userSubmissionCounts[category.id] || 0;
      return currentCount < category.maxPhotosPerUser;
    });
  };

  const availableCategories = getAvailableCategories();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File Upload */}
      <div>
        <label className="block mb-2">Photo File</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileSelect}
          className="block w-full"
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          JPEG or PNG, maximum 10MB
        </p>
      </div>

      {/* Preview */}
      {preview && (
        <div>
          <label className="block mb-2">Preview</label>
          <img 
            src={preview} 
            alt="Preview" 
            className="max-w-xs max-h-48 object-contain border rounded"
          />
        </div>
      )}

      {/* Category Selection */}
      <div>
        <label htmlFor="category">Category</label>
        <select
          id="category"
          value={formData.categoryId}
          onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select a category</option>
          {availableCategories.map(category => {
            const currentCount = userSubmissionCounts[category.id] || 0;
            return (
              <option key={category.id} value={category.id}>
                {category.name} ({currentCount}/{category.maxPhotosPerUser} used)
              </option>
            );
          })}
        </select>
        
        {availableCategories.length === 0 && (
          <p className="text-sm text-red-500 mt-1">
            You have reached the submission limit for all categories
          </p>
        )}
      </div>

      {/* Required Fields */}
      <div>
        <label htmlFor="title">Title</label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe your photo (20-500 characters)"
          minLength={20}
          maxLength={500}
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          {formData.description.length}/500 characters (minimum 20)
        </p>
      </div>

      <div>
        <label htmlFor="dateTaken">Date Taken</label>
        <Input
          id="dateTaken"
          type="datetime-local"
          value={formData.dateTaken}
          onChange={(e) => setFormData(prev => ({ ...prev, dateTaken: e.target.value }))}
          required
        />
      </div>

      <div>
        <label htmlFor="location">Location</label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          placeholder="Where was this photo taken?"
          required
        />
      </div>

      {/* Optional Fields */}
      <div>
        <label htmlFor="cameraInfo">Camera/Lens (Optional)</label>
        <Input
          id="cameraInfo"
          value={formData.cameraInfo}
          onChange={(e) => setFormData(prev => ({ ...prev, cameraInfo: e.target.value }))}
          placeholder="e.g., Canon EOS R5, 24-70mm f/2.8"
        />
      </div>

      <div>
        <label htmlFor="settings">Camera Settings (Optional)</label>
        <Input
          id="settings"
          value={formData.settings}
          onChange={(e) => setFormData(prev => ({ ...prev, settings: e.target.value }))}
          placeholder="e.g., ISO 800, f/5.6, 1/500s"
        />
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <Button 
        type="submit" 
        disabled={loading || !selectedFile || availableCategories.length === 0}
      >
        {loading ? 'Uploading...' : 'Submit Photo'}
      </Button>
    </form>
  );
}
```

## File Storage Strategy

### Cloudflare R2 Configuration
- Bucket: `photo-competition-uploads`
- Structure: `competitions/{competitionId}/{photoId}.{ext}`
- Access: Private with signed URLs for viewing
- Backup: Automatic replication

### Image Processing
- Automatic optimization for web display
- Thumbnail generation for galleries
- EXIF data extraction for metadata
- Progressive JPEG encoding

## Testing Strategy

### Unit Tests
- Photo validation logic
- File upload handling
- Metadata validation
- Submission limit checking

### Integration Tests
- Complete upload flow
- File storage operations
- Database transactions
- Error handling scenarios

### E2E Tests
- User photo submission journey
- Form validation behavior
- File upload progress
- Photo management operations