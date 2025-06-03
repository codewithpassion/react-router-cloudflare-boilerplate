import { useContext, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router";
import { Spacer } from "~/components/spacer";
import { LoginContext, LoginProvider } from "~/data/login.context";
import { signIn } from "~~/auth-client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export default function Login() {
	const navigate = useNavigate();
	const [result, setResult] = useState<
		{ error: string; status: number } | undefined
	>(undefined);

	const submit = async ({ email }: { email: string }) => {
		signIn.magicLink(
			{ email, callbackURL: `${window.location.origin}/feed` },
			{
				onSuccess: () => {
					console.log("Success");
					navigate("/verify");
				},
				onError: (error) => {
					console.error("Error signing in:", error);
					setResult({ error: "Unauthorized", status: 401 });
				},
			},
		);
	};

	return (
		<LoginProvider
			onSubmit={async (email) => {
				await submit({ email });
			}}
			error={result}
		>
			<LoginPage />
		</LoginProvider>
	);
}

export function LoginPage() {
	const { email, setEmail, submit, submitting, error } =
		useContext(LoginContext);

	return (
		<div className="space-y-4">
			<div>
				<Input
					type="email"
					placeholder="Email address"
					className="w-full text-black"
					value={email}
					onChange={(e) => {
						setEmail(e.target.value);
					}}
					required
				/>
			</div>

			{error && <div className="text-red-500 text-sm">{error}</div>}

			{/* Sign up button */}
			<Button
				className="w-full rounded-xl"
				variant="primary"
				size={"lg"}
				onClick={submit}
				disabled={submitting}
			>
				Sign In
			</Button>

			<Outlet />

			<Spacer className="py-1 md:py-6" />

			{/* Social login options */}
			<div className="space-y-3 mt-4">
				<Button className="w-full" variant="secondary">
					<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
						<title>Google</title>
						<path
							d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
							fill="currentColor"
						/>
					</svg>
					Sign In with Google
				</Button>
				{/* <Button className="w-full" variant="secondary">
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96C18.34 21.21 22 17.06 22 12.06C22 6.53 17.5 2.04 12 2.04Z" fill="currentColor" />
                        </svg>
                        Sign In with Facebook
                    </Button>
                    <Button className="w-full" variant="secondary">
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM12.5 16.5H11V11H12.5V16.5ZM12 9.5C11.448 9.5 11 9.052 11 8.5C11 7.948 11.448 7.5 12 7.5C12.552 7.5 13 7.948 13 8.5C13 9.052 12.552 9.5 12 9.5Z" fill="currentColor" />
                        </svg>
                        Sign In with Apple
                    </Button> */}
			</div>

			{/* Sign up link */}
			<div className="text-center mt-6">
				<p className="text-sm text-">
					Don’t have an account?{" "}
					<Link to="/signup" className="text-d-green-pri font-medium">
						Sign Up
					</Link>
				</p>
			</div>
		</div>
	);
}
