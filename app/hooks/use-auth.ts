import { useLoaderData } from "react-router";
import type { loader } from "~/root";

export interface User {
	id: string;
	email: string;
	name: string;
	role: "user" | "admin";
	emailVerified: boolean;
	createdAt: string;
	image?: string;
}

export function useAuth() {
	const { session } = useLoaderData<typeof loader>();

	const user = session?.user as User | null;

	return {
		user,
		isAuthenticated: !!user,
		isAdmin: user?.role === "admin",
		isVerified: user?.emailVerified || false,
		session,
	};
}
