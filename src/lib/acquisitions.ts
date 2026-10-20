import { opds } from "$lib/stores/opdsStore";
import { getLcpLinks } from "$lib/lcp";

/**
 * Filters publication links into acquisition categories.
 * Usable from both PublicationCard and Publication views.
 */
export function getAcquisitionLinks(links: any[]) {
	const filtered = links.filter((link: any) => {
		const rel = link.rel;
		if (Array.isArray(rel)) return !rel.includes("alternate");
		return rel !== "alternate";
	});

	const borrowLinks = filtered.filter((link: any) => opds.shouldShowBorrow(link));

	const readLinks = filtered.filter(
		(link: any) =>
			link.rel === "http://opds-spec.org/acquisition" &&
			link.type === "text/html",
	);

	const returnLink = filtered.find(
		(link: any) =>
			link.rel === "http://opds-spec.org/acquisition/return" &&
			link.type === "application/opds-publication+json",
	);

	const buyLinks = filtered.filter((link: any) => opds.shouldShowBuy(link));

	const openAccessLinks = opds.getOpenAccessLinks({ links: filtered });
	const readOnlineOpenAccess = openAccessLinks.filter((oa: any) => oa.type === "text/html");
	const downloadableOpenAccess = openAccessLinks.filter((oa: any) => oa.type !== "text/html");

	const lcpLinks = getLcpLinks(filtered);

	const sample = opds.getSample({ links: filtered });
	const availability = opds.getAvailability({ links: filtered });
	const hasDownloads = downloadableOpenAccess.length > 0 || lcpLinks.length > 0;

	return {
		all: filtered,
		borrowLinks,
		readLinks,
		returnLink,
		buyLinks,
		openAccessLinks,
		readOnlineOpenAccess,
		downloadableOpenAccess,
		lcpLinks,
		sample,
		availability,
		hasDownloads,
	};
}
