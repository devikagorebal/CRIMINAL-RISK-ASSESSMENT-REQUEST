# Criminal Risk Assessment Request — ODK XLSForm + Static Web Form

## Project Overview

For this project, I took the **Manitoba Families "Criminal Risk Assessment Request"** paper form (a real, in-production government form used by the Criminal Risk Assessment Unit under Child Protection Branch) and digitized it in two stages:

1. Built a fully working **ODK XLSForm** from scratch, following the official [ODK XLSForm specification](https://docs.getodk.org/xlsform/), so this form could be deployed on ODK Collect / KoboToolbox for field data collection.
2. Used an AI reasoning model (I chose **Claude, by Anthropic** — details on why below) to generate a matching **web version of the same form**, using both the original PDF and my finished XLSForm as inputs.

I originally built the web version as a Pug + Express app, but decided to simplify it down to a **plain static HTML/CSS/JS site** — no Node, no server, no build step. Anyone can just double-click `index.html` and it works. That change is part of the prompt history below.

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

```bash
python3 -m pyxform.xls2xform Criminal_Risk_Assessment_Request.xlsx Criminal_Risk_Assessment_Request_compiled.xml
Conversion complete!
```

You can also just drag the `.xlsx` straight into **https://getodk.org/xlsform/** to see it convert live.

---

## Part 2: The Static Web Form

**Files:** `index.html`, `styles.css`, `script.js`, `submitted.html`

This is a plain, dependency-free implementation of the same form:

- `index.html` — the form markup, keeping the same two-page layout, section order, and field names as the XLSForm (`first_name`, `sex`, `id_type_provided`, `reason_for_assessment`, etc.), so a real backend could bind to the same schema either way
- `styles.css` — a Manitoba-government-style visual theme (green accent, bordered sections, note callouts, highlighted "two pieces of ID" warning)
- `script.js` — handles form submission entirely client-side: it serializes the form into a plain object, saves it to `localStorage`, auto-syncs the page-2 "name of person being assessed" field from the first/last name fields as you type, and redirects to the confirmation page
- `submitted.html` — reads the saved submission back out of `localStorage` and renders it as a readable summary

**Why static instead of Pug/Express:** the original Pug version needed Node.js, `npm install`, and a running server just to test — which is friction for something that's meant to be a quick reviewable deliverable. Converting it to plain HTML/CSS/JS with `localStorage` means anyone (including a non-technical reviewer) can just open `index.html` in any browser with zero setup, and still see a fully working submit → confirm flow.

### Running it

No install, no server. Just open [index.html](index.html) in a browser.

---

## Prompt History

Below is the actual sequence of prompts I used to get from "here's a PDF" to a validated XLSForm and a working static web form. I’ve cleaned up the sequence so it reflects the workflow more clearly.

**Prompt 1 (initial ask, with the PDF and a reference XLSForm attached):**
> "Develop ODK xls form for the attached PDF"

I attached the Manitoba Criminal Risk Assessment Request PDF plus an existing XLSForm example (`BBCI.xlsx`, an unrelated health-screening form I'd used before) purely so the AI would match the column conventions I wanted (`type, name, label, required, required_message, appearance, hint, relevant, default, constraint, constraint_message, calculation, repeat_count, read_only`), rather than inventing its own structure.

**Prompt 2:**
> "Use the XLS file and the PDF as inputs to generate Pug Template using any AI Model, underlying LLM of your choice but that supports reasoning"

This is where I asked for the second half of the deliverable — using both the finished XLSForm and the original PDF together to produce a web version, and to justify the model choice. The first pass at this was a Pug template.

**Prompt 3 (after testing the static-rendered Pug output and hitting a submit error):**
> "its showing like this" *(screenshot of `ERR_FILE_NOT_FOUND` when clicking Submit on the plain rendered HTML file)*

This surfaced a real gap — a static render of a Pug template has nowhere to submit *to* without a server behind it. The initial fix was to move toward a browser-based submission flow.

**Prompt 4 (useful follow-up after the submit issue):**
> "Convert the form to a fully static HTML/CSS/JS version with no Node.js or server dependency, while preserving the same form flow and a confirmation page"

That prompt led to the final implementation: a dependency-free web form that works by opening the file directly in a browser, stores the submission in `localStorage`, and shows the confirmation summary on the next page.

**Prompt 5:**
> "Create a README file for this project and include the prompt history"

This document.

---

## Why I Chose Claude as the Reasoning Model

I needed a model that could do more than OCR a PDF and copy rows into a spreadsheet. Specifically:

- **Cross-referencing two different document types at once** — a scanned/graphical PDF layout and a structured spreadsheet — and reconciling them into one consistent schema.
- **Making modeling judgment calls that aren't spelled out anywhere in the source** — e.g., recognizing that the "Unconsented" checkbox should gate the signature/witness fields, that "Other" and "MB Driver's Licence" are conditional reveal fields, and that the page 2 name field should derive from page 1 rather than be re-typed.
- **Self-validating its own output** — actually running the generated XLSForm through `pyxform`, and later confirming the static HTML/JS actually works by testing the submit → localStorage → confirmation flow, rather than just producing something that "looks right."
- **Adapting when the first approach wasn't the right fit** — when the Pug/Express version turned out to be more setup than the project needed, the same reasoning process was used to simplify it down to a static site without losing any of the form's structure or field logic.

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
├── index.html                                   # form markup
├── styles.css                                    # visual styling
├── script.js                                     # client-side submit + confirmation logic
├── submitted.html                                # confirmation page
├── docs/
│   └── Criminal_Risk_Assessment_Request.pdf      # source PDF
└── xlsform/
    ├── Criminal_Risk_Assessment_Request.xlsx            # the XLSForm
    └── Criminal_Risk_Assessment_Request_compiled.xml     # pyxform output (proof of validity)
```

## Running It Locally

No install, no server needed. Just open `index.html` in a browser.

To view the XLSForm without running anything, drag `xlsform/Criminal_Risk_Assessment_Request.xlsx` into **https://getodk.org/xlsform/**.

## Video

Video walkthrough (LLM choice, pros/cons, XLSForm + static web form demo): **[ADD LINK HERE]**
