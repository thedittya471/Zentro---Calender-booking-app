# Zentro design

## Purpose

Make individual scheduling feel calm and personal. The public website tells a story: reclaim your time, set your rhythm, share a booking link, and make room for the meeting itself. The workspace uses the same visual language with quieter motion and denser navigation.

The website must identify the product as a preview until scheduling is released. Calls to action open the working workspace preview. Illustrative calendars, links and confirmations are labelled examples; they must never imply a real reservation, calendar connection or authenticated account. No fabricated testimonials, customer logos or usage statistics.

## Visual direction

- Midnight navy canvas, ice-blue accents and pearl-white text. Muted steel-blue labels and restrained amber ambient lighting keep the glass surfaces legible and give the scene depth.
- Large editorial headlines with restrained serif italics; system sans-serif for navigation, controls and scheduling details. No external font request is required to render the site.
- Generous space on the public website, compact structure in the workspace. Thin borders and subtle shadows distinguish the illustrative product surfaces.
- Rounded controls and larger rounded story panels use a consistent radius scale. Translucent navy surfaces, restrained backdrop blur, fine icy highlights and soft shadows create glass depth. Ambient lighting stays behind content; avoid coloring text with gradients or blurring readable content.
- Product illustrations use HTML/CSS with perspective rather than video or remote imagery. A decorative WebGL scene adds a softly lit three-dimensional ring and pearl behind the landing page. Their geometry should adapt naturally to narrow screens.

## Public website

1. Header: Zentro identity, links to the story and questions, and a clear workspace-preview action.
2. Hero: a centered, oversized “Make room for what matters.” headline sits above a wide time-studio console: an agenda rail, a calendar and a conversation note. The product's preview status stays visible.
3. Story: three chapters explain availability, sharing and the meeting outcome. On spacious desktop viewports, a sticky editorial introduction and chapter index sit beside three vertically scrolling panels. Each panel pairs a short explanation with a distinct illustration: a week grid, a split host-and-time-selector invitation, then a meeting pass. Narrow screens stack the introduction and chapters into one column; short viewports disable the sticky introduction.
4. Principle: a short editorial pause about protecting time, with a second preview action.
5. Questions: an accessible accordion explains the preview, individual scheduling scope, guest access and Google Calendar intent.
6. Footer: identity and useful internal links. No unavailable sign-up, pricing or account controls.

## Workspace

- Keep `/dashboard` and its existing section addresses. The current destination has a visible indicator and `aria-current="page"`.
- Desktop uses a sidebar and content header; mobile keeps all navigation destinations visible without a modal menu.
- Overview introduces the four scheduling areas. Each unreleased section has an honest unavailable state and a way back to the overview.
- Unknown URLs return an actual 404 with a recovery link. The public booking experience belongs outside this workspace layout.
- Private account and booking data require server-side authentication and authorization before being introduced; the visual shell does not establish access control.

## Forms and feedback

Use visible labels and native input semantics. Shared fields connect labels, hints and inline errors with stable IDs, preserve native input props and refs, and mark invalid fields only after validation. Required fields identify that requirement in text. Keep keyboard focus visible, error messages readable without color, and control targets at least 44 pixels high.

Validation failures keep entered values, explain how to correct them and focus the first invalid field. Use an alert region for submission errors and a polite status region for successful feedback. Clear stale success feedback when users edit values; resetting a form clears values and feedback. Client validation improves usability; real mutations must independently validate on the server.

The workspace overview includes an explicitly local component demonstration using made-up contact details. It sends no requests, stores nothing and never claims to create an account or booking. Disable its controls until hydration; keep the explanatory text available without JavaScript. Add pending, retry and provider failure behavior with the first real asynchronous form rather than simulating it here.

## Motion and components

GSAP ScrollTrigger owns the public scroll narrative and decorative scroll reveals. Motion owns small hover/press interactions, accordion indicators and workspace entrance transitions. Never let both libraries animate the same element. Use Radix Accordion for its accessible disclosure and keyboard behavior.

Animation enhances server-rendered content. Headings, navigation and calls to action must remain visible before animation setup. Keep native scrolling; no smooth-scroll engine, autoplay video or continuous animation loop. Animate transforms rather than reflowing page geometry on every frame.

Use native WebGL for the small ambient scene without a general-purpose 3D framework or remote assets. Coalesce scroll/resize renders into one animation frame, cap drawing-buffer resolution, stop drawing in hidden tabs and release GPU resources/listeners when the scene leaves the page. WebGL availability, allocation/link failures and context loss must leave the CSS ambient fallback and all content usable. Reduced motion uses the static fallback without a WebGL renderer. Do not require blur support to read or operate the interface.

On spacious viewports, the hero calendar changes perspective and its tiles separate as the reader scrolls away. The booking link assembles as its chapter enters; the host and guest move together and the meeting symbol joins into place in the final chapter. These sequences reverse on upward scrolling. The WebGL ring separates into two halves and reforms across the narrative. Story illustrations shift as their vertical chapters pass through the viewport. Small screens retain the simpler reading flow; reduced motion removes these transform sequences and uses the static background. Keep functional workspace motion quieter than the public narrative.

Scope GSAP work to the mounted landing page. Revert timelines, ScrollTriggers and responsive classes on navigation/unmount and when media preferences change. Do not leave duplicate triggers after returning from the workspace.

Section links must reach the intended content after animation setup, including repeated clicks on the current section. Use Next.js navigation for internal links, including fragments, so browser Back and Forward restore the correct route and scroll position. Measure the finished layout before native history restoration.

Honor `prefers-reduced-motion` in GSAP, Motion and CSS. Reduced motion disables scrubbed movement and transform transitions. Every viewport retains native vertical reading and scrolling. Animation failure must leave the content and navigation usable.

## Accessibility and verification

Use one main landmark and one page heading, logical heading levels, descriptive link/button names, a keyboard skip link and clearly visible focus indicators. Normal text needs at least 4.5:1 contrast. Primary navigation targets are at least 44 pixels high. Never communicate availability or active state through color alone.

Verify at 320, 768, 1024 and 1440 pixels, including long text and keyboard use. Check scroll progress, reverse scrolling, browser history, repeated page navigation, accordion keyboard behavior, reduced motion, missing-route recovery and console output. Keep automated HTTP checks for the real routes and preview boundary. Browser evidence belongs in the work tracker; this document defines the intended design.

## Implementation references

- [React input semantics and stable label IDs](https://react.dev/reference/react-dom/components/input).
- [ARIA invalid-state guidance](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid).

- [Next.js links and section navigation](https://nextjs.org/docs/app/api-reference/components/link).
- [React layout measurement before paint](https://react.dev/reference/react/useLayoutEffect).
- [GSAP responsive setup and cleanup](<https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/>).
- [ScrollTrigger pinning and scrubbing](https://gsap.com/docs/v3/Plugins/ScrollTrigger/).
- [Motion accessibility and reduced motion](https://motion.dev/docs/react-accessibility).
- [Radix Accordion anatomy and keyboard interaction](https://www.radix-ui.com/primitives/docs/components/accordion).
- [WebGL resource and performance guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
- [WebGL context-loss behavior](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event).
- [Backdrop filtering and translucent surfaces](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter).
