# Content Moderation & Reporting Specification

## Overview
Content moderation system for admins to review photo submissions and handle user reports with approval workflows and moderation tools.

## Features

### 1. Photo Moderation
- Review pending photo submissions
- Approve/reject photos with reasons
- Bulk moderation operations
- Photo status tracking
- Moderation history

### 2. User Reporting System
- Report inappropriate content
- Predefined report categories
- Admin report queue
- Report resolution tracking
- Follow-up actions

### 3. Admin Moderation Tools
- Moderation dashboard
- Photo review interface
- Report management
- User management tools
- Moderation analytics

## Data Models

### Photo Status Flow
```
pending → approved/rejected/deleted
```

### Report Entity
```typescript
interface Report {
  id: string;
  reporterId: string;
  photoId: string;
  reason: 'inappropriate' | 'copyright' | 'spam' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  adminNotes?: string;
  createdAt: Date;
  reviewedAt?: Date;
}
```

## API Endpoints

### Photo Moderation (Admin Only)

#### Get Pending Photos
```typescript
GET /api/admin/photos/pending?limit=20&offset=0&competitionId=comp_123
Authorization: Bearer <token>

Response:
{
  "photos": [
    {
      "id": "photo_123",
      "title": "Mountain Wildlife",
      "description": "Beautiful capture...",
      "filePath": "/uploads/comp_123/photo_123.jpg",
      "categoryName": "Landscape",
      "photographer": {
        "id": "user_456",
        "email": "photographer@example.com"
      },
      "submittedAt": "2024-01-15T10:00:00Z",
      "metadata": {
        "dateTaken": "2024-01-10T15:30:00Z",
        "location": "Rocky Mountains",
        "cameraInfo": "Canon EOS R5",
        "settings": "ISO 800, f/5.6, 1/500s"
      }
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

#### Approve Photo
```typescript
POST /api/admin/photos/:id/approve
Authorization: Bearer <token>

Response:
{
  "id": "photo_123",
  "status": "approved",
  "approvedBy": "admin_789",
  "approvedAt": "2024-01-15T11:00:00Z"
}
```

#### Reject Photo
```typescript
POST /api/admin/photos/:id/reject
Authorization: Bearer <token>

Request:
{
  "reason": "Poor image quality"
}

Response:
{
  "id": "photo_123",
  "status": "rejected",
  "rejectionReason": "Poor image quality",
  "rejectedBy": "admin_789",
  "rejectedAt": "2024-01-15T11:00:00Z"
}
```

#### Delete Photo
```typescript
DELETE /api/admin/photos/:id
Authorization: Bearer <token>

Request:
{
  "reason": "Inappropriate content"
}

Response:
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

#### Bulk Photo Actions
```typescript
POST /api/admin/photos/bulk-action
Authorization: Bearer <token>

Request:
{
  "action": "approve", // or "reject" or "delete"
  "photoIds": ["photo_123", "photo_456"],
  "reason": "Batch approval" // for reject/delete
}

Response:
{
  "success": true,
  "processed": 2,
  "failed": 0,
  "results": [
    {
      "photoId": "photo_123",
      "status": "approved"
    },
    {
      "photoId": "photo_456", 
      "status": "approved"
    }
  ]
}
```

### User Reporting

#### Report Photo
```typescript
POST /api/photos/:photoId/report
Authorization: Bearer <token>

Request:
{
  "reason": "inappropriate",
  "description": "Contains inappropriate content"
}

Response:
{
  "id": "report_123",
  "status": "pending",
  "message": "Report submitted successfully"
}
```

#### Get User's Reports
```typescript
GET /api/reports/mine
Authorization: Bearer <token>

Response:
{
  "reports": [
    {
      "id": "report_123",
      "photoId": "photo_456",
      "photoTitle": "Mountain Scene",
      "reason": "inappropriate",
      "status": "pending",
      "reportedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Admin Report Management

#### Get Reports Queue
```typescript
GET /api/admin/reports?status=pending&limit=20&offset=0
Authorization: Bearer <token>

