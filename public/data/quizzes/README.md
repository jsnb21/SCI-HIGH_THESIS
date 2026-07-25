# Quizzes Data

This folder contains per-course quiz content used by the game. Files follow the structure:

{
  "intensity1": { "multipleChoice": [...], "syntaxBlock": [...], "codeArrangement": [...] },
  "intensity2": { ... },
  "intensity3": { ... }
}

Important:
- Prefer adding `bloomTarget` to every question entry (remembering/understanding/applying/analyzing/evaluating/creating).
- Multiple choice: `question`, `options`, `correctIndex` (0-based), `bloomTarget`.
- Syntax block: `type: "syntaxBlock"`, `question`, `instruction`, `blocks[{ code, correct }]`, `bloomTarget`.
- Code arrangement: `sourceType: "codeArrangement"`, `title`, `description`, `blocks[string[]]`, `correctOrder[number[]]`, `bloomTarget`.

See the detailed authoring guide:
- `../../documentation/BloomQuestionAuthoring.md`

After editing, run the game and verify items render correctly and Bloom graphs update as expected.
