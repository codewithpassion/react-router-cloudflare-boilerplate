import {
	type ActionFunctionArgs,
	type AppLoadContext,
	Outlet,
} from "react-router";
import { LoginLayout } from "../components/login-layout";

import { useContext } from "react";
import { redirect } from "react-router-dom";
import { LoginContext } from "~/data/login.context";

export async function action({
	request,
	context,
	params,
}: ActionFunctionArgs<AppLoadContext>) {}

export default function Login() {
	const { email, setEmail, submit, submitting, error } =
		useContext(LoginContext);

	return (
		<LoginLayout>
			<Outlet />
		</LoginLayout>
	);
}
