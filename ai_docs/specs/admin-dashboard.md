# Admin Dashboard Specification

## Overview
Comprehensive admin dashboard for managing photo competitions, including analytics, user management, and system monitoring tools.

## Features

### 1. Dashboard Overview
- Key metrics and statistics
- Recent activity summary
- Quick action shortcuts
- System health indicators

### 2. Competition Management
- Competition list and status
- Quick competition actions
- Category management
- Competition analytics

### 3. Content Moderation
- Pending photos queue
- Report management
- Moderation statistics
- Quick moderation actions

### 4. User Management (SuperAdmin)
- User list and roles
- Role assignment
- User activity tracking
- Account management

### 5. Analytics & Reporting
- Competition performance metrics
- User engagement statistics
- Photo submission trends
- Voting activity analytics

## Dashboard Components

### Overview Metrics
```typescript
interface DashboardMetrics {
  activeCompetition: {
    id: string;
    title: string;
    totalPhotos: number;
    totalVotes: number;
    daysRemaining: number;
  };
  pending: {
    photos: number;
    reports: number;
  };
  today: {
    newPhotos: number;
    newReports: number;
    newUsers: number;
    totalVotes: number;
  };
  users: {
    total: number;
    admins: number;
    activeToday: number;
  };
}
```

## tRPC Procedures

### Dashboard Router

#### File: `api/trpc/routers/dashboard.ts`

```typescript
import { z } from 'zod';
import { createTRPCRouter, adminProcedure } from '../trpc';
import { DashboardService } from '../../services/dashboard.service';
import { idSchema } from '../schemas/common';

const dashboardService = new DashboardService();

export const dashboardRouter = createTRPCRouter({
  // Dashboard overview metrics
  getOverview: adminProcedure
    .query(async () => {
      return await dashboardService.getOverviewMetrics();
    }),

  // Competition analytics
  getCompetitionAnalytics: adminProcedure
    .input(z.object({ competitionId: idSchema }))
    .query(async ({ input }) => {
      return await dashboardService.getCompetitionAnalytics(input.competitionId);
    }),

  // System statistics
  getSystemStats: adminProcedure
    .query(async () => {
      return await dashboardService.getSystemStats();
    }),
});
```

### Integration with Auth Router

The user management functionality is already covered in the auth router (see authentication-roles.md).

## Implementation

### 1. Dashboard Service

#### File: `api/services/dashboard.service.ts`

