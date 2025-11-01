# Bloom-aligned Question Authoring Guide

This guide shows how to write quiz questions that the game can render and that correctly feed the Bloom taxonomy graphs. It covers supported question types, the per-intensity structure, and the required/optional fields in each JSON entry.

## Where to put questions

- Path: `docs/public/data/quizzes/<course>.json` (e.g., `python.json`, `java.json`)
- Structure: Top-level intensities, each with arrays by question type
  - `intensity1`: basics/fundamentals
  - `intensity2`: intermediate application and syntax workouts
  - `intensity3`: higher-order composition and sequencing challenges

You can mix types inside an intensity (the loader normalizes shape), but for clarity prefer separate arrays: `multipleChoice`, `syntaxBlock`, `codeArrangement`.

## Bloom taxonomy tagging

Always set `bloomTarget` on every question to ensure accurate graphing. Accepted values (lowercase):

- `remembering` — recall facts/definitions, direct syntax/keyword recall
- `understanding` — explain/interpret, identify outputs for simple code
- `applying` — use knowledge to solve a concrete task; small code tracing
- `analyzing` — trace multi-branch logic, find bugs, compare code snippets
- `evaluating` — choose best approach/complexity, reason about trade-offs
- `creating` — assemble or design a solution; multi-step/code construction

If `bloomTarget` is omitted, the game will heuristically infer a level based on type and content, but explicit tagging is strongly recommended.

## Supported types and JSON schemas

Fields marked (required) must be present. Optional fields are recognized when present.

### 1) Multiple choice

- Fields:
  - `question` (required, string)
  - `options` (required, array<string>, length ≥ 2)
  - `correctIndex` (required, integer, 0-based index into `options`)
  - `bloomTarget` (required, string: one of the six above)
  - `sourceType` (optional, string: "multipleChoice"; not needed, default)
  - `id` (optional, stable identifier; if omitted, a hash of the content is used)

Example (intensity1 → remembering):

{
  "question": "Which function prints output in Python?",
  "options": ["echo()", "print()", "show()", "display()"],
  "correctIndex": 1,
  "bloomTarget": "remembering"
}

Example (intensity2 → understanding):

{
  "question": "What is the output of: print(10 // 3)?",
  "options": ["3", "3.33", "4", "Error"],
  "correctIndex": 0,
  "bloomTarget": "understanding"
}

### 2) Syntax block pick-one

Learner selects the one correct snippet among distractors.

- Fields:
  - `type` or `sourceType` (required, string: "syntaxBlock")
  - `question` (required, string)
  - `instruction` (required, string, short prompt)
  - `blocks` (required, array<{ code: string, correct: boolean }>)
  - `bloomTarget` (required, string)
  - `id` (optional)

Example (intensity2 → applying):

{
  "type": "syntaxBlock",
  "question": "Select the Correct Syntax",
  "instruction": "Choose the valid for loop printing numbers 0–4",
  "blocks": [
    { "code": "for i in range(5):\n    print(i)", "correct": true },
    { "code": "for (i = 0; i < 5; i++)\n    print(i)", "correct": false },
    { "code": "loop i in 0..5 { print(i) }", "correct": false }
  ],
  "bloomTarget": "applying"
}

Tagging tip:
- Simple syntax recognition → remembering/understanding.
- Using syntax to achieve a task → applying.
- Spotting subtle semantic errors across similar snippets → analyzing.

### 3) Code arrangement (drag-and-drop sequencing)

Learner orders blocks into a correct program. Used predominantly in intensity3.

- Fields:
  - `sourceType` (optional, string: "codeArrangement"; recommended for clarity)
  - `title` (required, string)
  - `description` (required, string)
  - `blocks` (required, array<string>) — unsorted fragments as shown to the learner
  - `correctOrder` (required, array<number>) — 0-based indices referencing `blocks` in the correct sequence
  - `bloomTarget` (required, string)
  - `id` (optional)

Example (intensity3 → creating):

{
  "sourceType": "codeArrangement",
  "title": "Arrange the Python code blocks in correct order:",
  "description": "Create a simple greeting program with user input",
  "blocks": [
    "name = input(\"Enter your name: \")",
    "greeting = \"Hello, \" + name",
    "print(greeting)"
  ],
  "correctOrder": [0, 1, 2],
  "bloomTarget": "creating"
}

Tagging tip:
- Short 2–3 step sequences → applying.
- Multi-step with conditionals/loops/IO coordination → analyzing/creating.

## Recommended intensity mapping by type

- Intensity 1: mostly `multipleChoice` tagged `remembering` or `understanding`.
- Intensity 2: mix of `multipleChoice` and `syntaxBlock` tagged `understanding`/`applying`, with occasional `analyzing` items.
- Intensity 3: primarily `codeArrangement` tagged `analyzing`/`creating` (some `evaluating` if comparing alternatives fits your design).

## Authoring checklist

- Include `bloomTarget` on every question.
- Verify `correctIndex` is 0-based and within bounds of `options`.
- For `syntaxBlock`, exactly one block should have `correct: true`.
- For `codeArrangement`, `correctOrder` must index the `blocks` array (0-based) and cover all steps.
- Prefer `sourceType` to be explicit when not using `multipleChoice`.
- Keep prompts concise; longer code belongs in the `blocks`/`description` rather than the `question` field.

## Testing your additions

1) Add questions to `docs/public/data/quizzes/<course>.json` under the desired intensity.
2) Run the dev server and play a short session for that course.
3) Confirm: questions render correctly, answers are recognized, and Bloom counts increment in the graphs after a few items.

Note: If you omit `bloomTarget`, the engine infers levels based on type and heuristics, but results may not match your intent.

---

Questions or unsure about tagging? Start with your learning objective, then match the closest Bloom level from the definitions above. When in doubt between two levels, pick the lower one for reliability and iterate based on playtesting.