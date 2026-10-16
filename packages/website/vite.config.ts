import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	// The dev server listens on every interface, so the devtools must not launch
	// an editor for a path supplied by a request.
	plugins: [
		devtools({ editor: { name: "none", open: async () => {} } }),
		tanstackStart(),
		react(),
	],
	server: { port: 3100, host: "0.0.0.0" },
});
