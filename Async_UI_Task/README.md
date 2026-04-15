# HackerNews Reader

A React + TypeScript app that fetches from the HackerNews API and demonstrates async UI patterns — loading skeletons, error handling, empty states, search with race condition prevention, and a side-by-side comparison of raw fetch vs React Query caching.

## Features

- Top stories feed from the HackerNews Firebase API
- Server-side search via the Algolia HN API
- **Raw Fetch vs React Query toggle** — switch between modes to observe the caching difference
- AbortController + 300ms debounce to prevent stale/racing requests
- Loading skeletons, error state with retry, empty state
- Detail page at `/item/:id` with instant load from React Query cache
- Responsive layout (mobile, tablet, desktop)

## Stack

| Tool         | Version |
| ------------ | ------- |
| Vite         | ^8.x    |
| React        | ^19.x   |
| TypeScript   | ~6.x    |
| Tailwind CSS | ^4.x    |
| React Router | ^7.x    |
| React Query  | ^5.x    |
| Vitest + RTL | ^4.x    |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Scripts

```bash
pnpm dev           # start dev server
pnpm build         # type-check + production build
pnpm lint          # ESLint
pnpm test          # run tests in watch mode
pnpm test --run    # run tests once
pnpm test:coverage # coverage report
```

## Project Structure

```
src/
├── api/          # HackerNews Firebase + Algolia fetch functions
├── components/   # Reusable UI components
├── hooks/        # useDebounce, useStories, useStory
├── pages/        # HomePage, ItemPage
├── test/         # Vitest + React Testing Library tests
└── types/        # TypeScript interfaces
```

## API

- **Top stories** — `https://hacker-news.firebaseio.com/v0`
- **Search** — `https://hn.algolia.com/api/v1`
