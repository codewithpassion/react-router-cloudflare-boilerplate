import { Link } from "react-router";
import { Spacer } from "~/components/spacer";
import { LoginLayout } from "../components/login-layout";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";

export default function SignUpPage() {
	return (
		<LoginLayout>
			{/* Form fields */}
			<div className="space-y-4">
				<div>
					<Input type="text" placeholder="Full Name" className="w-full" />
				</div>

				<div>
					<Input type="email" placeholder="Email address" className="w-full" />
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox id="terms" />
					<label
						htmlFor="terms"
						className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						I agree with the{" "}
						<Link to="/tos" className="text-d-green-pri font-medium">
							Terms
						</Link>{" "}
						And{" "}
						<Link to="/privacy" className="text-d-green-pri font-medium">
							Privacy
						</Link>
					</label>
				</div>

				{/* Sign up button */}
				<Button className="w-full rounded-xl" variant="primary">
					Sign Up
				</Button>

				<Spacer className="py-1 md:py-6" />

				{/* Social login options */}
				<div className="space-y-3 mt-4">
					<Button className="w-full" variant="secondary">
						<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
							<title>Google Icon</title>
							<path
								d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
								fill="currentColor"
							/>
						</svg>
						Sign Up with Google
					</Button>
					{/* <Button className="w-full" variant="secondary">
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96C18.34 21.21 22 17.06 22 12.06C22 6.53 17.5 2.04 12 2.04Z" fill="currentColor" />
                        </svg>
                        Sign Up with Facebook
                    </Button>
                    <Button className="w-full" variant="secondary">
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM12.5 16.5H11V11H12.5V16.5ZM12 9.5C11.448 9.5 11 9.052 11 8.5C11 7.948 11.448 7.5 12 7.5C12.552 7.5 13 7.948 13 8.5C13 9.052 12.552 9.5 12 9.5Z" fill="currentColor" />
                        </svg>
                        Sign Up with Apple
                    </Button> */}
				</div>

				{/* Sign up link */}
				<div className="text-center mt-6">
					<p className="text-sm text-">
						Already have an account?{" "}
						<Link to="/login" className="text-d-green-pri font-medium">
							Sign In
						</Link>
					</p>
				</div>
			</div>
		</LoginLayout>
	);
}
