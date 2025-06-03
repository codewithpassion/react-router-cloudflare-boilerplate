# Competition Management Specification

## Overview
Competition management system for creating, configuring, and managing photo competitions with categories and submission rules.

## Features

### 1. Competition Lifecycle
- **Draft**: Competition being configured
- **Active**: Open for submissions and voting (only one active at a time)
- **Ended**: Closed, winners can be declared

### 2. Competition Configuration
- Basic information (title, description, dates)
- Category management with submission limits
- Automatic status transitions
- Winner declaration system

## Data Models

### Competition Entity
```typescript
interface Competition {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'ended';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  categories: Category[];
}
```

### Category Entity
```typescript
interface Category {
  id: string;
  name: string;
  competitionId: string;
  maxPhotosPerUser: number;
  description?: string;
  createdAt: Date;
}
```

## tRPC Procedures

### Competition Router

#### File: `api/trpc/routers/competition.ts`

```typescript
import { z } from 'zod';
import { createTRPCRouter, publicProcedure, adminProcedure } from '../trpc';
import { CompetitionService } from '../../services/competition.service';
import { 
  competitionStatusSchema, 
  paginationSchema, 
  idSchema,
  dateStringSchema 
} from '../schemas/common';
import { TRPCError } from '@trpc/server';

const createCompetitionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  categories: z.array(z.object({
    name: z.string().min(1).max(100),
    maxPhotosPerUser: z.number().min(1).max(20),
    description: z.string().optional(),
  })).optional(),
});

const updateCompetitionSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
});

const listCompetitionsSchema = paginationSchema.extend({
  status: competitionStatusSchema.optional(),
});

const addCategorySchema = z.object({
  competitionId: idSchema,
  name: z.string().min(1).max(100),
  maxPhotosPerUser: z.number().min(1).max(20),
  description: z.string().optional(),
});

const updateCategorySchema = z.object({
  id: idSchema,
  maxPhotosPerUser: z.number().min(1).max(20).optional(),
  description: z.string().optional(),
});

const competitionService = new CompetitionService();

export const competitionRouter = createTRPCRouter({
  // Public procedures
  list: publicProcedure
    .input(listCompetitionsSchema)
    .query(async ({ input }) => {
      return await competitionService.listCompetitions(input);
    }),

  getById: publicProcedure
    .input(z.object({ id: idSchema }))
    .query(async ({ input }) => {
      const competition = await competitionService.getCompetitionById(input.id);
      if (!competition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competition not found',
        });
      }
      return competition;
    }),

  getActive: publicProcedure
    .query(async () => {
      const competition = await competitionService.getActiveCompetition();
      if (!competition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No active competition found',
        });
      }
      return competition;
    }),

  // Admin procedures
  create: adminProcedure
    .input(createCompetitionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await competitionService.createCompetition({
          ...input,
          createdBy: ctx.user.id,
        });
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  update: adminProcedure
    .input(updateCompetitionSchema)
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      try {
        return await competitionService.updateCompetition(id, updates);
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  activate: adminProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await competitionService.activateCompetition(input.id, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  end: adminProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ input }) => {
      try {
        return await competitionService.endCompetition(input.id);
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  // Category management
  addCategory: adminProcedure
    .input(addCategorySchema)
    .mutation(async ({ input }) => {
      const { competitionId, ...categoryData } = input;
      try {
        return await competitionService.addCategory(competitionId, categoryData);
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  updateCategory: adminProcedure
    .input(updateCategorySchema)
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      try {
        return await competitionService.updateCategory(id, updates);
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  deleteCategory: adminProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ input }) => {
      try {
        return await competitionService.deleteCategory(input.id);
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),
});
```

## Implementation

### 1. Competition Service

#### File: `api/services/competition.service.ts`

