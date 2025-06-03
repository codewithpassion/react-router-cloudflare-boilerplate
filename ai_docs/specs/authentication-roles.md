# Authentication & Role Management Specification

## Overview
Extend the existing better-auth system to support role-based access control for the photo competition platform.

## Role Hierarchy

### User Roles
1. **SuperAdmin**: Full system access, can create Admins
2. **Admin**: Competition management, content moderation
3. **User**: Photo submission, voting, basic features

### Role Permissions Matrix

| Feature | SuperAdmin | Admin | User | Unauthenticated |
|---------|------------|-------|------|-----------------|
| View competitions | ✓ | ✓ | ✓ | ✓ |
| View photos | ✓ | ✓ | ✓ | ✓ |
| Submit photos | ✓ | ✓ | ✓ | ✗ |
| Vote on photos | ✓ | ✓ | ✓ | ✗ |
| Report photos | ✓ | ✓ | ✓ | ✗ |
| Create competitions | ✓ | ✓ | ✗ | ✗ |
| Moderate photos | ✓ | ✓ | ✗ | ✗ |
| Manage categories | ✓ | ✓ | ✗ | ✗ |
| Declare winners | ✓ | ✓ | ✗ | ✗ |
| Create admins | ✓ | ✗ | ✗ | ✗ |
| Manage users | ✓ | ✗ | ✗ | ✗ |

## Implementation

### 1. Better-Auth Configuration Extension

#### File: `packages/better-auth/auth.ts`

```typescript
import { betterAuth } from "better-auth";
import { db } from "./db";

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        validate: (value: string) => {
          return ["user", "admin", "superadmin"].includes(value);
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  plugins: [
    // Add role-based access control plugin
    {
      id: "role-access",
      hooks: {
        user: {
          created: {
            after: async (user) => {
              // Default role assignment logic
              console.log(`User created with role: ${user.role || 'user'}`);
            },
          },
        },
      },
    },
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.User;
```

### 2. Role Management Functions

#### File: `packages/better-auth/role-management.ts`

```typescript
import { db } from "./db";
import { users } from "./db/auth-schema";
import { eq } from "drizzle-orm";

export type UserRole = 'user' | 'admin' | 'superadmin';

export class RoleManager {
  /**
   * Check if user has required role or higher
   */
  static hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      user: 0,
      admin: 1,
      superadmin: 2,
    };
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Check if user can assign a specific role
   */
  static canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
    // Only superadmin can create admins
    if (targetRole === 'admin') {
      return assignerRole === 'superadmin';
    }
    // Admins and superadmins can create users
    if (targetRole === 'user') {
      return this.hasRole(assignerRole, 'admin');
    }
    // Only superadmin can create superadmin
    if (targetRole === 'superadmin') {
      return assignerRole === 'superadmin';
    }
    return false;
  }

  /**
   * Update user role (with permission checks)
   */
  static async updateUserRole(
    assignerId: string,
    targetUserId: string,
    newRole: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get assigner's role
      const assigner = await db.select().from(users).where(eq(users.id, assignerId)).get();
      if (!assigner) {
        return { success: false, error: "Assigner not found" };
      }

      // Check permissions
      if (!this.canAssignRole(assigner.role as UserRole, newRole)) {
        return { success: false, error: "Insufficient permissions to assign this role" };
      }

      // Update target user's role
      await db.update(users)
        .set({ role: newRole })
        .where(eq(users.id, targetUserId));

      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to update user role" };
    }
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: UserRole) {
    return await db.select().from(users).where(eq(users.role, role));
  }
}
```

### 3. Authorization Middleware

#### File: `workers/auth-middleware.ts`

