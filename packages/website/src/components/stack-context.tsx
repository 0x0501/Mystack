import { createContext, type ReactNode, useContext, useState } from "react";
import {
	type Category,
	initialSelection,
	type Selection,
	selectRuntime,
} from "../configurator";

type StackState = {
	selection: Selection;
	revision: number;
	choose: (category: Category, value: string) => void;
};
const StackContext = createContext<StackState | null>(null);
export function StackProvider({ children }: { children: ReactNode }) {
	const [selection, setSelection] = useState<Selection>(initialSelection);
	const [revision, setRevision] = useState(0);
	function choose(category: Category, value: string) {
		setSelection((current) => {
			if (category === "deployment") return selectRuntime(current, value);
			if (category === "payments")
				return {
					...current,
					payments: current.payments.includes(value)
						? current.payments.filter((id) => id !== value)
						: [...current.payments, value],
				};
			return { ...current, [category]: value };
		});
		setRevision((value) => value + 1);
	}
	return (
		<StackContext.Provider value={{ selection, revision, choose }}>
			{children}
		</StackContext.Provider>
	);
}
export function useStack() {
	const value = useContext(StackContext);
	if (!value) throw new Error("Stack provider is missing");
	return value;
}
