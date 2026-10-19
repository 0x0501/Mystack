import { describe, expect, it } from "vitest";
import { documentTopics } from "../../packages/website/src/data/documentation";
import {
	absoluteUrl,
	articleSchema,
	llmsTxt,
	robotsTxt,
	seo,
	sitemapXml,
} from "../../packages/website/src/services/seo";

describe("website SEO", () => {
	it("lists every page once, including each documentation topic", () => {
		const locations = [...sitemapXml().matchAll(/<loc>(.*?)<\/loc>/g)].map(
			(match) => match[1],
		);
		expect(new Set(locations).size).toBe(locations.length);
		for (const path of [
			"/",
			"/integrations",
			"/foundation",
			"/quick-start",
			"/docs",
			...documentTopics.map((topic) => `/docs/${topic}`),
		]) {
			expect(locations).toContain(absoluteUrl(path));
		}
		expect(robotsTxt()).toContain(`Sitemap: ${absoluteUrl("/sitemap.xml")}`);
		expect(llmsTxt()).toContain(absoluteUrl("/docs/authentication"));
	});

	it("gives a page one canonical URL shared by its social tags and structured data", () => {
		const path = "/docs/configuration";
		const head = seo(path, articleSchema(path));
		const url = absoluteUrl(path);
		expect(head.links).toEqual([{ rel: "canonical", href: url }]);
		expect(head.meta).toContainEqual({ property: "og:url", content: url });
		expect(head.meta).toContainEqual({ name: "twitter:url", content: url });
		expect(head.scripts).toHaveLength(1);
		expect(JSON.parse(head.scripts[0].children)).toMatchObject({
			"@type": "TechArticle",
			url,
		});
	});
});
