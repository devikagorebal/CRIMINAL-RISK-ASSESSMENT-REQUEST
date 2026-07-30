# Criminal Risk Assessment Request.

## Project Overview

For this project, I took the **Manitoba Families "Criminal Risk Assessment Request"** paper form and digitized it in two stages:

1. Built a fully working **ODK XLSForm** from scratch, following the official [ODK XLSForm specification](https://docs.getodk.org/xlsform/), so this form could be deployed on ODK Collect / KoboToolbox for field data collection.
2. Used an AI reasoning model (I chose **Claude) to generate a matching **web version of the same form**, using both the original PDF and my finished XLSForm as inputs.

I originally built the web version as a server-rendered prototype, but decided to simplify it down to a plain static HTML/CSS/JS site — no deployment setup, no runtime dependency, and no build step. Anyone can just double-click `index.html` and it works. That change is part of the prompt history below.

The end result is two parallel, schema-consistent versions of the same government form — one for mobile/offline data collection (ODK), one for the browser — built off a single source of truth.

---

## Why This Form Was a Good Test Case

This wasn't a simple contact form. The PDF had a few things that made it a genuinely useful exercise:

- **Two pages** with a hard requirement that a field on page 2 (name of person being assessed) must match what was entered on page 1.
- **Conditional fields** — the "Unconsented" checkbox changes whether a signature/witness section is even relevant; the ID section has "Other" and "MB Driver's Licence" checkboxes that only need a follow-up text box when selected.
- **A required minimum of two pieces of ID**, which needed to be modeled as a constraint, not just a plain checklist.
- **Legal/statutory language** (references to *The Child and Family Services Act* s.18.4(1.1) and s.76, and the federal Privacy Act s.8) that had to be preserved exactly, not paraphrased.
- Fields explicitly marked required with asterisks (`*`) that needed to carry through into both the XLSForm `required` column and the web form's `required` attributes.

---

## Part 1: The XLSForm

**File:** `xlsform/Criminal_Risk_Assessment_Request.xlsx`

Structured into four logical groups mirroring the PDF's sections:

| Group | Contents |
|---|---|
| `consent` | Consent statement, date, unconsented checkbox, signature, witness |
| `identity` | Name, DOB, sex, other names used, address, phone, place of birth |
| `identification` | ID type checklist, "Other" specify field, MB driver's licence number |
| `request_details` | Agency, reason for assessment, assigned worker, submitting designate contact info, request date |

Key logic built in:
- Signature/witness fields only appear (`relevant`) when the person is **not** marked unconsented.
- "Other" and "MB Driver's Licence" reveal their follow-up text boxes only when checked (`selected()` expression).
- Page 2's name field auto-fills from page 1's first + last name via a `calculate` field, satisfying the PDF's "must match page 1" requirement.
- A `constraint` enforces at least two pieces of ID selected.

**I didn't just eyeball this for correctness** — I ran it through `pyxform` (the same conversion engine that powers the official ODK online converter) to confirm it compiles with zero errors or warnings:

---

## Part 2: The Static Web Form

**Files:** `index.html`, `styles.css`, `script.js`, `submitted.html`

This is a plain, dependency-free implementation of the same form:

- `index.html` — the form markup, keeping the same two-page layout, section order, and field names as the XLSForm (`first_name`, `sex`, `id_type_provided`, `reason_for_assessment`, etc.), so a real backend could bind to the same schema either way
- `styles.css` — a Manitoba-government-style visual theme (green accent, bordered sections, note callouts, highlighted "two pieces of ID" warning)
- `script.js` — handles form submission entirely client-side: it serializes the form into a plain object, saves it to `localStorage`, auto-syncs the page-2 "name of person being assessed" field from the first/last name fields as you type, and redirects to the confirmation page
- `submitted.html` — reads the saved submission back out of `localStorage` and renders it as a readable summary

**Why static instead of a server-rendered prototype:** the original version required a runtime environment and setup just to preview it — which is friction for something that's meant to be a quick reviewable deliverable. Converting it to plain HTML/CSS/JS with `localStorage` means anyone (including a non-technical reviewer) can just open `index.html` in any browser with zero setup, and still see a fully working submit → confirm flow.

### Running it

No install, no server. Just open [index.html](index.html) in a browser.

---

## Prompt History

Below is a cleaner and more professional prompt sequence that reflects the workflow from source document to validated form and working web interface.

**Prompt 1 (initial request, with the PDF and a reference XLSForm attached):**
> "Create an ODK XLSForm from the attached PDF, following the structure and column conventions used in the reference XLSForm."

I attached the Manitoba Criminal Risk Assessment Request PDF plus an existing XLSForm example (`BBCI.xlsx`, an unrelated health-screening form I had used before) so the language model would follow the column conventions I wanted (`type, name, label, required, required_message, appearance, hint, relevant, default, constraint, constraint_message, calculation, repeat_count, read_only`) instead of inventing a different structure.

**Prompt 2:**
> "Use the completed XLSForm and the original PDF as inputs to generate a web form version that mirrors the same sections, logic, and field names using a reasoning-capable language model."

This step focused on producing the second half of the deliverable: a browser-based form that matched the spreadsheet structure and the original document closely.

**Prompt 3:**
> "The form is not functioning correctly when opened directly in a browser. Please revise the approach so the interface works as a fully static web experience with client-side handling and a confirmation page."

This surfaced the need to shift from a server-dependent approach to a browser-based flow that could be opened and tested directly.

**Prompt 4:**
> "Convert the form into a dependency-free static web interface with the same form flow, conditional behavior, and confirmation experience, while preserving a consistent schema for future integration."

That prompt led to the final implementation: a dependency-free web form that works by opening the file directly in a browser, stores the submission in `localStorage`, and shows the confirmation summary on the next page.

**Prompt 5:**
> "Create a README file for this project and include the prompt history and implementation summary."

This document.

---

## Why I Chose Claude as the Reasoning Model

I needed a model that could do more than OCR a PDF and copy rows into a spreadsheet. Specifically:

- **Cross-referencing two different document types at once** — a scanned/graphical PDF layout and a structured spreadsheet — and reconciling them into one consistent schema.
- **Making modeling judgment calls that aren't spelled out anywhere in the source** — e.g., recognizing that the "Unconsented" checkbox should gate the signature/witness fields, that "Other" and "MB Driver's Licence" are conditional reveal fields, and that the page 2 name field should derive from page 1 rather than be re-typed.
- **Self-validating its own output** — actually running the generated XLSForm through `pyxform`, and later confirming the static HTML/JS actually works by testing the submit → localStorage → confirmation flow, rather than just producing something that "looks right."
- **Adapting when the first approach wasn't the right fit** — when the initial prototype turned out to be more setup than the project needed, the same reasoning process was used to simplify it down to a static site without losing any of the form's structure or field logic.

---

## Pros of Using AI for This Task

- Much faster than manually transcribing a dense, two-page government form into two separate technical formats by hand.
- Field naming stayed consistent across the XLSForm and the web form — something that's easy to get out of sync doing this manually across two files.
- Caught structural relationships in the form (asterisked required fields, conditional reveal logic, cross-page consistency) that are easy to miss when skimming a form quickly.
- Could pivot quickly from a server-based approach to a static one without having to redo the underlying form logic from scratch.

## Cons of Using AI for This Task

- **Ambiguous scanned text needed human judgment.** The PDF's field 5 literally read "MALE ☐ MALE ☐" due to an OCR/typo artifact in the source — clearly meant to be Male/Female, but that's an inference, not a read. I flagged this and would want a human sign-off before this ships to production.
- **Legal wording carries risk.** This form cites specific legislation (CFS Act, Privacy Act). The AI preserved the text but can't confirm the digitized version remains legally equivalent — that needs actual legal/compliance review from Manitoba Families.
- **`localStorage` is a placeholder, not a real backend.** This static version is great for demoing the form and layout, but it does not actually send data anywhere durable or shareable — a real deployment needs an actual backend/database, which this version intentionally does not include.
- **No live conditional logic yet.** The XLSForm's show/hide behavior (e.g. "Other" revealing a text box) is represented visually in the web form but isn't wired up with JavaScript to actually hide/show fields — that's a follow-up task for a production build.
- **Validation isn't the same as correctness.** `pyxform` confirms the XLSForm is structurally valid; it doesn't confirm the "at least two pieces of ID" rule or any other constraint matches the agency's actual internal policy.
- **Still needs a side-by-side human review.** I did one myself for this project, but I'd repeat that independently before this ever went into a real deployment.

---

## Repository Structure

```
.
├── README.md
├── index.html
├── script.js
├── styles.css
├── submitted.html
├── assets/
└── pug/
    ├── submitted.pug
    └── template.pug
```

## Video

Video walkthrough: **https://drive.google.com/file/d/1TGOG19DHTaeTpuuyKsBHUQu2FT45zvNI/view?usp=sharing**

## Snapshots

<img width="1366" height="720" alt="Screenshot 2026-07-30 141332" src="https://github.com/user-attachments/assets/77a937c6-dd69-43d5-ac13-7c1c157e974b" />
<img width="1366" height="720" alt="Screenshot 2026-07-30 141424" src="https://github.com/user-attachments/assets/fdb4a151-0e93-409e-9fed-d15d1dd76459" />
<img width="1366" height="720" alt="Screenshot 2026-07-30 141446" src="https://github.com/user-attachments/assets/c7d52eb7-ffce-411d-90bc-c3ed51a16e68" />
<img width="1366" height="720" alt="Screenshot 2026-07-30 141501" src="https://github.com/user-attachments/assets/60c7d88a-cd66-4fac-981e-7b5b161362cf" />



