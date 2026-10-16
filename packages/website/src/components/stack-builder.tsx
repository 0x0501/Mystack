import { useState } from "react";
import {
	type Category,
	catalog,
	createCommand,
	incompatibilities,
} from "../configurator";
import model from "../data/machine.json";
import { useStack } from "./stack-context";

export function CopyCommand() {
	const { selection } = useStack();
	const command = createCommand(selection);
	const [copied, setCopied] = useState<{
		command: string;
		message: string;
	} | null>(null);
	async function copy() {
		try {
			await navigator.clipboard.writeText(command);
			setCopied({ command, message: "Copied. Paste it into your terminal." });
		} catch {
			setCopied({
				command,
				message: "Clipboard unavailable. Select and copy the command above.",
			});
		}
	}
	return (
		<div className="command-output" data-ui>
			<div className="code-caption">Your create command</div>
			<pre>
				<code>{command}</code>
			</pre>
			<button type="button" className="button" onClick={copy}>
				Copy command <span aria-hidden="true">↗</span>
			</button>
			<p className="copy-feedback" role="status">
				{copied?.command === command
					? copied.message
					: "Run this from the parent directory of your new project."}
			</p>
		</div>
	);
}
export function StackBuilder() {
	const { selection, choose } = useStack();
	const categories: Category[] = [
		"deployment",
		"database",
		"email",
		"payments",
	];
	const names = {
		deployment: "Runtime",
		database: "Database",
		email: "Email",
		payments: "Payments",
	};
	return (
		<form
			className="stack-builder"
			onSubmit={(event) => event.preventDefault()}
			aria-label="Configure your stack"
		>
			{categories.map((category) => (
				<fieldset key={category}>
					<legend>
						{names[category]}
						<span>
							{category === "payments" ? "Optional · select any" : "Choose one"}
						</span>
					</legend>
					<div className="options">
						{catalog[category].map((option) => {
							const prefix =
								category === "deployment"
									? "runtime"
									: category === "payments"
										? "payment"
										: category;
							const part = model.modules.find(
								(part) => part.id === `${prefix}-${option.id}`,
							);
							const errors =
								category === "deployment" || category === "payments"
									? []
									: incompatibilities({
											deployment: selection.deployment,
											[category]: option.id,
										});
							const checked =
								category === "payments"
									? selection.payments.includes(option.id)
									: selection[category] === option.id;
							return (
								<label
									className="option"
									key={option.id}
									title={errors.join(" ")}
								>
									<input
										type={category === "payments" ? "checkbox" : "radio"}
										name={category}
										value={option.id}
										checked={checked}
										disabled={errors.length > 0}
										onChange={() => choose(category, option.id)}
										aria-label={`${option.label}${errors.length ? `. ${errors.join(" ")}` : ""}`}
									/>
									{part && (
										<svg
											className="option-art"
											aria-hidden="true"
											viewBox={`${part.bounds[0] - 10} ${part.bounds[1] - 10} ${part.bounds[2] - part.bounds[0] + 20} ${part.bounds[3] - part.bounds[1] + 20}`}
										>
											<image
												href={part.asset}
												width={model.width}
												height={model.height}
											/>
										</svg>
									)}
									<span>{option.label}</span>
								</label>
							);
						})}
					</div>
					{category === "database" && (
						<p className="field-note">
							Unavailable options require a different runtime.
						</p>
					)}
					{category === "payments" && (
						<p className="field-note">
							Leave all unselected for an application without payments.
						</p>
					)}
				</fieldset>
			))}
		</form>
	);
}
