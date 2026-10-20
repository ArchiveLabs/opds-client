import { writable } from "svelte/store";

export const carouselScroll = writable<Record<string, number>>({});