```typescript
import { db } from '../database/db';
import { competitions, categories } from '../database/competition-schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '../utils/id';

export class CompetitionService {
  
  async createCompetition(data: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    createdBy: string;
    categories?: Array<{
      name: string;
      maxPhotosPerUser: number;
      description?: string;
    }>;
  }) {
    const competitionId = generateId('comp');
    
    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    // Create competition
    const [competition] = await db.insert(competitions).values({
      id: competitionId,
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      createdBy: data.createdBy,
      status: 'draft',
    }).returning();

    // Create default categories if none provided
    const categoriesToCreate = data.categories?.length ? data.categories : [
      { name: 'Urban', maxPhotosPerUser: 5, description: 'Urban wildlife photography' },
      { name: 'Landscape', maxPhotosPerUser: 5, description: 'Natural landscape photography' }
    ];

    const createdCategories = await Promise.all(
      categoriesToCreate.map(async (cat) => {
        const [category] = await db.insert(categories).values({
          id: generateId('cat'),
          name: cat.name,
          competitionId,
          maxPhotosPerUser: cat.maxPhotosPerUser,
          description: cat.description,
        }).returning();
        return category;
      })
    );

    return {
      ...competition,
      categories: createdCategories,
    };
  }

  async updateCompetition(id: string, updates: Partial<{
    title: string;
    description: string;
    startDate: string;
    endDate: string;
  }>) {
    // Validate that competition is not active if changing critical fields
    const competition = await this.getCompetitionById(id);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (competition.status === 'active' && (updates.startDate || updates.endDate)) {
      throw new Error('Cannot change dates of active competition');
    }

    const [updated] = await db
      .update(competitions)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(competitions.id, id))
      .returning();

    return updated;
  }

  async activateCompetition(id: string, activatedBy: string) {
    // Check if another competition is already active
    const activeCompetition = await db
      .select()
      .from(competitions)
      .where(eq(competitions.status, 'active'))
      .get();

    if (activeCompetition) {
      throw new Error('Another competition is already active');
    }

    // Validate competition can be activated
    const competition = await this.getCompetitionById(id);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (competition.status !== 'draft') {
      throw new Error('Only draft competitions can be activated');
    }

    const [updated] = await db
      .update(competitions)
      .set({ status: 'active', updatedAt: new Date().toISOString() })
      .where(eq(competitions.id, id))
      .returning();

    return updated;
  }

  async endCompetition(id: string) {
    const [updated] = await db
      .update(competitions)
      .set({ status: 'ended', updatedAt: new Date().toISOString() })
      .where(eq(competitions.id, id))
      .returning();

    return updated;
  }

  async getCompetitionById(id: string) {
    const competition = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, id))
      .get();

    if (!competition) return null;

    const competitionCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.competitionId, id));

    return {
      ...competition,
      categories: competitionCategories,
    };
  }

  async getActiveCompetition() {
    const competition = await db
      .select()
      .from(competitions)
      .where(eq(competitions.status, 'active'))
      .get();

    if (!competition) return null;

    const competitionCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.competitionId, competition.id));

    return {
      ...competition,
      categories: competitionCategories,
    };
  }

  async listCompetitions(filters: {
    status?: 'draft' | 'active' | 'ended';
    limit?: number;
    offset?: number;
  } = {}) {
    const { status, limit = 10, offset = 0 } = filters;

    let query = db.select().from(competitions);
    
    if (status) {
      query = query.where(eq(competitions.status, status));
    }

    const results = await query
      .limit(limit)
      .offset(offset)
      .orderBy(competitions.createdAt);

    // Get categories for each competition
    const competitionsWithCategories = await Promise.all(
      results.map(async (comp) => {
        const compCategories = await db
          .select()
          .from(categories)
          .where(eq(categories.competitionId, comp.id));
        
        return {
          ...comp,
          categories: compCategories,
        };
      })
    );

    return {
      competitions: competitionsWithCategories,
      total: results.length,
      limit,
      offset,
    };
  }

  // Category management methods
  async addCategory(competitionId: string, categoryData: {
    name: string;
    maxPhotosPerUser: number;
    description?: string;
  }) {
    // Check if category name already exists in competition
    const existing = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.competitionId, competitionId),
        eq(categories.name, categoryData.name)
      ))
      .get();

    if (existing) {
      throw new Error('Category name already exists in this competition');
    }

    const [category] = await db.insert(categories).values({
      id: generateId('cat'),
      competitionId,
      name: categoryData.name,
      maxPhotosPerUser: categoryData.maxPhotosPerUser,
      description: categoryData.description,
    }).returning();

    return category;
  }

  async updateCategory(id: string, updates: Partial<{
    maxPhotosPerUser: number;
    description: string;
  }>) {
    const [updated] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();

    return updated;
  }

  async deleteCategory(id: string) {
    // TODO: Check if category has photos before deletion
    await db.delete(categories).where(eq(categories.id, id));
    return { success: true };
  }
}
```