```typescript
import type { MiddlewareHandler } from 'hono';
import { auth } from '@portcityai/better-auth';
import { RoleManager, type UserRole } from '@portcityai/better-auth/role-management';

export interface AuthContext {
  user: {
    id: string;
    email: string;
    role: UserRole;
  } | null;
}

/**
 * Authentication middleware - verifies session
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const sessionToken = c.req.header('Authorization')?.replace('Bearer ', '') ||
                      c.req.cookie('session');

  if (sessionToken) {
    try {
      const session = await auth.api.getSession({
        headers: { authorization: `Bearer ${sessionToken}` }
      });

      if (session?.user) {
        c.set('user', {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role as UserRole,
        });
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
    }
  }

  await next();
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (requiredRole: UserRole): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get('user') as AuthContext['user'];
    
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    if (!RoleManager.hasRole(user.role, requiredRole)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    await next();
  };
};

/**
 * Optional authentication middleware
 */
export const optionalAuth: MiddlewareHandler = async (c, next) => {
  const sessionToken = c.req.header('Authorization')?.replace('Bearer ', '') ||
                      c.req.cookie('session');

  if (sessionToken) {
    try {
      const session = await auth.api.getSession({
        headers: { authorization: `Bearer ${sessionToken}` }
      });

      if (session?.user) {
        c.set('user', {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role as UserRole,
        });
      }
    } catch (error) {
      // Fail silently for optional auth
    }
  }

  await next();
};
```

### 4. Client-Side Role Management with tRPC

#### File: `app/hooks/use-auth.ts`

```typescript
import { createContext, useContext, type ReactNode } from 'react';
import { trpc } from '~/utils/trpc';
import type { User } from '@portcityai/better-auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  hasRole: (role: 'user' | 'admin' | 'superadmin') => boolean;
  canAssignRole: (targetRole: 'user' | 'admin' | 'superadmin') => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use tRPC to get current user
  const { 
    data: user, 
    isLoading: loading, 
    refetch 
  } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const hasRole = (requiredRole: 'user' | 'admin' | 'superadmin') => {
    if (!user?.role) return false;
    
    const roleHierarchy = { user: 0, admin: 1, superadmin: 2 };
    return roleHierarchy[user.role as keyof typeof roleHierarchy] >= 
           roleHierarchy[requiredRole];
  };

  const canAssignRole = (targetRole: 'user' | 'admin' | 'superadmin') => {
    if (!user?.role) return false;
    
    if (targetRole === 'admin') return user.role === 'superadmin';
    if (targetRole === 'user') return hasRole('admin');
    if (targetRole === 'superadmin') return user.role === 'superadmin';
    return false;
  };

  const value = {
    user: user || null,
    isAuthenticated: !!user,
    hasRole,
    canAssignRole,
    login: async (email: string, password: string) => {
      // Better-auth login implementation
      // After login, refetch user data
      refetch();
    },
    logout: async () => {
      // Better-auth logout implementation
      // After logout, refetch will return null
      refetch();
    },
    loading,
    refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Custom hooks for role management
export function useUserManagement() {
  return {
    // Get users list
    useUsers: (params: Parameters<typeof trpc.auth.getUsers.useQuery>[0]) =>
      trpc.auth.getUsers.useQuery(params),
    
    // Update user role
    useUpdateRole: () => trpc.auth.updateUserRole.useMutation(),
    
    // Get users by role
    useUsersByRole: (role: 'user' | 'admin' | 'superadmin') =>
      trpc.auth.getUsersByRole.useQuery({ role }),
  };
}
```

### 5. Frontend Components with tRPC

#### File: `app/components/protected-route.tsx`

```typescript
import { Navigate } from 'react-router';
import { useAuth } from '~/hooks/use-auth';
import type { UserRole } from '@portcityai/better-auth/role-management';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole = 'user',
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, hasRole, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="admin">
      {children}
    </ProtectedRoute>
  );
}

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="superadmin">
      {children}
    </ProtectedRoute>
  );
}
```

#### File: `app/components/admin/user-management.tsx`

