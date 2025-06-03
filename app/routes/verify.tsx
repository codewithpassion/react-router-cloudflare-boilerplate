import { LoginLayout } from "../components/login-layout";

export default function LoginPage() {
	return (
		<LoginLayout>
			<div className="text-center mt-6 md:mt-0">
				<p className="text-xl font-medium">
					We have sent you an email to verify your login.
				</p>
			</div>
		</LoginLayout>
	);
}