Response:
{
  "reports": [
    {
      "id": "report_123",
      "photo": {
        "id": "photo_456",
        "title": "Mountain Scene",
        "filePath": "/uploads/comp_123/photo_456.jpg"
      },
      "reporter": {
        "id": "user_789",
        "email": "reporter@example.com"
      },
      "reason": "inappropriate",
      "description": "Contains inappropriate content",
      "status": "pending",
      "reportedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 3,
  "limit": 20,
  "offset": 0
}
```

#### Resolve Report
```typescript
POST /api/admin/reports/:id/resolve
Authorization: Bearer <token>

Request:
{
  "action": "resolved", // or "dismissed"
  "adminNotes": "Photo removed for inappropriate content",
  "photoAction": "delete" // optional: "approve", "reject", "delete"
}

Response:
{
  "id": "report_123",
  "status": "resolved",
  "resolvedBy": "admin_789",
  "resolvedAt": "2024-01-15T11:30:00Z"
}
```

## Implementation

### 1. Moderation Service

#### File: `api/services/moderation.service.ts`

```typescript
import { db } from '../database/db';
import { photos, reports, users, categories } from '../database/competition-schema';
import { eq, and, or, desc, count } from 'drizzle-orm';
import { generateId } from '../utils/id';

export class ModerationService {
  
  async getPendingPhotos(filters: {
    competitionId?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const { competitionId, limit = 20, offset = 0 } = filters;

    let query = db
      .select({
        id: photos.id,
        title: photos.title,
        description: photos.description,
        filePath: photos.filePath,
        categoryName: categories.name,
        photographerId: photos.userId,
        photographerEmail: users.email,
        submittedAt: photos.createdAt,
        metadata: {
          dateTaken: photos.dateTaken,
          location: photos.location,
          cameraInfo: photos.cameraInfo,
          settings: photos.settings,
        },
      })
      .from(photos)
      .innerJoin(categories, eq(photos.categoryId, categories.id))
      .innerJoin(users, eq(photos.userId, users.id))
      .where(eq(photos.status, 'pending'));

    if (competitionId) {
      query = query.where(and(
        eq(photos.status, 'pending'),
        eq(photos.competitionId, competitionId)
      ));
    }

    const results = await query
      .orderBy(desc(photos.createdAt))
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: count() })
      .from(photos)
      .where(
        competitionId 
          ? and(eq(photos.status, 'pending'), eq(photos.competitionId, competitionId))
          : eq(photos.status, 'pending')
      )
      .get();

    return {
      photos: results.map(photo => ({
        ...photo,
        photographer: {
          id: photo.photographerId,
          email: photo.photographerEmail,
        },
      })),
      total: total.count,
      limit,
      offset,
    };
  }

  async approvePhoto(photoId: string, adminId: string) {
    const [updated] = await db
      .update(photos)
      .set({
        status: 'approved',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(photos.id, photoId))
      .returning();

    // Log moderation action
    await this.logModerationAction(photoId, adminId, 'approved');

    return updated;
  }

  async rejectPhoto(photoId: string, adminId: string, reason: string) {
    const [updated] = await db
      .update(photos)
      .set({
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(photos.id, photoId))
      .returning();

    // Log moderation action
    await this.logModerationAction(photoId, adminId, 'rejected', reason);

    return updated;
  }

  async deletePhoto(photoId: string, adminId: string, reason: string) {
    // Get photo info before deletion
    const photo = await db
      .select()
      .from(photos)
      .where(eq(photos.id, photoId))
      .get();

    if (!photo) {
      throw new Error('Photo not found');
    }

    // Delete photo record
    await db.delete(photos).where(eq(photos.id, photoId));

    // Log moderation action
    await this.logModerationAction(photoId, adminId, 'deleted', reason);

    // TODO: Delete file from storage
    
    return { success: true };
  }

  async bulkPhotoAction(
    photoIds: string[],
    action: 'approve' | 'reject' | 'delete',
    adminId: string,
    reason?: string
  ) {
    const results = [];

    for (const photoId of photoIds) {
      try {
        let result;
        switch (action) {
          case 'approve':
            result = await this.approvePhoto(photoId, adminId);
            break;
          case 'reject':
            result = await this.rejectPhoto(photoId, adminId, reason || 'Bulk rejection');
            break;
          case 'delete':
            result = await this.deletePhoto(photoId, adminId, reason || 'Bulk deletion');
            break;
        }
        results.push({ photoId, status: action, success: true });
      } catch (error) {
        results.push({ photoId, status: 'failed', error: error.message });
      }
    }

    return {
      processed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  // Report management
  async createReport(reportData: {
    reporterId: string;
    photoId: string;
    reason: 'inappropriate' | 'copyright' | 'spam' | 'other';
    description?: string;
  }) {
    // Check if user already reported this photo
    const existingReport = await db
      .select()
      .from(reports)
      .where(and(
        eq(reports.reporterId, reportData.reporterId),
        eq(reports.photoId, reportData.photoId)
      ))
      .get();

    if (existingReport) {
      throw new Error('You have already reported this photo');
    }

    // Verify photo exists
    const photo = await db
      .select()
      .from(photos)
      .where(eq(photos.id, reportData.photoId))
      .get();

    if (!photo) {
      throw new Error('Photo not found');
    }

    const [report] = await db.insert(reports).values({
      id: generateId('report'),
      reporterId: reportData.reporterId,
      photoId: reportData.photoId,
      reason: reportData.reason,
      description: reportData.description,
      status: 'pending',
    }).returning();

    return report;
  }

  async getReports(filters: {
    status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
    limit?: number;
    offset?: number;
  } = {}) {
    const { status, limit = 20, offset = 0 } = filters;

    let query = db
      .select({
        id: reports.id,
        reason: reports.reason,
        description: reports.description,
        status: reports.status,
        reportedAt: reports.createdAt,
        reviewedAt: reports.reviewedAt,
        adminNotes: reports.adminNotes,
        photo: {
          id: photos.id,
          title: photos.title,
          filePath: photos.filePath,
        },
        reporter: {
          id: users.id,
          email: users.email,
        },
      })
      .from(reports)
      .innerJoin(photos, eq(reports.photoId, photos.id))
      .innerJoin(users, eq(reports.reporterId, users.id));

    if (status) {
      query = query.where(eq(reports.status, status));
    }

    const results = await query
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      reports: results,
      total: results.length,
      limit,
      offset,
    };
  }

  async resolveReport(
    reportId: string,
    adminId: string,
    resolution: {
      action: 'resolved' | 'dismissed';
      adminNotes?: string;
      photoAction?: 'approve' | 'reject' | 'delete';
      photoActionReason?: string;
    }
  ) {
    // Update report status
    const [updatedReport] = await db
      .update(reports)
      .set({
        status: resolution.action,
        reviewedBy: adminId,
        reviewedAt: new Date().toISOString(),
        adminNotes: resolution.adminNotes,
      })
      .where(eq(reports.id, reportId))
      .returning();

    // Take action on photo if specified
    if (resolution.photoAction && updatedReport) {
      const report = await db
        .select({ photoId: reports.photoId })
        .from(reports)
        .where(eq(reports.id, reportId))
        .get();

      if (report) {
        switch (resolution.photoAction) {
          case 'approve':
            await this.approvePhoto(report.photoId, adminId);
            break;
          case 'reject':
            await this.rejectPhoto(report.photoId, adminId, resolution.photoActionReason || 'Reported content');
            break;
          case 'delete':
            await this.deletePhoto(report.photoId, adminId, resolution.photoActionReason || 'Reported content');
            break;
        }
      }
    }

    return updatedReport;
  }

  async getUserReports(userId: string) {
    const userReports = await db
      .select({
        id: reports.id,
        photoId: reports.photoId,
        photoTitle: photos.title,
        reason: reports.reason,
        status: reports.status,
        reportedAt: reports.createdAt,
      })
      .from(reports)
      .innerJoin(photos, eq(reports.photoId, photos.id))
      .where(eq(reports.reporterId, userId))
      .orderBy(desc(reports.createdAt));

    return { reports: userReports };
  }

  async getModerationStats() {
    // Get pending counts
    const pendingPhotos = await db
      .select({ count: count() })
      .from(photos)
      .where(eq(photos.status, 'pending'))
      .get();

    const pendingReports = await db
      .select({ count: count() })
      .from(reports)
      .where(eq(reports.status, 'pending'))
      .get();

    // Get daily stats
    const today = new Date().toISOString().split('T')[0];
    const todayPhotos = await db
      .select({ count: count() })
      .from(photos)
      .where(eq(photos.createdAt, today))
      .get();

    const todayReports = await db
      .select({ count: count() })
      .from(reports)
      .where(eq(reports.createdAt, today))
      .get();

    return {
      pending: {
        photos: pendingPhotos.count,
        reports: pendingReports.count,
      },
      today: {
        photos: todayPhotos.count,
        reports: todayReports.count,
      },
    };
  }

  private async logModerationAction(
    photoId: string,
    adminId: string,
    action: string,
    reason?: string
  ) {
    // TODO: Implement moderation log if needed
    console.log(`Moderation action: ${action} on photo ${photoId} by admin ${adminId}`, reason);
  }
}
```

### 2. Moderation API Routes

#### File: `api/routes/moderation.ts`

```typescript
import { Hono } from 'hono';
import { ModerationService } from '../services/moderation.service';
import { authMiddleware, requireRole } from '../../workers/auth-middleware';

const app = new Hono();
const moderationService = new ModerationService();

// User reporting routes
app.use('/photos/*/report', authMiddleware);
app.use('/reports/mine', authMiddleware);

app.post('/photos/:photoId/report', async (c) => {
  const user = c.get('user');
  const { photoId } = c.req.param();
  const { reason, description } = await c.req.json();

  try {
    const report = await moderationService.createReport({
      reporterId: user.id,
      photoId,
      reason,
      description,
    });

    return c.json({
      id: report.id,
      status: 'pending',
      message: 'Report submitted successfully',
    }, 201);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/reports/mine', async (c) => {
  const user = c.get('user');

  try {
    const result = await moderationService.getUserReports(user.id);
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Failed to get reports' }, 500);
  }
});

// Admin moderation routes
app.use('/admin/*', authMiddleware, requireRole('admin'));

app.get('/admin/photos/pending', async (c) => {
  const competitionId = c.req.query('competitionId');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    const result = await moderationService.getPendingPhotos({
      competitionId,
      limit,
      offset,
    });

    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Failed to get pending photos' }, 500);
  }
});

app.post('/admin/photos/:id/approve', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  try {
    const result = await moderationService.approvePhoto(id, user.id);
    return c.json({
      id: result.id,
      status: 'approved',
      approvedBy: user.id,
      approvedAt: result.updatedAt,
    });
  } catch (error) {
    return c.json({ error: 'Failed to approve photo' }, 500);
  }
});

app.post('/admin/photos/:id/reject', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const { reason } = await c.req.json();

  try {
    const result = await moderationService.rejectPhoto(id, user.id, reason);
    return c.json({
      id: result.id,
      status: 'rejected',
      rejectionReason: result.rejectionReason,
      rejectedBy: user.id,
      rejectedAt: result.updatedAt,
    });
  } catch (error) {
    return c.json({ error: 'Failed to reject photo' }, 500);
  }
});

app.delete('/admin/photos/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const { reason } = await c.req.json();

  try {
    const result = await moderationService.deletePhoto(id, user.id, reason);
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Failed to delete photo' }, 500);
  }
});

app.post('/admin/photos/bulk-action', async (c) => {
  const user = c.get('user');
  const { action, photoIds, reason } = await c.req.json();

  try {
    const result = await moderationService.bulkPhotoAction(
      photoIds,
      action,
      user.id,
      reason
    );

    return c.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return c.json({ error: 'Failed to perform bulk action' }, 500);
  }
});

app.get('/admin/reports', async (c) => {
  const status = c.req.query('status') as any;
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    const result = await moderationService.getReports({
      status,
      limit,
      offset,
    });

    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Failed to get reports' }, 500);
  }
});

