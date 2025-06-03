import { type SubmitTarget, useSubmit } from "react-router";

export function useSubmitPost() {
	const submit = useSubmit();
	const submitPost: (target: SubmitTarget) => Promise<void> = async (
		target,
	) => {
		return submit(target, { method: "post", encType: "application/json" });
	};
	return submitPost;
}
