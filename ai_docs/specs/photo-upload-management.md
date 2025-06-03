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

## tRPC Procedures

### Photo Router

#### File: `api/trpc/routers/photo.ts`

```typescript
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { PhotoService } from '../../services/photo.service';
import { 
  idSchema, 
  dateStringSchema,
  paginationSchema 
} from '../schemas/common';
import { 
  SubmissionLimitExceededError, 
  PhotoNotFoundError 
} from '../errors';
import { TRPCError } from '@trpc/server';

// Note: File uploads in tRPC require special handling
// We'll need to use a multipart form data parser

const photoUploadSchema = z.object({
  categoryId: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().min(20).max(500),
  dateTaken: dateStringSchema,
  location: z.string().min(1).max(200),
  cameraInfo: z.string().max(200).optional(),
  settings: z.string().max(200).optional(),
  // File will be handled separately in the multipart upload
});

const photoUpdateSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(20).max(500).optional(),
  dateTaken: dateStringSchema.optional(),
  location: z.string().min(1).max(200).optional(),
  cameraInfo: z.string().max(200).optional(),
  settings: z.string().max(200).optional(),
});

const getUserPhotosSchema = z.object({
  competitionId: idSchema.optional(),
  categoryId: idSchema.optional(),
});

const photoService = new PhotoService();

export const photoRouter = createTRPCRouter({
  // Upload photo (requires authentication)
  // Note: This will need special handling for file uploads
  upload: protectedProcedure
    .input(photoUploadSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // In a real implementation, you'd extract the file from the request
        // This might require custom middleware or a different approach
        // For now, we'll assume the file is handled separately
        
        const result = await photoService.uploadPhoto({
          userId: ctx.user.id,
          ...input,
          file: ctx.file, // This would need to be extracted from multipart data
        });

        return result;
      } catch (error) {
        if (error.message.includes('Maximum') && error.message.includes('photos allowed')) {
          throw new SubmissionLimitExceededError(
            parseInt(error.message.match(/\d+/)?.[0] || '0')
          );
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  // Update photo metadata
  update: protectedProcedure
    .input(photoUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      try {
        return await photoService.updatePhoto(id, ctx.user.id, updates);
      } catch (error) {
        if (error.message.includes('not found')) {
          throw new PhotoNotFoundError();
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  // Delete photo
  delete: protectedProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await photoService.deletePhoto(input.id, ctx.user.id);
      } catch (error) {
        if (error.message.includes('not found')) {
          throw new PhotoNotFoundError();
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  // Get user's photos
  getUserPhotos: protectedProcedure
    .input(getUserPhotosSchema)
    .query(async ({ ctx, input }) => {
      return await photoService.getUserPhotos(
        ctx.user.id, 
        input.competitionId, 
        input.categoryId
      );
    }),

  // Get photo by ID (for editing)
  getById: protectedProcedure
    .input(z.object({ id: idSchema }))
    .query(async ({ ctx, input }) => {
      const photo = await photoService.getPhotoById(input.id, ctx.user.id);
      if (!photo) {
        throw new PhotoNotFoundError();
      }
      return photo;
    }),

  // Get submission counts for user
  getSubmissionCounts: protectedProcedure
    .input(z.object({ competitionId: idSchema.optional() }))
    .query(async ({ ctx, input }) => {
      return await photoService.getUserSubmissionCounts(
        ctx.user.id, 
        input.competitionId
      );
    }),
});
```

### Alternative File Upload Approach

Since tRPC doesn't handle multipart form data natively, we have a few options:

#### Option 1: Custom Upload Endpoint + tRPC Metadata

```typescript
// File: api/routes/upload.ts (traditional endpoint for file handling)
import { Hono } from 'hono';
import { authMiddleware } from '../../workers/auth-middleware';

const app = new Hono();

app.post('/photos/upload', authMiddleware, async (c) => {
  const user = c.get('user');
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  
  // Handle file upload and return file info
  const fileInfo = await uploadFileToStorage(file);
  
  return c.json({
    fileId: fileInfo.id,
    filePath: fileInfo.path,
    fileSize: file.size,
    mimeType: file.type,
  });
});

// Then use tRPC to create the photo record
export const photoRouter = createTRPCRouter({
  createFromUpload: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      filePath: z.string(),
      fileSize: z.number(),
      mimeType: z.string(),
      categoryId: idSchema,
      title: z.string().min(1).max(200),
      description: z.string().min(20).max(500),
      dateTaken: dateStringSchema,
      location: z.string().min(1).max(200),
      cameraInfo: z.string().max(200).optional(),
      settings: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await photoService.createPhotoFromUpload({
        userId: ctx.user.id,
        ...input,
      });
    }),
});
```

#### Option 2: Base64 Upload (for smaller files)

