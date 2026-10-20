export const LCP_TYPE = "application/vnd.readium.lcp.license.v1.0+json";

export function getLcpLinks(links: any[]): any[] {
	return links.filter(
		(link) =>
			link.rel === "http://opds-spec.org/acquisition" &&
			link.type === LCP_TYPE,
	);
}

export function getLcpFormat(link: any): string {
	const child = link.properties?.indirectAcquisition?.[0]?.child?.[0]?.type;
	if (child === "application/pdf+lcp") return "Encrypted PDF";
	if (child === "application/epub+zip") return "Encrypted EPUB";
	return "file";
}

export function getLcpPassphrase(link: any): string {
	return link.properties?.lcp_hashed_passphrase ?? "";
}