```typescript
import { useState } from 'react';
import { trpc } from '~/utils/trpc';
import { useUserManagement } from '~/hooks/use-auth';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

export function UserManagement() {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'user' | 'admin' | 'superadmin'>('all');
  
  const { useUsers, useUpdateRole } = useUserManagement();
  
  const { 
    data: usersData, 
    isLoading, 
    refetch 
  } = useUsers({
    search: search || undefined,
    role: selectedRole === 'all' ? undefined : selectedRole,
    limit: 50,
    offset: 0,
  });

  const updateRoleMutation = useUpdateRole();

  const handleRoleUpdate = async (userId: string, newRole: 'user' | 'admin' | 'superadmin') => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role: newRole });
      refetch();
    } catch (error) {
      alert('Failed to update role: ' + error.message);
    }
  };

  if (isLoading) return <div>Loading users...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as any)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
          <option value="superadmin">Super Admins</option>
        </select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Photos</th>
              <th className="px-4 py-2 text-left">Votes Cast</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersData?.users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    user.role === 'superadmin' ? 'bg-red-100 text-red-800' :
                    user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-2">{user.stats?.photosSubmitted || 0}</td>
                <td className="px-4 py-2">{user.stats?.votesCast || 0}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    {user.role !== 'admin' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRoleUpdate(user.id, 'admin')}
                        disabled={updateRoleMutation.isLoading}
                      >
                        Make Admin
                      </Button>
                    )}
                    {user.role !== 'user' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRoleUpdate(user.id, 'user')}
                        disabled={updateRoleMutation.isLoading}
                      >
                        Make User
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {usersData?.users.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          No users found
        </div>
      )}
    </div>
  );
}
```

## tRPC Procedures

### Auth Router with Role Management

#### File: `api/trpc/routers/auth.ts`

```typescript
import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure, superAdminProcedure } from '../trpc';
import { RoleManager } from '@portcityai/better-auth/role-management';
import { userRoleSchema, paginationSchema } from '../schemas/common';
import { TRPCError } from '@trpc/server';

const updateRoleInputSchema = z.object({
  userId: z.string(),
  role: userRoleSchema,
});

const getUsersInputSchema = paginationSchema.extend({
  role: userRoleSchema.optional(),
  search: z.string().optional(),
});

export const authRouter = createTRPCRouter({
  // Get current user session
  me: protectedProcedure
    .query(({ ctx }) => {
      return ctx.user;
    }),

  // Update user role (SuperAdmin only)
  updateUserRole: superAdminProcedure
    .input(updateRoleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await RoleManager.updateUserRole(
        ctx.user.id,
        input.userId,
        input.role
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update user role',
        });
      }

      return { success: true };
    }),

  // Get users list (Admin+)
  getUsers: protectedProcedure
    .input(getUsersInputSchema)
    .query(async ({ ctx, input }) => {
      // Check if user has admin role
      if (!RoleManager.hasRole(ctx.user.role as any, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { role, search, limit, offset } = input;
      
      return await RoleManager.getUserList({
        role: role || 'all',
        search,
        limit,
        offset,
      });
    }),

  // Get users by role (Admin+)
  getUsersByRole: protectedProcedure
    .input(z.object({ role: userRoleSchema }))
    .query(async ({ ctx, input }) => {
      if (!RoleManager.hasRole(ctx.user.role as any, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      return await RoleManager.getUsersByRole(input.role);
    }),
});
```

## Testing Strategy

### Unit Tests
- Role hierarchy validation
- Permission checking logic
- Role assignment validation

### Integration Tests
- Authentication flow with roles
- API endpoint authorization
- Role-based route protection

### E2E Tests
- Complete user flows by role
- Admin panel functionality
- SuperAdmin user management

## Security Considerations

1. **Principle of Least Privilege**: Users start with minimal permissions
2. **Role Validation**: Server-side validation of all role-based operations
3. **Session Security**: Secure session management with role information
4. **Audit Trail**: Log all role changes and administrative actions
5. **Input Validation**: Validate role assignments and prevent privilege escalation