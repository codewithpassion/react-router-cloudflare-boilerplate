import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { signOut } from "~~/auth-client";

export default function Logout() {
	const navigate = useNavigate();

	const handleSingOut = useCallback(async () => {
		await signOut();
		navigate("/");
	}, [navigate]);

	useEffect(() => {
		handleSingOut();
	}, [handleSingOut]);

	return null;
}