```typescript
export const photoRouter = createTRPCRouter({
  uploadBase64: protectedProcedure
    .input(z.object({
      fileData: z.string(), // Base64 encoded file
      fileName: z.string(),
      mimeType: z.enum(['image/jpeg', 'image/png']),
      categoryId: idSchema,
      title: z.string().min(1).max(200),
      description: z.string().min(20).max(500),
      dateTaken: dateStringSchema,
      location: z.string().min(1).max(200),
      cameraInfo: z.string().max(200).optional(),
      settings: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Decode base64 and create file
      const fileBuffer = Buffer.from(input.fileData, 'base64');
      
      // Validate file size (10MB limit)
      if (fileBuffer.length > 10 * 1024 * 1024) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File size cannot exceed 10MB',
        });
      }

      const file = new File([fileBuffer], input.fileName, {
        type: input.mimeType,
      });

      return await photoService.uploadPhoto({
        userId: ctx.user.id,
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        dateTaken: input.dateTaken,
        location: input.location,
        cameraInfo: input.cameraInfo,
        settings: input.settings,
        file,
      });
    }),
});
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

### 2. Client-Side Usage with tRPC

#### Custom Hooks for Photo Management

```typescript
// File: app/hooks/use-photos.ts
import { trpc } from '~/utils/trpc';

export function usePhotos() {
  return {
    // Get user's photos
    useUserPhotos: (params: { competitionId?: string; categoryId?: string }) =>
      trpc.photo.getUserPhotos.useQuery(params),

    // Get photo by ID for editing
    usePhotoById: (id: string) =>
      trpc.photo.getById.useQuery(
        { id },
        { enabled: !!id }
      ),

    // Get submission counts
    useSubmissionCounts: (competitionId?: string) =>
      trpc.photo.getSubmissionCounts.useQuery(
        { competitionId },
        { staleTime: 5 * 60 * 1000 } // Counts are relatively stable
      ),

    // Mutations
    useUpload: () => trpc.photo.upload.useMutation(),
    useUploadBase64: () => trpc.photo.uploadBase64.useMutation(),
    useCreateFromUpload: () => trpc.photo.createFromUpload.useMutation(),
    useUpdate: () => trpc.photo.update.useMutation(),
    useDelete: () => trpc.photo.delete.useMutation(),
  };
}

// Utility functions for file handling
export function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function validatePhotoFile(file: File): { valid: boolean; error?: string } {
  // File type validation
  const allowedTypes = ['image/jpeg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG and PNG files are allowed' };
  }

  // File size validation (10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size cannot exceed 10MB' };
  }

  return { valid: true };
}
```

### 3. Frontend Upload Component with tRPC

#### File: `app/components/photo-upload.tsx`

```typescript
import { useState, useRef } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { usePhotos, convertFileToBase64, validatePhotoFile } from '~/hooks/use-photos';
import { useCompetitions } from '~/hooks/use-competitions';
import { trpc } from '~/utils/trpc';

interface PhotoUploadProps {
  competitionId: string;
  onSuccess?: (photo: any) => void;
}

export function PhotoUpload({ competitionId, onSuccess }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'base64' | 'traditional'>('base64');
  
  const [formData, setFormData] = useState({
    categoryId: '',
    title: '',
    description: '',
    dateTaken: '',
    location: '',
    cameraInfo: '',
    settings: '',
  });

  const { useById: useCompetitionById } = useCompetitions();
  const { 
    useUploadBase64, 
    useCreateFromUpload, 
    useSubmissionCounts 
  } = usePhotos();
  const utils = trpc.useUtils();

  // Get competition and categories
  const { data: competition } = useCompetitionById(competitionId);
  const { data: submissionCounts } = useSubmissionCounts(competitionId);

  const uploadBase64Mutation = useUploadBase64();
  const createFromUploadMutation = useCreateFromUpload();

  const categories = competition?.categories || [];
  const userSubmissionCounts = submissionCounts || {};

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validatePhotoFile(file);
    if (!validation.valid) {
      alert(validation.error);
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
      let result;

      if (uploadMethod === 'base64') {
        // Convert file to base64 and upload via tRPC
        const base64Data = await convertFileToBase64(selectedFile);
        
        result = await uploadBase64Mutation.mutateAsync({
          fileData: base64Data,
          fileName: selectedFile.name,
          mimeType: selectedFile.type as 'image/jpeg' | 'image/png',
          categoryId: formData.categoryId,
          title: formData.title.trim(),
          description: description,
          dateTaken: formData.dateTaken,
          location: formData.location.trim(),
          cameraInfo: formData.cameraInfo.trim() || undefined,
          settings: formData.settings.trim() || undefined,
        });
      } else {
        // Use traditional upload endpoint + tRPC metadata
        // First upload file to get file info
        const fileFormData = new FormData();
        fileFormData.append('file', selectedFile);
        
        const uploadResponse = await fetch('/api/photos/upload', {
          method: 'POST',
          body: fileFormData,
          credentials: 'include',
        });
        
        if (!uploadResponse.ok) {
          throw new Error('File upload failed');
        }
        
        const fileInfo = await uploadResponse.json();
        
        // Then create photo record via tRPC
        result = await createFromUploadMutation.mutateAsync({
          fileId: fileInfo.fileId,
          filePath: fileInfo.filePath,
          fileSize: fileInfo.fileSize,
          mimeType: fileInfo.mimeType,
          categoryId: formData.categoryId,
          title: formData.title.trim(),
          description: description,
          dateTaken: formData.dateTaken,
          location: formData.location.trim(),
          cameraInfo: formData.cameraInfo.trim() || undefined,
          settings: formData.settings.trim() || undefined,
        });
      }
      
      // Invalidate relevant queries
      utils.photo.getUserPhotos.invalidate();
      utils.photo.getSubmissionCounts.invalidate();
      
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
    } catch (error) {
      console.error('Upload error:', error);
      // Error is displayed via tRPC error handling
    }
  };

  const getAvailableCategories = () => {
    return categories.filter(category => {
      const currentCount = userSubmissionCounts[category.id] || 0;
      return currentCount < category.maxPhotosPerUser;
    });
  };

  const availableCategories = getAvailableCategories();
  const isLoading = uploadBase64Mutation.isLoading || createFromUploadMutation.isLoading;
  const error = uploadBase64Mutation.error || createFromUploadMutation.error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Upload Method Selection */}
      <div>
        <label className="block mb-2">Upload Method</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="base64"
              checked={uploadMethod === 'base64'}
              onChange={(e) => setUploadMethod(e.target.value as 'base64')}
              className="mr-2"
            />
            Base64 Upload (tRPC)
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="traditional"
              checked={uploadMethod === 'traditional'}
              onChange={(e) => setUploadMethod(e.target.value as 'traditional')}
              className="mr-2"
            />
            Traditional Upload + tRPC
          </label>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Base64 is simpler but has size limitations. Traditional upload supports larger files.
        </p>
      </div>

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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error.message}
        </div>
      )}

      <Button 
        type="submit" 
        disabled={isLoading || !selectedFile || availableCategories.length === 0}
      >
        {isLoading ? 'Uploading...' : 'Submit Photo'}
      </Button>
    </form>
  );
}
```

### 4. Photo Management Component

#### File: `app/components/user-photos.tsx`

```typescript
import { useState } from 'react';
import { usePhotos } from '~/hooks/use-photos';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { trpc } from '~/utils/trpc';

