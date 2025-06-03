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

## API Endpoints

### Dashboard Analytics
```typescript
GET /api/admin/dashboard/overview
Authorization: Bearer <token>

Response:
{
  "activeCompetition": {
    "id": "comp_123",
    "title": "Wildlife Photography 2024",
    "totalPhotos": 250,
    "totalVotes": 1500,
    "daysRemaining": 45,
    "endDate": "2024-12-31T23:59:59Z"
  },
  "pending": {
    "photos": 15,
    "reports": 3
  },
  "today": {
    "newPhotos": 12,
    "newReports": 1,
    "newUsers": 5,
    "totalVotes": 89
  },
  "users": {
    "total": 1250,
    "admins": 5,
    "activeToday": 120
  }
}
```

### Competition Analytics
```typescript
GET /api/admin/competitions/:id/analytics
Authorization: Bearer <token>

Response:
{
  "competition": {
    "id": "comp_123",
    "title": "Wildlife Photography 2024",
    "status": "active",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z"
  },
  "photos": {
    "total": 250,
    "approved": 200,
    "pending": 15,
    "rejected": 35,
    "byCategory": [
      {
        "categoryId": "cat_1",
        "categoryName": "Urban",
        "count": 120,
        "votes": 850
      },
      {
        "categoryId": "cat_2", 
        "categoryName": "Landscape",
        "count": 130,
        "votes": 950
      }
    ]
  },
  "votes": {
    "total": 1800,
    "today": 89,
    "avgPerPhoto": 7.2
  },
  "submissions": {
    "dailySubmissions": [
      { "date": "2024-01-15", "count": 12 },
      { "date": "2024-01-14", "count": 8 }
    ],
    "topPhotographers": [
      {
        "userId": "user_123",
        "email": "photographer@example.com",
        "photoCount": 8,
        "totalVotes": 45
      }
    ]
  }
}
```

### User Management (SuperAdmin Only)
```typescript
GET /api/admin/users?role=all&limit=50&offset=0&search=john
Authorization: Bearer <token>

Response:
{
  "users": [
    {
      "id": "user_123",
      "email": "john@example.com",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00Z",
      "lastActive": "2024-01-15T10:30:00Z",
      "stats": {
        "photosSubmitted": 5,
        "votesReceived": 25,
        "votesCast": 100
      }
    }
  ],
  "total": 1250,
  "limit": 50,
  "offset": 0
}
```

### System Statistics
```typescript
GET /api/admin/system/stats
Authorization: Bearer <token>

Response:
{
  "storage": {
    "totalFiles": 2500,
    "totalSizeGB": 15.7,
    "avgFileSizeMB": 6.3
  },
  "database": {
    "totalPhotos": 2450,
    "totalVotes": 18500,
    "totalReports": 25,
    "totalUsers": 1250
  },
  "performance": {
    "avgResponseTimeMs": 245,
    "errorRate": 0.02,
    "uptime": 99.8
  }
}
```

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

### 2. Dashboard API Routes

#### File: `api/routes/dashboard.ts`

```typescript
import { Hono } from 'hono';
import { DashboardService } from '../services/dashboard.service';
import { authMiddleware, requireRole } from '../../workers/auth-middleware';

const app = new Hono();
const dashboardService = new DashboardService();

// All dashboard routes require admin access
app.use('/*', authMiddleware, requireRole('admin'));

app.get('/overview', async (c) => {
  try {
    const metrics = await dashboardService.getOverviewMetrics();
    return c.json(metrics);
  } catch (error) {
    return c.json({ error: 'Failed to get dashboard overview' }, 500);
  }
});

app.get('/competitions/:id/analytics', async (c) => {
  const { id } = c.req.param();

  try {
    const analytics = await dashboardService.getCompetitionAnalytics(id);
    return c.json(analytics);
  } catch (error) {
    return c.json({ error: 'Failed to get competition analytics' }, 500);
  }
});

app.get('/system/stats', async (c) => {
  try {
    const stats = await dashboardService.getSystemStats();
    return c.json(stats);
  } catch (error) {
    return c.json({ error: 'Failed to get system stats' }, 500);
  }
});

// SuperAdmin only routes
app.use('/users', requireRole('superadmin'));

app.get('/users', async (c) => {
  const role = c.req.query('role') as any;
  const search = c.req.query('search');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    const result = await dashboardService.getUserList({
      role,
      search,
      limit,
      offset,
    });

    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Failed to get user list' }, 500);
  }
});

export default app;
```

### 3. Frontend Dashboard Component

#### File: `app/components/admin/dashboard.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { useAuth } from '~/hooks/use-auth';

interface DashboardMetrics {
  activeCompetition: {
    id: string;
    title: string;
    totalPhotos: number;
    totalVotes: number;
    daysRemaining: number;
  } | null;
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

export function AdminDashboard() {
  const { hasRole } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/overview', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (!metrics) {
    return <div>Failed to load dashboard data</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={loadDashboardData}>Refresh</Button>
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