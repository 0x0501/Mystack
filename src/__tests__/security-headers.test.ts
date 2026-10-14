import { describe, expect, it } from "vitest";
import { withSecurityHeaders } from "@/lib/security-headers";

describe("baseline security headers", () => {
	it("preserves status and body", async () => {
		const res = withSecurityHeaders(
			new Response("payload", { status: 201, statusText: "Created" }),
		);
		expect(res.status).toBe(201);
		expect(await res.text()).toBe("payload");
	});
});
