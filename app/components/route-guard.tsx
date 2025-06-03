import { Navigate } from "react-router";
import { useAuth } from "~/hooks/use-auth";

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
	fallback,
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