### 2. Client-Side Usage with tRPC

#### Custom Hooks for Competition Management

```typescript
// File: app/hooks/use-competitions.ts
import { trpc } from '~/utils/trpc';

export function useCompetitions() {
  return {
    // Public queries
    useList: (params: { status?: 'draft' | 'active' | 'ended'; limit?: number; offset?: number }) =>
      trpc.competition.list.useQuery(params),
    
    useById: (id: string) =>
      trpc.competition.getById.useQuery({ id }, { enabled: !!id }),
    
    useActive: () =>
      trpc.competition.getActive.useQuery(undefined, {
        staleTime: 5 * 60 * 1000, // 5 minutes
      }),

    // Admin mutations
    useCreate: () => trpc.competition.create.useMutation(),
    useUpdate: () => trpc.competition.update.useMutation(),
    useActivate: () => trpc.competition.activate.useMutation(),
    useEnd: () => trpc.competition.end.useMutation(),

    // Category management
    useAddCategory: () => trpc.competition.addCategory.useMutation(),
    useUpdateCategory: () => trpc.competition.updateCategory.useMutation(),
    useDeleteCategory: () => trpc.competition.deleteCategory.useMutation(),
  };
}
```

## Frontend Components with tRPC

### 1. Competition Form Component

#### File: `app/components/admin/competition-form.tsx`

```typescript
import { useState } from 'react';
import { useCompetitions } from '~/hooks/use-competitions';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';

interface CompetitionFormProps {
  competition?: any; // Type from tRPC
  onSuccess?: (competition: any) => void;
}

interface CompetitionFormData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  categories: Array<{
    name: string;
    maxPhotosPerUser: number;
    description?: string;
  }>;
}

export function CompetitionForm({ competition, onSuccess }: CompetitionFormProps) {
  const { useCreate, useUpdate } = useCompetitions();
  const utils = trpc.useUtils();

  const createMutation = useCreate();
  const updateMutation = useUpdate();

  const [formData, setFormData] = useState<CompetitionFormData>({
    title: competition?.title || '',
    description: competition?.description || '',
    startDate: competition?.startDate || '',
    endDate: competition?.endDate || '',
    categories: competition?.categories || [
      { name: 'Urban', maxPhotosPerUser: 5, description: 'Urban wildlife photography' },
      { name: 'Landscape', maxPhotosPerUser: 5, description: 'Natural landscape photography' }
    ],
  });

  const isLoading = createMutation.isLoading || updateMutation.isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (competition) {
        const result = await updateMutation.mutateAsync({
          id: competition.id,
          ...formData,
        });
        
        // Invalidate relevant queries
        utils.competition.list.invalidate();
        utils.competition.getById.invalidate({ id: competition.id });
        
        onSuccess?.(result);
      } else {
        const result = await createMutation.mutateAsync(formData);
        
        // Invalidate competition list
        utils.competition.list.invalidate();
        
        onSuccess?.(result);
      }
    } catch (error) {
      // Error is handled by tRPC and displayed via error state
      console.error('Form submission error:', error);
    }
  };

  const addCategory = () => {
    setFormData(prev => ({
      ...prev,
      categories: [...prev.categories, { name: '', maxPhotosPerUser: 5 }],
    }));
  };

  const removeCategory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  };

  const updateCategory = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => 
        i === index ? { ...cat, [field]: value } : cat
      ),
    }));
  };

  const error = createMutation.error || updateMutation.error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error.message}
        </div>
      )}

      <div>
        <label htmlFor="title">Competition Title</label>
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
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate">Start Date</label>
          <Input
            id="startDate"
            type="datetime-local"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            required
          />
        </div>
        
        <div>
          <label htmlFor="endDate">End Date</label>
          <Input
            id="endDate"
            type="datetime-local"
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3>Categories</h3>
          <Button type="button" onClick={addCategory}>Add Category</Button>
        </div>
        
        {formData.categories.map((category, index) => (
          <div key={index} className="border p-4 rounded space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Category name"
                value={category.name}
                onChange={(e) => updateCategory(index, 'name', e.target.value)}
                required
              />
              <Input
                type="number"
                placeholder="Max photos"
                value={category.maxPhotosPerUser}
                onChange={(e) => updateCategory(index, 'maxPhotosPerUser', parseInt(e.target.value))}
                min="1"
                required
              />
              <Button 
                type="button" 
                variant="destructive"
                onClick={() => removeCategory(index)}
              >
                Remove
              </Button>
            </div>
            <Input
              placeholder="Category description (optional)"
              value={category.description || ''}
              onChange={(e) => updateCategory(index, 'description', e.target.value)}
            />
          </div>
        ))}
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : competition ? 'Update Competition' : 'Create Competition'}
      </Button>
    </form>
  );
}
```