app.post('/admin/reports/:id/resolve', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const resolution = await c.req.json();

  try {
    const result = await moderationService.resolveReport(id, user.id, resolution);
    return c.json({
      id: result.id,
      status: result.status,
      resolvedBy: user.id,
      resolvedAt: result.reviewedAt,
    });
  } catch (error) {
    return c.json({ error: 'Failed to resolve report' }, 500);
  }
});

app.get('/admin/moderation/stats', async (c) => {
  try {
    const stats = await moderationService.getModerationStats();
    return c.json(stats);
  } catch (error) {
    return c.json({ error: 'Failed to get moderation stats' }, 500);
  }
});

export default app;
```

### 3. Frontend Components

#### File: `app/components/admin/photo-moderation.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';

interface PendingPhoto {
  id: string;
  title: string;
  description: string;
  filePath: string;
  categoryName: string;
  photographer: {
    id: string;
    email: string;
  };
  submittedAt: string;
  metadata: {
    dateTaken: string;
    location: string;
    cameraInfo?: string;
    settings?: string;
  };
}

export function PhotoModeration() {
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPendingPhotos();
  }, []);

  const loadPendingPhotos = async () => {
    try {
      const response = await fetch('/api/admin/photos/pending', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const result = await response.json();
        setPhotos(result.photos);
      }
    } catch (error) {
      console.error('Failed to load pending photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoAction = async (photoId: string, action: 'approve' | 'reject' | 'delete', reason?: string) => {
    setActionLoading(true);
    
    try {
      let response;
      
      switch (action) {
        case 'approve':
          response = await fetch(`/api/admin/photos/${photoId}/approve`, {
            method: 'POST',
            credentials: 'include',
          });
          break;
        case 'reject':
          response = await fetch(`/api/admin/photos/${photoId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
            credentials: 'include',
          });
          break;
        case 'delete':
          response = await fetch(`/api/admin/photos/${photoId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
            credentials: 'include',
          });
          break;
      }

      if (response && response.ok) {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
        setSelectedPhotos(prev => prev.filter(id => id !== photoId));
      }
    } catch (error) {
      console.error(`Failed to ${action} photo:`, error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selectedPhotos.length === 0) return;

    if (action === 'reject' || action === 'delete') {
      setShowRejectDialog(true);
      return;
    }

    setActionLoading(true);
    
    try {
      const response = await fetch('/api/admin/photos/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          photoIds: selectedPhotos,
          reason: action === 'approve' ? 'Bulk approval' : rejectReason,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        setPhotos(prev => prev.filter(p => !selectedPhotos.includes(p.id)));
        setSelectedPhotos([]);
      }
    } catch (error) {
      console.error(`Failed to ${action} photos:`, error);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmBulkRejectOrDelete = async (action: 'reject' | 'delete') => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason');
      return;
    }

    setActionLoading(true);
    
    try {
      const response = await fetch('/api/admin/photos/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          photoIds: selectedPhotos,
          reason: rejectReason,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        setPhotos(prev => prev.filter(p => !selectedPhotos.includes(p.id)));
        setSelectedPhotos([]);
        setShowRejectDialog(false);
        setRejectReason('');
      }
    } catch (error) {
      console.error(`Failed to ${action} photos:`, error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div>Loading pending photos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Photo Moderation</h2>
        
        {selectedPhotos.length > 0 && (
          <div className="flex gap-2">
            <Button 
              onClick={() => handleBulkAction('approve')}
              disabled={actionLoading}
            >
              Approve Selected ({selectedPhotos.length})
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleBulkAction('reject')}
              disabled={actionLoading}
            >
              Reject Selected
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleBulkAction('delete')}
              disabled={actionLoading}
            >
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="text-center text-gray-500">No pending photos to review</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {photos.map((photo) => (
            <div key={photo.id} className="border rounded-lg overflow-hidden bg-white shadow">
              <div className="p-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedPhotos.includes(photo.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPhotos(prev => [...prev, photo.id]);
                      } else {
                        setSelectedPhotos(prev => prev.filter(id => id !== photo.id));
                      }
                    }}
                  />
                  Select for bulk action
                </label>
              </div>
              
              <img
                src={photo.filePath}
                alt={photo.title}
                className="w-full h-64 object-cover"
              />
              
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{photo.title}</h3>
                  <p className="text-sm text-gray-600">{photo.categoryName}</p>
                </div>
                
                <p className="text-sm text-gray-700">{photo.description}</p>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p>👤 {photo.photographer.email}</p>
                  <p>📅 Submitted: {new Date(photo.submittedAt).toLocaleDateString()}</p>
                  <p>📍 {photo.metadata.location}</p>
                  <p>📅 Taken: {new Date(photo.metadata.dateTaken).toLocaleDateString()}</p>
                  {photo.metadata.cameraInfo && <p>📷 {photo.metadata.cameraInfo}</p>}
                  {photo.metadata.settings && <p>⚙️ {photo.metadata.settings}</p>}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handlePhotoAction(photo.id, 'approve')}
                    disabled={actionLoading}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const reason = prompt('Rejection reason:');
                      if (reason) {
                        handlePhotoAction(photo.id, 'reject', reason);
                      }
                    }}
                    disabled={actionLoading}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      const reason = prompt('Deletion reason:');
                      if (reason) {
                        handlePhotoAction(photo.id, 'delete', reason);
                      }
                    }}
                    disabled={actionLoading}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reason for Action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Please provide a reason for rejecting/deleting these photos..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => confirmBulkRejectOrDelete('reject')}
                disabled={actionLoading || !rejectReason.trim()}
              >
                Reject Photos
              </Button>
              <Button
                variant="destructive"
                onClick={() => confirmBulkRejectOrDelete('delete')}
                disabled={actionLoading || !rejectReason.trim()}
              >
                Delete Photos
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

## Testing Strategy

### Unit Tests
- Report creation validation
- Photo status transitions
- Bulk action processing
- Admin permission checks

### Integration Tests
- Complete moderation workflow
- Report resolution process
- Admin dashboard functionality
- User reporting experience

### E2E Tests
- Admin photo review process
- User report submission
- Moderation decision impacts
- Bulk moderation operations