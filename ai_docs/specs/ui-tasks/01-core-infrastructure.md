# Phase 1: Core Infrastructure Implementation

## Overview
Establish the foundational UI infrastructure for the photo competition app, including routing, authentication integration, and core components.

## Duration
**Estimated: 1 Week**

## Prerequisites
- ✅ tRPC backend implementation completed
- ✅ Database schema and migrations ready
- ✅ Authentication system (better-auth) configured

## Tasks

### 1. Route Structure Setup

#### 1.1 Create Competition Management Routes
**Files to create:**
- `app/routes/_auth.admin.tsx` - Admin layout wrapper
- `app/routes/_auth.admin.dashboard.tsx` - Admin dashboard
- `app/routes/_auth.admin.competitions._index.tsx` - Competition list
- `app/routes/_auth.admin.competitions.new.tsx` - Create competition
- `app/routes/_auth.admin.competitions.$id.edit.tsx` - Edit competition

**Implementation Details:**
```typescript
// app/routes/_auth.admin.tsx
import { AdminSiteLayout } from "~/components/admin-layout";
import { useAuth } from "~/hooks/use-auth";
import { Navigate } from "react-router";

export default function AdminLayout() {
  const { user, isAdmin } = useAuth();
  
  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminSiteLayout user={user}>
      <Outlet />
    </AdminSiteLayout>
  );
}
```

#### 1.2 Create Public Competition Routes
**Files to create:**
- `app/routes/competitions.tsx` - Public competition layout
- `app/routes/competitions._index.tsx` - Competition listing
- `app/routes/competitions.$id.tsx` - Competition details & voting
- `app/routes/gallery.tsx` - Public photo gallery

#### 1.3 Create User Dashboard Routes
**Files to create:**
- `app/routes/_auth.dashboard.tsx` - User dashboard
- `app/routes/_auth.photos.tsx` - User's photo management
- `app/routes/_auth.competitions.$id.submit.tsx` - Photo submission form

### 2. Authentication Integration

#### 2.1 Extend Auth Hook
**File to modify:** `app/hooks/use-auth.ts`

```typescript
import { useLoaderData } from "react-router";
import type { rootLoader } from "~/root";

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: string;
}

export function useAuth() {
  const { session } = useLoaderData<typeof rootLoader>();
  
  return {
    user: session?.user as User | null,
    isAuthenticated: !!session?.user,
    isAdmin: session?.user?.role === 'admin',
    isVerified: session?.user?.emailVerified || false,
  };
}
```

#### 2.2 Create Role-Based Route Protection
**File to create:** `app/components/route-guard.tsx`

```typescript
interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireVerified?: boolean;
  fallback?: React.ReactNode;
}

export function RouteGuard({ 
  children, 
  requireAuth = true,
  requireAdmin = false,
  requireVerified = false,
  fallback 
}: RouteGuardProps) {
  const { user, isAuthenticated, isAdmin } = useAuth();
  
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireAdmin && !isAdmin) {
    return fallback || <Navigate to="/dashboard" replace />;
  }
  
  if (requireVerified && !user?.emailVerified) {
    return <Navigate to="/verify" replace />;
  }
  
  return <>{children}</>;
}
```

### 3. Core UI Components

#### 3.1 Competition Card Component
**File to create:** `app/components/features/competitions/competition-card.tsx`

```typescript
interface CompetitionCardProps {
  competition: {
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    status: 'draft' | 'open' | 'voting' | 'closed';
    _count: {
      photos: number;
      votes: number;
    };
  };
  variant?: 'card' | 'list';
  showActions?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function CompetitionCard({ 
  competition, 
  variant = 'card',
  showActions = false,
  onEdit,
  onDelete 
}: CompetitionCardProps) {
  // Implementation with status badges, countdown timer, stats
}
```

**Features:**
- Status badges with appropriate colors
- Countdown timer for active competitions
- Photo/vote statistics
- Action buttons for admin users
- Responsive design

#### 3.2 Photo Card Component
**File to create:** `app/components/features/photos/photo-card.tsx`

```typescript
interface PhotoCardProps {
  photo: {
    id: string;
    title: string;
    filePath: string;
    voteCount: number;
    userHasVoted: boolean;
    canVote: boolean;
    status: 'pending' | 'approved' | 'rejected';
    photographer: {
      id: string;
      name: string;
    };
  };
  size?: 'sm' | 'md' | 'lg';
  showVoting?: boolean;
  showStatus?: boolean;
  onClick?: (photo: any) => void;
}

export function PhotoCard({ 
  photo, 
  size = 'md',
  showVoting = true,
  showStatus = false,
  onClick 
}: PhotoCardProps) {
  // Implementation with lazy loading, vote button, status overlay
}
```

**Features:**
- Lazy loading with placeholder
- Integrated vote button
- Status overlays for moderation
- Click handler for lightbox/detail view
- Responsive sizing

#### 3.3 Status Badge Component
**File to create:** `app/components/ui/status-badge.tsx`

```typescript
interface StatusBadgeProps {
  status: 'draft' | 'open' | 'voting' | 'closed' | 'pending' | 'approved' | 'rejected';
  size?: 'sm' | 'md';
  variant?: 'solid' | 'outline';
}

export function StatusBadge({ status, size = 'md', variant = 'solid' }: StatusBadgeProps) {
  // Implementation with status-specific colors and icons
}
```

