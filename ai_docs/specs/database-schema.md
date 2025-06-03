# Database Schema Specification

## Overview
Database schema extensions for the photo competition platform, built on the existing Drizzle ORM setup with Cloudflare D1.

## Schema Updates

### 1. Users Table Extension
Extend existing users table with role management:

```sql
-- Add role column to existing users table
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin'));
```

### 2. Competitions Table
```sql
CREATE TABLE competitions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL REFERENCES users(id)
);

-- Ensure only one active competition at a time
CREATE UNIQUE INDEX idx_competitions_active ON competitions(status) WHERE status = 'active';
```

### 3. Categories Table
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  max_photos_per_user INTEGER DEFAULT 5,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(name, competition_id)
);
```

### 4. Photos Table
```sql
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  
  -- Required fields
  title TEXT NOT NULL CHECK (TRIM(title) != ''),
  description TEXT NOT NULL CHECK (LENGTH(TRIM(description)) >= 20 AND LENGTH(TRIM(description)) <= 500),
  date_taken DATETIME NOT NULL,
  location TEXT NOT NULL CHECK (TRIM(location) != ''),
  
  -- Optional fields
  camera_info TEXT,
  settings TEXT,
  
  -- File information
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Status and moderation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deleted')),
  rejection_reason TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure user doesn't exceed photo limit per category
  UNIQUE(user_id, category_id, id)
);

-- Indexes for performance
CREATE INDEX idx_photos_competition_category ON photos(competition_id, category_id);
CREATE INDEX idx_photos_user ON photos(user_id);
CREATE INDEX idx_photos_status ON photos(status);
```

### 5. Votes Table
```sql
CREATE TABLE votes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one vote per user per photo
  UNIQUE(user_id, photo_id)
);

-- Index for counting votes
CREATE INDEX idx_votes_photo ON votes(photo_id);
```

### 6. Reports Table
```sql
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate', 'copyright', 'spam', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by TEXT REFERENCES users(id),
  admin_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME
);

-- Index for admin queue
CREATE INDEX idx_reports_status ON reports(status);
```

### 7. Winners Table
```sql
CREATE TABLE winners (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL REFERENCES photos(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  competition_id TEXT NOT NULL REFERENCES competitions(id),
  place INTEGER NOT NULL CHECK (place IN (1, 2, 3)),
  declared_by TEXT NOT NULL REFERENCES users(id),
  declared_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one winner per place per category
  UNIQUE(category_id, place)
);
```

## Drizzle Schema Definition

### File: `api/database/competition-schema.ts`

```typescript
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  role: text('role').default('user').$type<'user' | 'admin' | 'superadmin'>(),
  // ... existing user fields
});

export const competitions = sqliteTable('competitions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  status: text('status').default('draft').$type<'draft' | 'active' | 'ended'>(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  createdBy: text('created_by').notNull().references(() => users.id),
}, (table) => ({
  activeUnique: uniqueIndex('idx_competitions_active').on(table.status).where(sql`status = 'active'`),
}));

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  competitionId: text('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
  maxPhotosPerUser: integer('max_photos_per_user').default(5),
  description: text('description'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  nameCompetitionUnique: uniqueIndex('categories_name_competition_unique').on(table.name, table.competitionId),
}));

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  competitionId: text('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
  
  // Required fields
  title: text('title').notNull(),
  description: text('description').notNull(),
  dateTaken: text('date_taken').notNull(),
  location: text('location').notNull(),
  
  // Optional fields
  cameraInfo: text('camera_info'),
  settings: text('settings'),
  
  // File information
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  
  // Status and moderation
  status: text('status').default('pending').$type<'pending' | 'approved' | 'rejected' | 'deleted'>(),
  rejectionReason: text('rejection_reason'),
  
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  competitionCategoryIdx: index('idx_photos_competition_category').on(table.competitionId, table.categoryId),
  userIdx: index('idx_photos_user').on(table.userId),
  statusIdx: index('idx_photos_status').on(table.status),
}));

export const votes = sqliteTable('votes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  photoId: text('photo_id').notNull().references(() => photos.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userPhotoUnique: uniqueIndex('votes_user_photo_unique').on(table.userId, table.photoId),
  photoIdx: index('idx_votes_photo').on(table.photoId),
}));

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  reporterId: text('reporter_id').notNull().references(() => users.id),
  photoId: text('photo_id').notNull().references(() => photos.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull().$type<'inappropriate' | 'copyright' | 'spam' | 'other'>(),
  description: text('description'),
  status: text('status').default('pending').$type<'pending' | 'reviewed' | 'resolved' | 'dismissed'>(),
  reviewedBy: text('reviewed_by').references(() => users.id),
  adminNotes: text('admin_notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  reviewedAt: text('reviewed_at'),
}, (table) => ({
  statusIdx: index('idx_reports_status').on(table.status),
}));

export const winners = sqliteTable('winners', {
  id: text('id').primaryKey(),
  photoId: text('photo_id').notNull().references(() => photos.id),
  categoryId: text('category_id').notNull().references(() => categories.id),
  competitionId: text('competition_id').notNull().references(() => competitions.id),
  place: integer('place').notNull().$type<1 | 2 | 3>(),
  declaredBy: text('declared_by').notNull().references(() => users.id),
  declaredAt: text('declared_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  categoryPlaceUnique: uniqueIndex('winners_category_place_unique').on(table.categoryId, table.place),
}));
```

## Migration Strategy

1. **Phase 1**: Create new tables (competitions, categories, photos, votes, reports, winners)
2. **Phase 2**: Add role column to existing users table
3. **Phase 3**: Create default categories for initial competition
4. **Phase 4**: Add indexes for performance optimization

## Data Validation Rules

### Photo Submission Validation
- Title: Non-empty, trimmed
- Description: 20-500 characters after trimming
- Date taken: Valid datetime
- Location: Non-empty, trimmed
- File: JPEG/PNG, max 10MB

### Competition Rules
- Only one active competition at a time
- End date must be after start date
- Categories must have unique names within competition

### User Limits
- Respect max_photos_per_user per category
- Users can only vote once per photo
- Users can only report each photo once

## Performance Considerations

### Indexes
- Photos by competition/category for gallery views
- Votes by photo for vote counting
- Reports by status for admin queue
- Users by role for permission checks

### Query Optimization
- Use prepared statements for frequent queries
- Implement pagination for photo galleries
- Cache vote counts for popular photos
- Use partial indexes where beneficial