import { t as e } from "./i18n-0Dcg7OLR.js";
// src/content/contributors.ts
var t = {
	name: "Quan Ho",
	linkedin: "https://www.linkedin.com/in/quan-ho-a56799409/"
};
t.name, t.linkedin;
// src/content/pages/schema.ts
var n = (...e) => e, r = (e, t, n = !1) => ({
	text: e,
	href: t,
	external: n
}), i = (e, t) => [{
	text: e,
	term: !0
}, t], a = {
	googlePrivacy: "https://policies.google.com/privacy",
	accuracy: "#privacy-accuracy",
	react: "https://react.dev/",
	vite: "https://vite.dev/",
	typescript: "https://www.typescriptlang.org/",
	gsap: "https://gsap.com/",
	lenis: "https://lenis.darkroom.engineering/",
	webllm: "https://webllm.mlc.ai/",
	groq: "https://groq.com/",
	cloudflare: "https://developers.cloudflare.com/workers-ai/",
	openrouter: "https://openrouter.ai/",
	mistral: "https://mistral.ai/"
}, o = [
	"privacy-storage",
	"privacy-signing-in",
	"privacy-essay",
	"privacy-reports",
	"privacy-gemini",
	"privacy-server",
	"privacy-impact",
	"privacy-helpers",
	"privacy-terms",
	"privacy-accuracy"
], s = [
	"about-purpose",
	"about-marking",
	"about-accuracy",
	"about-contributors",
	"about-owner",
	"about-credits"
];
function c(i, a) {
	let c = (e, t) => e.flatMap((e) => {
		let n = t[e];
		return n ? [{
			id: e,
			heading: n[0],
			paragraphs: n.slice(1)
		}] : [];
	}), l = [
		e("Meet the owner", void 0, i),
		n(e("{name} is the owner of BAND.EXE: a first-year college student at SUA, from Vietnam. He'd love your support on his journey.", { name: t.name }, i)),
		n(r(e("Support him on LinkedIn", void 0, i), t.linkedin, !0))
	];
	return {
		privacy: c(o, a.privacy),
		about: c(s, {
			...a.about,
			"about-owner": l
		}),
		privacyPage: a.privacyPage,
		contributorRole: a.contributorRole
	};
}
export { n as a, c as i, i as n, a as r, r as t };