```typescript
import { db } from '../database/db';
import { 
  competitions, 
  photos, 
  votes, 
  reports, 
  users, 
  categories 
} from '../database/competition-schema';
import { eq, and, count, desc, sql } from 'drizzle-orm';

export class DashboardService {
  
  async getOverviewMetrics(): Promise<DashboardMetrics> {
    // Get active competition
    const activeCompetition = await db
      .select({
        id: competitions.id,
        title: competitions.title,
        endDate: competitions.endDate,
      })
      .from(competitions)
      .where(eq(competitions.status, 'active'))
      .get();

    let competitionMetrics = null;
    if (activeCompetition) {
      // Get photo count for active competition
      const photoCount = await db
        .select({ count: count() })
        .from(photos)
        .where(eq(photos.competitionId, activeCompetition.id))
        .get();

      // Get vote count for active competition
      const voteCount = await db
        .select({ count: count() })
        .from(votes)
        .innerJoin(photos, eq(votes.photoId, photos.id))
        .where(eq(photos.competitionId, activeCompetition.id))
        .get();

      const endDate = new Date(activeCompetition.endDate);
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      competitionMetrics = {
        id: activeCompetition.id,
        title: activeCompetition.title,
        totalPhotos: photoCount.count,
        totalVotes: voteCount.count,
        daysRemaining,
      };
    }

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

    // Get today's activity
    const today = new Date().toISOString().split('T')[0];
    
    const todayPhotos = await db
      .select({ count: count() })
      .from(photos)
      .where(sql`DATE(${photos.createdAt}) = ${today}`)
      .get();

    const todayReports = await db
      .select({ count: count() })
      .from(reports)
      .where(sql`DATE(${reports.createdAt}) = ${today}`)
      .get();

    const todayUsers = await db
      .select({ count: count() })
      .from(users)
      .where(sql`DATE(${users.createdAt}) = ${today}`)
      .get();

    const todayVotes = await db
      .select({ count: count() })
      .from(votes)
      .where(sql`DATE(${votes.createdAt}) = ${today}`)
      .get();

    // Get user statistics
    const totalUsers = await db
      .select({ count: count() })
      .from(users)
      .get();

    const adminUsers = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.role} IN ('admin', 'superadmin')`)
      .get();

    return {
      activeCompetition: competitionMetrics,
      pending: {
        photos: pendingPhotos.count,
        reports: pendingReports.count,
      },
      today: {
        newPhotos: todayPhotos.count,
        newReports: todayReports.count,
        newUsers: todayUsers.count,
        totalVotes: todayVotes.count,
      },
      users: {
        total: totalUsers.count,
        admins: adminUsers.count,
        activeToday: 0, // Would need session tracking
      },
    };
  }

  async getCompetitionAnalytics(competitionId: string) {
    // Get competition details
    const competition = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, competitionId))
      .get();

    if (!competition) {
      throw new Error('Competition not found');
    }

    // Get photo statistics
    const photoStats = await db
      .select({
        status: photos.status,
        count: count(),
      })
      .from(photos)
      .where(eq(photos.competitionId, competitionId))
      .groupBy(photos.status);

    // Get photos by category
    const categoryStats = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        photoCount: count(photos.id),
        voteCount: sql<number>`COUNT(${votes.id})`,
      })
      .from(categories)
      .leftJoin(photos, and(
        eq(categories.id, photos.categoryId),
        eq(photos.competitionId, competitionId)
      ))
      .leftJoin(votes, eq(photos.id, votes.photoId))
      .where(eq(categories.competitionId, competitionId))
      .groupBy(categories.id, categories.name);

    // Get total votes for competition
    const totalVotes = await db
      .select({ count: count() })
      .from(votes)
      .innerJoin(photos, eq(votes.photoId, photos.id))
      .where(eq(photos.competitionId, competitionId))
      .get();

    // Get daily submissions for last 30 days
    const dailySubmissions = await db
      .select({
        date: sql<string>`DATE(${photos.createdAt})`,
        count: count(),
      })
      .from(photos)
      .where(and(
        eq(photos.competitionId, competitionId),
        sql`${photos.createdAt} >= DATE('now', '-30 days')`
      ))
      .groupBy(sql`DATE(${photos.createdAt})`)
      .orderBy(sql`DATE(${photos.createdAt})`);

    // Get top photographers
    const topPhotographers = await db
      .select({
        userId: users.id,
        email: users.email,
        photoCount: count(photos.id),
        totalVotes: sql<number>`COUNT(${votes.id})`,
      })
      .from(users)
      .innerJoin(photos, eq(users.id, photos.userId))
      .leftJoin(votes, eq(photos.id, votes.photoId))
      .where(eq(photos.competitionId, competitionId))
      .groupBy(users.id, users.email)
      .orderBy(desc(count(photos.id)))
      .limit(10);

    const photoStatsMap = photoStats.reduce((acc, stat) => {
      acc[stat.status] = stat.count;
      return acc;
    }, {} as Record<string, number>);

    const totalPhotos = photoStats.reduce((sum, stat) => sum + stat.count, 0);
    const avgVotesPerPhoto = totalPhotos > 0 ? totalVotes.count / totalPhotos : 0;

    return {
      competition: {
        id: competition.id,
        title: competition.title,
        status: competition.status,
        startDate: competition.startDate,
        endDate: competition.endDate,
      },
      photos: {
        total: totalPhotos,
        approved: photoStatsMap.approved || 0,
        pending: photoStatsMap.pending || 0,
        rejected: photoStatsMap.rejected || 0,
        byCategory: categoryStats.map(cat => ({
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          count: cat.photoCount,
          votes: cat.voteCount,
        })),
      },
      votes: {
        total: totalVotes.count,
        today: 0, // Would need date filtering
        avgPerPhoto: Number(avgVotesPerPhoto.toFixed(1)),
      },
      submissions: {
        dailySubmissions,
        topPhotographers,
      },
    };
  }

  async getUserList(filters: {
    role?: 'user' | 'admin' | 'superadmin' | 'all';
    search?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const { role = 'all', search, limit = 50, offset = 0 } = filters;

    let query = db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        // Would need additional fields for last active, etc.
      })
      .from(users);

    if (role !== 'all') {
      query = query.where(eq(users.role, role));
    }

    if (search) {
      query = query.where(sql`${users.email} LIKE ${`%${search}%`}`);
    }

    const userList = await query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(users.createdAt));

    // Get user statistics
    const userStats = await Promise.all(
      userList.map(async (user) => {
        const photoCount = await db
          .select({ count: count() })
          .from(photos)
          .where(eq(photos.userId, user.id))
          .get();

        const votesReceived = await db
          .select({ count: count() })
          .from(votes)
          .innerJoin(photos, eq(votes.photoId, photos.id))
          .where(eq(photos.userId, user.id))
          .get();

        const votesCast = await db
          .select({ count: count() })
          .from(votes)
          .where(eq(votes.userId, user.id))
          .get();

        return {
          ...user,
          stats: {
            photosSubmitted: photoCount.count,
            votesReceived: votesReceived.count,
            votesCast: votesCast.count,
          },
        };
      })
    );

    const total = await db
      .select({ count: count() })
      .from(users)
      .where(
        role !== 'all' ? eq(users.role, role) : undefined
      )
      .get();

    return {
      users: userStats,
      total: total.count,
      limit,
      offset,
    };
  }

  async getSystemStats() {
    // Get storage statistics (would need file system integration)
    const totalPhotos = await db
      .select({ count: count() })
      .from(photos)
      .get();

    const totalVotes = await db
      .select({ count: count() })
      .from(votes)
      .get();

    const totalReports = await db
      .select({ count: count() })
      .from(reports)
      .get();

    const totalUsers = await db
      .select({ count: count() })
      .from(users)
      .get();

    return {
      storage: {
        totalFiles: totalPhotos.count,
        totalSizeGB: 0, // Would calculate from file sizes
        avgFileSizeMB: 0, // Would calculate average
      },
      database: {
        totalPhotos: totalPhotos.count,
        totalVotes: totalVotes.count,
        totalReports: totalReports.count,
        totalUsers: totalUsers.count,
      },
      performance: {
        avgResponseTimeMs: 0, // Would need monitoring
        errorRate: 0, // Would need error tracking
        uptime: 99.8, // Would need uptime monitoring
      },
    };
  }
}
```

### 2. Client-Side Usage with tRPC

#### Custom Hooks for Dashboard

```typescript
// File: app/hooks/use-dashboard.ts
import { trpc } from '~/utils/trpc';