### 4. Navigation Enhancement

#### 4.1 Update Main Navigation
**File to modify:** `app/components/app-layout.tsx`

Add competition-related navigation items:
```typescript
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Competitions', href: '/competitions', icon: TrophyIcon },
  { name: 'Gallery', href: '/gallery', icon: PhotoIcon },
  { name: 'My Photos', href: '/photos', icon: CameraIcon },
];

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin/dashboard', icon: CogIcon },
  { name: 'Manage Competitions', href: '/admin/competitions', icon: FolderIcon },
  { name: 'Moderation', href: '/admin/moderation', icon: ShieldIcon },
];
```

#### 4.2 Update Admin Sidebar
**File to modify:** `app/components/admin-layout.tsx`

Add competition management sections:
```typescript
const sidebarNavigation = [
  {
    name: 'Main Navigation',
    children: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
      { name: 'Competitions', href: '/admin/competitions', icon: TrophyIcon },
      { name: 'Categories', href: '/admin/categories', icon: TagIcon },
    ],
  },
  {
    name: 'Moderation',
    children: [
      { name: 'Photo Queue', href: '/admin/moderation/photos', icon: PhotoIcon },
      { name: 'Reports', href: '/admin/moderation/reports', icon: FlagIcon },
      { name: 'Statistics', href: '/admin/moderation/stats', icon: ChartIcon },
    ],
  },
];
```

### 5. Basic Page Layouts

#### 5.1 Public Competition List
**File:** `app/routes/competitions._index.tsx`

```typescript
export default function CompetitionsIndex() {
  const { data: competitions, isLoading } = trpc.competition.getAll.useQuery();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Photo Competitions</h1>
        <p className="text-gray-600 mt-2">
          Join exciting photography competitions and showcase your talent
        </p>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions?.map((competition) => (
            <CompetitionCard 
              key={competition.id} 
              competition={competition}
              onClick={() => navigate(`/competitions/${competition.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 5.2 Admin Dashboard
**File:** `app/routes/_auth.admin.dashboard.tsx`

```typescript
export default function AdminDashboard() {
  const { data: stats } = trpc.admin.getStats.useQuery();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-gray-600">Manage competitions and moderate content</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Active Competitions" 
          value={stats?.activeCompetitions || 0}
          icon={TrophyIcon}
        />
        <StatsCard 
          title="Pending Photos" 
          value={stats?.pendingPhotos || 0}
          icon={PhotoIcon}
        />
        <StatsCard 
          title="Total Votes" 
          value={stats?.totalVotes || 0}
          icon={HeartIcon}
        />
        <StatsCard 
          title="Active Users" 
          value={stats?.activeUsers || 0}
          icon={UserIcon}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityPanel />
        <ModerationQueuePreview />
      </div>
    </div>
  );
}
```

## Acceptance Criteria

### ✅ Routing
- [ ] All competition routes are accessible
- [ ] Admin routes are protected by role
- [ ] Navigation updates correctly
- [ ] 404 pages handle invalid routes

### ✅ Authentication
- [ ] Role-based access control works
- [ ] Admin routes redirect non-admin users
- [ ] Auth state is consistent across app
- [ ] Logout functionality works

### ✅ Components
- [ ] CompetitionCard displays all required info
- [ ] PhotoCard handles different states
- [ ] StatusBadge shows correct colors/icons
- [ ] Components are responsive

### ✅ Navigation
- [ ] Main nav shows relevant links
- [ ] Admin sidebar is organized
- [ ] Active states work correctly
- [ ] Mobile navigation functions

### ✅ Performance
- [ ] Pages load under 2 seconds
- [ ] No console errors
- [ ] TypeScript compiles without errors
- [ ] Components are accessible

## Testing Checklist

### Manual Testing
- [ ] Navigate through all routes as regular user
- [ ] Navigate through admin routes as admin
- [ ] Test role-based redirects
- [ ] Verify responsive design on mobile
- [ ] Test dark mode compatibility

### Automated Testing (Future)
- [ ] Unit tests for auth hook
- [ ] Component tests for cards
- [ ] Integration tests for routing
- [ ] Accessibility tests

## Dependencies

### New Dependencies Needed
```json
{
  "lucide-react": "^0.486.0", // For icons (already installed)
  "date-fns": "^3.0.0", // For date formatting
  "react-intersection-observer": "^9.5.0" // For lazy loading
}
```

### Existing Dependencies Used
- React Router 7 (routing)
- tRPC (data fetching)
- ShadCN/UI (components)
- Tailwind CSS (styling)
- Better Auth (authentication)

## Notes

### Implementation Order
1. Set up routes and basic layouts first
2. Implement authentication integration
3. Build core components with mock data
4. Connect components to tRPC endpoints
5. Add proper error handling and loading states

### Key Considerations
- Ensure all routes are type-safe with React Router 7
- Use consistent loading and error states
- Follow existing design patterns from ShadCN
- Test role-based access thoroughly
- Keep components reusable and composable

### Future Enhancements
- Add breadcrumb navigation
- Implement keyboard shortcuts for admin actions
- Add search functionality to competition list
- Create tour/onboarding for new users