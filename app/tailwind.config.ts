/** @type {import('tailwindcss').Config} */
// @ts-ignore
module.exports = {
	theme: {
		extend: {
			typography: ({ theme }: { theme: (v: string) => string }) => {
				return {
					assistant: {
						h1: {
							fontSize: "1.25rem",
						},
						h2: {
							fontSize: "1.125rem",
						},
						css: {
							"--tw-prose-body": theme("colors.white"),
							"--tw-prose-headings": theme("colors.white"),
							"--tw-prose-counters": theme("colors.white"),
							"--tw-prose-bold": theme("colors.white"),
						},
					},
					human: {
						css: {
							"--tw-prose-body": theme("colors.black.900"),
						},
					},
				};
			},
		},
	},
};
