export interface AuthTokens {
	accessToken: string;
	expiresAt: number;
	refreshAttempted?: boolean;
}

// Local storage helpers
const saveTokensToStorage = (tokens: AuthTokens) => {
	if (typeof window !== "undefined") {
		localStorage.setItem("auth", JSON.stringify(tokens));
	}
};

const getTokensFromStorage = (): AuthTokens | null => {
	if (typeof window === "undefined") return null;

	const auth = localStorage.getItem("auth");
	return auth ? JSON.parse(auth) : null;
};

export const clearTokensFromStorage = () => {
	if (typeof window !== "undefined") {
		localStorage.removeItem("auth");
	}
};

// Token management
export const storeTokens = (accessToken: string, expiresIn: number) => {
	const expiresAt = Date.now() + expiresIn * 1000;
	saveTokensToStorage({ accessToken, expiresAt, refreshAttempted: false });
};

export const getAccessToken = (): string | null => {
	const tokens = getTokensFromStorage();
	if (!tokens) return null;

	// Return token if it's still valid
	if (tokens.expiresAt > Date.now()) {
		return tokens.accessToken;
	}

	// Token expired, will be refreshed by authenticated fetch
	return null;
};
