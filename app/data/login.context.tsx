import { createContext, useContext, useEffect, useState } from "react";

export interface LoginContextProps {
	email: string;
	submitting: boolean;
	error: string | null;
	setEmail: (email: string) => void;
	submit: () => void;
}

export const LoginContext = createContext<LoginContextProps>({
	email: "",
	setEmail: () => {},
	submit: () => {},
	submitting: false,
	error: null,
});

export const useLoginContext = () => {
	const context = useContext(LoginContext);
	if (!context) {
		throw new Error("useLoginContext must be used within a LoginProvider");
	}
	return context;
};

export const LoginProvider: React.FC<{
	children: React.ReactNode;
	onSubmit: (email: string) => Promise<void>;
	error: { error: string; status: number } | undefined;
}> = ({ children, onSubmit, error }) => {
	const [email, setEmail] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [errorMessage, setError] = useState<string | null>(
		error?.error || null,
	);

	useEffect(() => {
		if (error) {
			setError(error.error);
			setSubmitting(false);
		} else {
			setError(null);
		}
	}, [error]);

	const submit = async () => {
		console.log("Submitting email:", email);
		setError(null);

		if (!email) {
			alert("Please enter your email address.");
			return;
		}

		try {
			setSubmitting(true);
			await onSubmit(email);
			setSubmitting(false);
		} catch (error) {
			console.error("Error during login:", error);
			alert("An error occurred during login. Please try again.");
		}
	};

	return (
		<LoginContext.Provider
			value={{ email, setEmail, submit, submitting, error: errorMessage }}
		>
			{children}
		</LoginContext.Provider>
	);
};
