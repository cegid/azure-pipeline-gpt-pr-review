import { defineConfig } from 'vitest/config'


export default defineConfig({
		test: {
			include: ["tests/**/*.spec.{ts,tsx}"],
			environment: "node",
			globals: true,
			coverage: {
				reporter: [
					"cobertura",
					"html",
					"json",
					"lcov",
					"text",
				],
				exclude: [
					// Ignore configuration files
					"**/*{.,-}config.?(c|m)[jt]s",
				],
			},
			reporters: [
				"default",
			]
		},
	}
);