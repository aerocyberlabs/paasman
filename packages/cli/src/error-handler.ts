import {
	AuthError,
	ConnectionError,
	NotFoundError,
	PaasmanError,
	UnsupportedError,
	ValidationError,
} from "@paasman/core";
import chalk from "chalk";

export function handleError(err: unknown): never {
	if (err instanceof AuthError) {
		console.error(chalk.red("Authentication failed."), "Run `paasman init` to reconfigure.");
	} else if (err instanceof ConnectionError) {
		console.error(chalk.red("Connection failed."), err.message);
	} else if (err instanceof NotFoundError) {
		console.error(chalk.red("Not found:"), err.message);
	} else if (err instanceof UnsupportedError) {
		console.error(chalk.yellow("Unsupported:"), err.message);
	} else if (err instanceof ValidationError) {
		console.error(chalk.red("Validation error:"), err.message);
		if (err.fields) {
			for (const [field, msg] of Object.entries(err.fields)) {
				console.error(`  ${field}: ${msg}`);
			}
		}
	} else if (err instanceof PaasmanError) {
		console.error(chalk.red(`Error [${err.code}]:`), err.message);
	} else if (err instanceof Error) {
		console.error(chalk.red("Unexpected error:"), err.message);
	} else {
		console.error(chalk.red("Unexpected error:"), err);
	}
	process.exit(1);
}
