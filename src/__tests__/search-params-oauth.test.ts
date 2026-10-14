import { defaultParseSearch } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import {
	type SearchParamsRecord,
	stringifySearch,
} from "@/utils/search-params";

/** TanStack's parse type is an opaque schema; for tests we re-read keys we know. */
function asSearchRecord(
	parsed: ReturnType<typeof defaultParseSearch>,
): SearchParamsRecord {
	return parsed as SearchParamsRecord;
}

/**
 * Better Auth's oauth-provider signs authorize redirects with a multi-value
 * `ba_param` list. The client rebuilds `oauth_query` from window.location.search
 * using only those listed keys — so a JSON-array rewrite of ba_param makes
 * sign-in POST /api/auth/sign-in/email return 400 invalid_signature.
 */
const FAITHFUL_OAUTH_QUERY =
	"response_type=code&client_id=xmgWQuPvLVGwtMhwgryGAEWdUTjPSxpv&redirect_uri=http%3A%2F%2F127.0.0.1%3A38256%2Foauth%2Fcallback&scope=profile+email+offline_access+token%3Aread+token%3Awrite&state=testdebug123&code_challenge=UL6WGNhxgcvacdb5dpFLQ6Dn0A47pdt_vRsPu7YPcww&code_challenge_method=S256&exp=1784947726&ba_iat=1784947126487&ba_param=ba_iat&ba_param=ba_param&ba_param=client_id&ba_param=code_challenge&ba_param=code_challenge_method&ba_param=exp&ba_param=redirect_uri&ba_param=response_type&ba_param=scope&ba_param=state&sig=Z%2Bt0G2B3XBXoVZ1EX%2B%2BvJHDYz%2FB%2FzJKOmZHxVT4gQB8%3D";

describe("stringifySearch (OAuth multi-value ba_param)", () => {
	it("round-trips repeated ba_param keys instead of collapsing them to JSON", () => {
		const parsed = asSearchRecord(defaultParseSearch(FAITHFUL_OAUTH_QUERY));
		expect(Array.isArray(parsed.ba_param)).toBe(true);

		const out = stringifySearch(parsed);
		const outParams = new URLSearchParams(
			out.startsWith("?") ? out.slice(1) : out,
		);

		expect(outParams.getAll("ba_param")).toEqual([
			"ba_iat",
			"ba_param",
			"client_id",
			"code_challenge",
			"code_challenge_method",
			"exp",
			"redirect_uri",
			"response_type",
			"scope",
			"state",
		]);
		// Must not be the JSON-array form the default serializer emits.
		expect(outParams.get("ba_param")?.startsWith("[")).toBe(false);
		expect(outParams.get("client_id")).toBe("xmgWQuPvLVGwtMhwgryGAEWdUTjPSxpv");
		expect(outParams.get("sig")).toBeTruthy();
	});

	it("still stringifies plain single-value search params", () => {
		expect(stringifySearch({ redirect: "/dashboard", ref: "abc" })).toBe(
			"?redirect=%2Fdashboard&ref=abc",
		);
	});
});