interface UserPhotosProps {
  competitionId?: string;
  categoryId?: string;
}

export function UserPhotos({ competitionId, categoryId }: UserPhotosProps) {
  const { useUserPhotos, useUpdate, useDelete } = usePhotos();
  const utils = trpc.useUtils();
  
  const { 
    data: photosData, 
    isLoading, 
    error 
  } = useUserPhotos({ competitionId, categoryId });

  const updateMutation = useUpdate();
  const deleteMutation = useDelete();

  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    location: '',
    cameraInfo: '',
    settings: '',
  });

  const handleEdit = (photo: any) => {
    setEditingPhoto(photo.id);
    setEditFormData({
      title: photo.title,
      description: photo.description,
      location: photo.location,
      cameraInfo: photo.cameraInfo || '',
      settings: photo.settings || '',
    });
  };

  const handleSaveEdit = async (photoId: string) => {
    try {
      await updateMutation.mutateAsync({
        id: photoId,
        ...editFormData,
      });
      
      // Refresh photos list
      utils.photo.getUserPhotos.invalidate();
      
      setEditingPhoto(null);
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const handleDelete = async (photoId: string, photoTitle: string) => {
    if (confirm(`Are you sure you want to delete "${photoTitle}"?`)) {
      try {
        await deleteMutation.mutateAsync({ id: photoId });
        
        // Refresh photos list and submission counts
        utils.photo.getUserPhotos.invalidate();
        utils.photo.getSubmissionCounts.invalidate();
        
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  if (isLoading) return <div>Loading your photos...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const photos = photosData?.photos || [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your Photos</h2>
      
      {photos.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No photos uploaded yet. Upload your first photo to get started!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <Card key={photo.id}>
              <div className="relative">
                <img
                  src={photo.filePath}
                  alt={photo.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                  photo.status === 'approved' ? 'bg-green-100 text-green-800' :
                  photo.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {photo.status}
                </div>
              </div>
              
              <CardHeader>
                <CardTitle className="text-lg">{photo.title}</CardTitle>
                <p className="text-sm text-gray-600">{photo.categoryName}</p>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {editingPhoto === photo.id ? (
                  <div className="space-y-2">
                    <input
                      value={editFormData.title}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-2 border rounded"
                      placeholder="Title"
                    />
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-2 border rounded h-24"
                      placeholder="Description"
                    />
                    <input
                      value={editFormData.location}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full p-2 border rounded"
                      placeholder="Location"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(photo.id)}
                        disabled={updateMutation.isLoading}
                      >
                        {updateMutation.isLoading ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingPhoto(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {photo.description}
                    </p>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>📍 {photo.location}</p>
                      <p>📅 {new Date(photo.dateTaken).toLocaleDateString()}</p>
                      {photo.cameraInfo && <p>📷 {photo.cameraInfo}</p>}
                      {photo.settings && <p>⚙️ {photo.settings}</p>}
                      {photo.voteCount > 0 && <p>❤️ {photo.voteCount} votes</p>}
                    </div>
                    
                    {photo.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(photo)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(photo.id, photo.title)}
                          disabled={deleteMutation.isLoading}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
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