### 2. Competition List with Actions

#### File: `app/components/admin/competition-list.tsx`

```typescript
import { useCompetitions } from '~/hooks/use-competitions';
import { Button } from '~/components/ui/button';
import { trpc } from '~/utils/trpc';

export function CompetitionList() {
  const { useList, useActivate, useEnd } = useCompetitions();
  const utils = trpc.useUtils();

  const { data: competitions, isLoading, refetch } = useList({
    limit: 50,
    offset: 0,
  });

  const activateMutation = useActivate();
  const endMutation = useEnd();

  const handleActivate = async (id: string) => {
    if (confirm('Are you sure you want to activate this competition? This will deactivate any currently active competition.')) {
      try {
        await activateMutation.mutateAsync({ id });
        
        // Refresh all competition data
        utils.competition.list.invalidate();
        utils.competition.getActive.invalidate();
        
        refetch();
      } catch (error) {
        alert('Failed to activate competition: ' + error.message);
      }
    }
  };

  const handleEnd = async (id: string) => {
    if (confirm('Are you sure you want to end this competition? This action cannot be undone.')) {
      try {
        await endMutation.mutateAsync({ id });
        
        // Refresh all competition data
        utils.competition.list.invalidate();
        utils.competition.getActive.invalidate();
        
        refetch();
      } catch (error) {
        alert('Failed to end competition: ' + error.message);
      }
    }
  };

  if (isLoading) return <div>Loading competitions...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Competitions</h2>
        <Button asChild>
          <a href="/admin/competitions/new">Create Competition</a>
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Title</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Dates</th>
              <th className="px-4 py-2 text-left">Categories</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {competitions?.competitions.map((competition) => (
              <tr key={competition.id} className="border-t">
                <td className="px-4 py-2">
                  <div>
                    <div className="font-medium">{competition.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {competition.description}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    competition.status === 'active' ? 'bg-green-100 text-green-800' :
                    competition.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {competition.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm">
                  <div>{new Date(competition.startDate).toLocaleDateString()}</div>
                  <div>{new Date(competition.endDate).toLocaleDateString()}</div>
                </td>
                <td className="px-4 py-2">
                  {competition.categories?.length || 0} categories
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <a href={`/admin/competitions/${competition.id}/edit`}>
                        Edit
                      </a>
                    </Button>
                    
                    {competition.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleActivate(competition.id)}
                        disabled={activateMutation.isLoading}
                      >
                        Activate
                      </Button>
                    )}
                    
                    {competition.status === 'active' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleEnd(competition.id)}
                        disabled={endMutation.isLoading}
                      >
                        End
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {competitions?.competitions.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No competitions found. Create your first competition to get started.
        </div>
      )}
    </div>
  );
}
```

## Testing Strategy

### Unit Tests
- Competition creation validation
- Date validation logic
- Category uniqueness checks
- Status transition rules

### Integration Tests
- Competition API endpoints
- Category management flows
- Permission-based access control

### E2E Tests
- Complete competition creation flow
- Admin competition management
- Competition activation/deactivation

## Validation Rules

1. **Date Validation**: End date must be after start date
2. **Unique Active**: Only one active competition at a time
3. **Category Names**: Unique within competition
4. **Status Transitions**: Draft → Active → Ended (no reverse)
5. **Edit Restrictions**: Limited changes once competition is active