export function useDashboard() {
  return {
    // Dashboard overview with auto-refresh
    useOverview: () =>
      trpc.dashboard.getOverview.useQuery(undefined, {
        refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
        staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
      }),

    // Competition analytics
    useCompetitionAnalytics: (competitionId: string) =>
      trpc.dashboard.getCompetitionAnalytics.useQuery(
        { competitionId },
        { enabled: !!competitionId }
      ),

    // System statistics
    useSystemStats: () =>
      trpc.dashboard.getSystemStats.useQuery(undefined, {
        staleTime: 10 * 60 * 1000, // System stats change less frequently
      }),
  };
}
```

### 3. Frontend Dashboard Component with tRPC

#### File: `app/components/admin/dashboard.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { useAuth } from '~/hooks/use-auth';
import { useDashboard } from '~/hooks/use-dashboard';

export function AdminDashboard() {
  const { hasRole } = useAuth();
  const { useOverview } = useDashboard();
  
  const { 
    data: metrics, 
    isLoading: loading, 
    error,
    refetch 
  } = useOverview();

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div>Failed to load dashboard data: {error.message}</div>;
  }

  if (!metrics) {
    return <div>No dashboard data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={() => refetch()} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Active Competition Overview */}
      {metrics.activeCompetition && (
        <Card>
          <CardHeader>
            <CardTitle>Active Competition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <h3 className="font-semibold text-lg">{metrics.activeCompetition.title}</h3>
                <p className="text-sm text-gray-600">
                  {metrics.activeCompetition.daysRemaining} days remaining
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{metrics.activeCompetition.totalPhotos}</div>
                <div className="text-sm text-gray-600">Total Photos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{metrics.activeCompetition.totalVotes}</div>
                <div className="text-sm text-gray-600">Total Votes</div>
              </div>
              <div className="text-center">
                <Button asChild>
                  <a href={`/admin/competitions/${metrics.activeCompetition.id}`}>
                    Manage Competition
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pending.photos}</div>
            <p className="text-sm text-gray-600">Photos awaiting approval</p>
            {metrics.pending.photos > 0 && (
              <Button size="sm" className="mt-2" asChild>
                <a href="/admin/moderation">Review Photos</a>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pending.reports}</div>
            <p className="text-sm text-gray-600">Pending reports</p>
            {metrics.pending.reports > 0 && (
              <Button size="sm" className="mt-2" asChild>
                <a href="/admin/reports">Review Reports</a>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Today's Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm">New Photos:</span>
                <span className="font-semibold">{metrics.today.newPhotos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Votes Cast:</span>
                <span className="font-semibold">{metrics.today.totalVotes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">New Users:</span>
                <span className="font-semibold">{metrics.today.newUsers}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.users.total}</div>
            <p className="text-sm text-gray-600">
              {metrics.users.admins} admins
            </p>
            {hasRole('superadmin') && (
              <Button size="sm" className="mt-2" asChild>
                <a href="/admin/users">Manage Users</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild>
              <a href="/admin/competitions/new">Create Competition</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/admin/moderation">Review Photos</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/admin/analytics">View Analytics</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {!metrics.activeCompetition && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">No Active Competition</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-4">
              There is currently no active competition. Create a new competition to get started.
            </p>
            <Button asChild>
              <a href="/admin/competitions/new">Create Competition</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### 4. Competition Analytics Component

#### File: `app/components/admin/competition-analytics.tsx`

```typescript
import { useDashboard } from '~/hooks/use-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

interface CompetitionAnalyticsProps {
  competitionId: string;
}

export function CompetitionAnalytics({ competitionId }: CompetitionAnalyticsProps) {
  const { useCompetitionAnalytics } = useDashboard();
  
  const { 
    data: analytics, 
    isLoading,
    error 
  } = useCompetitionAnalytics(competitionId);

  if (isLoading) return <div>Loading analytics...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!analytics) return <div>No analytics available</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Competition Analytics</h2>
        <div className="text-sm text-gray-600">
          {analytics.competition.title} - {analytics.competition.status}
        </div>
      </div>

      {/* Photo Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.photos.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics.photos.approved}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {analytics.photos.pending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analytics.photos.rejected}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Photos by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.photos.byCategory.map((category) => (
              <div key={category.categoryId} className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{category.categoryName}</div>
                  <div className="text-sm text-gray-600">
                    {category.count} photos, {category.votes} votes
                  </div>
                </div>
                <div className="text-lg font-semibold">
                  {category.count > 0 ? Math.round(category.votes / category.count) : 0} avg votes
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Photographers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Photographers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.submissions.topPhotographers.map((photographer, index) => (
              <div key={photographer.userId} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">#{index + 1}</span>
                  <span>{photographer.email}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {photographer.photoCount} photos, {photographer.totalVotes} votes
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Submissions Chart would go here */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            Chart visualization would be implemented here using a charting library
          </div>
          {/* Simple list for now */}
          <div className="mt-4 space-y-1">
            {analytics.submissions.dailySubmissions.slice(-7).map((day) => (
              <div key={day.date} className="flex justify-between">
                <span>{new Date(day.date).toLocaleDateString()}</span>
                <span>{day.count} photos</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Performance Considerations

### Caching Strategy
- Dashboard metrics cached for 5 minutes
- Real-time updates for critical metrics
- Lazy loading for detailed analytics

### Database Optimization
- Indexed queries for dashboard metrics
- Aggregated statistics tables
- Efficient count queries

### UI Responsiveness
- Progressive loading of dashboard sections
- Skeleton screens for loading states
- Real-time updates via WebSocket

## Testing Strategy

### Unit Tests
- Dashboard metric calculations
- Analytics data aggregation
- Permission-based access control

### Integration Tests
- Dashboard API endpoints
- User management flows
- System statistics accuracy

### E2E Tests
- Complete admin dashboard experience
- User management workflows
- Analytics visualization