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

### 4. Client-Side Role Management

#### File: `app/hooks/use-auth.ts`

```typescript
import { createContext, useContext, type ReactNode } from 'react';
import type { User } from '@portcityai/better-auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  hasRole: (role: 'user' | 'admin' | 'superadmin') => boolean;
  canAssignRole: (targetRole: 'user' | 'admin' | 'superadmin') => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Implementation with better-auth client
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    user,
    isAuthenticated: !!user,
    hasRole,
    canAssignRole,
    login: async (email: string, password: string) => {
      // Better-auth login implementation
    },
    logout: async () => {
      // Better-auth logout implementation
    },
    loading,
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
```

### 5. Protected Route Components

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

## API Endpoints

### Role Management APIs

```typescript
// POST /api/admin/users/:userId/role
// Body: { role: 'user' | 'admin' | 'superadmin' }
app.post('/api/admin/users/:userId/role', authMiddleware, requireRole('admin'), async (c) => {
  const { userId } = c.req.param();
  const { role } = await c.req.json();
  const adminUser = c.get('user');

  const result = await RoleManager.updateUserRole(adminUser.id, userId, role);
  
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({ success: true });
});

// GET /api/admin/users
app.get('/api/admin/users', authMiddleware, requireRole('admin'), async (c) => {
  const users = await RoleManager.getUsersByRole('user');
  return c.json(users);
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