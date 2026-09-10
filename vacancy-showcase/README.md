# Vacancy — Product Showcase

A standalone top-of-funnel website for **Vacancy**, a room-rental marketplace that connects people looking for rooms with people who have vacancies to fill.

This website is intentionally separate from the core Vacancy marketplace application. Its job is product communication, not marketplace functionality.

## Purpose

A first-time visitor should understand within seconds:

1. What Vacancy is.
2. Who it serves.
3. Why it is clearer than fragmented room-hunting channels.
4. What to do next: find a room or list a vacancy.

## Content formula

The page follows a problem → product → dual-user paths → differentiated value → simple belief → CTA structure.

- **Hero:** category definition + two primary actions.
- **Problem:** describe the current room-rental friction without inflated claims.
- **Two sides:** explain the seeker and lister jobs separately.
- **Features:** only explain capabilities that support the product concept.
- **Manifesto:** restate the product thesis in plain language.
- **CTA:** route visitors into the actual marketplace.

## Product assumptions represented

### Room seekers
- Search/browse by location.
- Compare structured room information.
- See availability.
- Save promising listings.
- Contact the lister.

### Room listers
- Create and manage room/vacancy listings.
- Handle enquiries.
- Keep vacancy/occupancy status current.
- Manage multiple rooms from a dashboard.
- Support promoted listings as the product develops.

The showcase intentionally avoids unsupported traction numbers, testimonials, or invented marketplace supply.

## Design principles

- Product-first, not generic SaaS styling.
- Clear information hierarchy and short copy.
- Two-sided marketplace story appears early.
- Interface previews are illustrative HTML/CSS mockups, not live marketplace data.
- Responsive layouts for desktop, tablet and mobile.
- Minimal JavaScript; no production API dependency.

## Stack

- Semantic HTML5
- CSS3
- Vanilla JavaScript
- Google Fonts: Manrope + DM Sans
- Static deployment compatible with Vercel

## Files

- `index.html` — structure and product copy
- `styles.css` — responsive visual system
- `script.js` — reveal behavior
- `README.md` — product, content and implementation documentation
- `vercel.json` — static hosting configuration

## Local development

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Deployment

The site is static and requires no environment variables.

## Production handoff

Replace the placeholder CTA links with the final public Vacancy app URL once that entry point is finalized.
