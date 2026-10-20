import { describe, it, expect } from "vitest";
import { getLcpLinks, getLcpFormat, getLcpPassphrase, LCP_TYPE } from "./lcp.js";
import fixture from "../../archive-loan-webpub.json";

describe("getLcpLinks", () => {
	it("returns only LCP acquisition links", () => {
		const links = getLcpLinks(fixture.links);
		expect(links).toHaveLength(2);
		links.forEach((l) => expect(l.type).toBe(LCP_TYPE));
	});

	it("excludes text/html links", () => {
		const links = getLcpLinks(fixture.links);
		links.forEach((l) => expect(l.type).not.toBe("text/html"));
	});
});

describe("getLcpFormat", () => {
	it("detects PDF", () => {
		const pdfLink = getLcpLinks(fixture.links).find((l) => l.href.includes("lcp_pdf"));
		expect(getLcpFormat(pdfLink)).toBe("Encrypted PDF");
	});

	it("detects EPUB", () => {
		const epubLink = getLcpLinks(fixture.links).find((l) => l.href.includes("lcp_epub"));
		expect(getLcpFormat(epubLink)).toBe("Encrypted EPUB");
	});

	it("falls back to 'file' for unknown formats", () => {
		expect(getLcpFormat({ properties: {} })).toBe("file");
	});
});

describe("getLcpPassphrase", () => {
	it("extracts lcp_hashed_passphrase", () => {
		const link = getLcpLinks(fixture.links)[0];
		expect(getLcpPassphrase(link)).toBe("BLAH");
	});

	it("returns empty string when missing", () => {
		expect(getLcpPassphrase({ properties: {} })).toBe("");
	});
});
