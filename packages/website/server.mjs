import { resolve, sep } from "node:path";
import handler from "./dist/server/server.js";

const assets = resolve(import.meta.dirname, "dist/client");
const server = Bun.serve({
	port: Number(process.env.PORT || 3100),
	async fetch(request) {
		const pathname = new URL(request.url).pathname;
		if (request.method === "GET" || request.method === "HEAD") {
			let decoded;
			try { decoded = decodeURIComponent(pathname); } catch { return new Response("Bad request", { status: 400 }); }
			const filePath = resolve(assets, `.${decoded}`);
			if (filePath.startsWith(assets + sep)) {
				const file = Bun.file(filePath);
				if (await file.exists()) return new Response(request.method === "HEAD" ? null : file, { headers: { "Content-Type": file.type } });
			}
		}
		return handler.fetch(request);
	},
});
console.log(`Mystack website: http://localhost:${server.port}`);
