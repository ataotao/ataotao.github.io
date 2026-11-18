# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-19
**Commit:** 650c910
**Branch:** master

## OVERVIEW

React vocabulary flashcard app (沪教版). Vite + React 18 + TypeScript + Redux Toolkit + Tailwind CSS. SPA with flashcard mode, EN↔CN toggle, progress tracking, localStorage + IndexedDB persistence.

## STRUCTURE

```
word_table/vocab-app/
├── src/
│   ├── components/           # 14 decomposed UI components
│   ├── data/
│   │   ├── index.ts         # Source exports (沪教版, 中考, 阅读材料)
│   │   ├── 沪教版/          # Textbook vocabulary (七下, 八上, 八下, 九上)
│   │   ├── 中考/            # 中考高频词汇 + 高频词组 (from PDF, no phonetics)
│   │   └── 阅读材料/        # Reading materials
│   ├── store/               # Redux Toolkit slices
│   │   ├── appSlice.ts      # Navigation + UI state
│   │   └── dataSlice.ts     # Persistent data (synced to localStorage)
│   ├── types/index.ts       # TypeScript interfaces
│   ├── utils/               # Helper functions
│   ├── App.tsx              # Main component (460 lines)
│   ├── db.ts                # IndexedDB wrapper
│   └── main.tsx             # Entry point
├── dist/                    # Build output
├── SPEC.md                  # Design spec (Chinese)
└── package.json
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add vocabulary | `src/data/沪教版/`, `src/data/中考/` or `src/data/阅读材料/` | Add to unit arrays; register category in `src/data/index.ts` |
| UI components | `src/components/` | 14 components, barrel exported |
| State management | `src/store/` | Redux slices with localStorage sync |
| Type definitions | `src/types/index.ts` | Word, Unit, Category, Source, Record |
| Build project | `npm run build` | Outputs to dist/ |

## CONVENTIONS

- **React**: Functional components, hooks
- **State**: Redux Toolkit (`appSlice` for UI, `dataSlice` for persistence)
- **Styling**: Tailwind CSS classes, dark theme (custom palette in tailwind.config.js)
- **Persistence**: localStorage for records, IndexedDB for export/import
- **TypeScript**: Strict mode, interfaces in `src/types/index.ts`

## ANTI-PATTERNS (THIS PROJECT)

- ❌ No tests — no testing framework installed
- ❌ No routing — single page application only
- ❌ Empty `src/hooks/` — custom hooks not used (Redux instead)

## COMMANDS

```bash
cd word_table/vocab-app

# Install deps
npm install

# Development
npm run dev

# Build
npm run build

# Preview
npm run preview
```

## NOTES

- **Data structure**: sources → categories → units → words
- **Redux**: `appSlice` (navigation, modals, forms) + `dataSlice` (records, customWords)
- **Storage keys**: `wrongQuestionsProgress`, `grammarExerciseProgress` in localStorage
- **No backend** — fully client-side
