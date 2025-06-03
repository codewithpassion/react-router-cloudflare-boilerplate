import { Navigate, Outlet } from "react-router";
import { AdminLayout } from "~/components/admin-layout-new";
import { useAuth } from "~/hooks/use-auth";

export default function AdminLayoutRoute() {
	const { user, isAdmin } = useAuth();

	if (!isAdmin) {
		return <Navigate to="/login" replace />;
	}

	return (
		<AdminLayout user={user}>
			<Outlet />
		</AdminLayout>
	);
}
