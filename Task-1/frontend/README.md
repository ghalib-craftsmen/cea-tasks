# CraftMeal

CraftMeal is a meal management application built with React, TypeScript, Vite, and TailwindCSS. It provides a comprehensive solution for managing meals, tracking headcount, and handling user participation.

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS v4** - Styling
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Zustand** - Global state management
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **React Hot Toast** - Notifications

## Project Structure

```
src/
├── features/       # Feature-based modules
│   ├── auth/       # Authentication feature
│   ├── meals/      # Meal management feature
│   ├── admin/      # Admin dashboard feature
│   └── headcount/  # Headcount tracking feature
├── components/     # Reusable UI components
│   └── ui/         # UI component library
├── hooks/          # Custom React hooks
├── lib/            # Third-party library configurations
├── routes/         # Route definitions
├── store/          # Zustand state stores
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in project root:

```env
VITE_API_URL=http://localhost:8000
```

### Development

```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Build

```bash
# Build for production
npm run build
```

### Preview Production Build

```bash
# Preview production build
npm run preview
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Features

- User authentication (login/logout)
- Meal management and scheduling
- Headcount tracking
- User participation management
- Admin dashboard
- Real-time updates with TanStack Query
- Lazy loading for optimal performance
- Full accessibility support (WCAG compliant)

## Architecture

### Feature-Based Architecture

The project follows a feature-based architecture where each feature is self-contained with its own components, hooks, and types. This approach provides:

- Better code organization
- Easier maintenance and scalability
- Clear separation of concerns
- Facilitates code splitting and lazy loading

### State Management

- **Server State**: TanStack Query for API data, caching, and background updates
- **Client State**: Zustand for global state (auth, user preferences)
- **Form State**: React Hook Form for form handling with minimal re-renders

### API Client

The Axios instance in [`src/lib/axios.ts`](src/lib/axios.ts) includes:
- Request interceptors for auth token injection
- Response interceptors for error handling
- Automatic 401 handling (redirect to login)

## Production Optimizations

### Lazy Loading & Code Splitting

All page components are lazy-loaded using [`React.lazy`](https://react.dev/reference/react/lazy) and wrapped in [`Suspense`](https://react.dev/reference/react/Suspense) for optimal performance:

```typescript
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })));
```

Benefits:
- Reduced initial bundle size
- Faster initial page load
- On-demand loading of routes
- Better caching strategy

### TailwindCSS Optimization

The TailwindCSS configuration in [`tailwind.config.js`](tailwind.config.js) includes:
- Content scanning for automatic class purging
- Safelist for dynamic class names
- Production-ready optimization

### Build Optimization

The Vite configuration in [`vite.config.ts`](vite.config.ts) includes:
- Manual chunk splitting for vendor libraries
- CSS code splitting
- Terser minification
- Optimized chunk size warnings

Vendor chunks are split into:
- `react-vendor`: React and React DOM
- `router-vendor`: React Router
- `query-vendor`: TanStack Query
- `ui-vendor`: UI libraries

## Accessibility

The application is built with accessibility in mind and follows WCAG 2.1 guidelines:

### ARIA Attributes
- Proper ARIA labels on all interactive elements
- Role attributes where appropriate
- Live regions for dynamic content
- Error announcements for form validation

### Keyboard Navigation
- Full keyboard support for all interactive elements
- Focus management in modals
- Tab order optimization
- Skip links for screen readers

### Semantic HTML
- Proper heading hierarchy
- Semantic elements (nav, main, aside, etc.)
- Form labels properly associated with inputs
- Alt text for images

### Focus Management
- Visible focus indicators
- Focus trap in modals
- Focus restoration after modal close
- Skip to main content link

Example of accessible component:
```typescript
<button
  onClick={handleClick}
  aria-label="Close modal"
  aria-expanded={isOpen}
  className="focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  Close
</button>
```

## Performance Best Practices

1. **Lazy Loading**: All routes are lazy-loaded to reduce initial bundle size
2. **Code Splitting**: Vendor libraries are split into separate chunks
3. **Image Optimization**: Use appropriate image formats and sizes
4. **Memoization**: Use React.memo for expensive components
5. **Debouncing**: Implement debouncing for search and input fields
6. **Virtual Scrolling**: Consider for long lists
7. **Service Workers**: Implement for offline support (future)

## Deployment

### Build for Production

```bash
npm run build
```

The optimized build will be in the `dist` directory.

### Environment-Specific Builds

Ensure environment variables are set before building:

```bash
# Production
VITE_API_URL=https://api.example.com npm run build

# Staging
VITE_API_URL=https://staging-api.example.com npm run build
```

### Deployment Options

The application can be deployed to various platforms:
- **Vercel**: Automatic deployments from Git
- **Netlify**: Simple drag-and-drop or Git integration
- **AWS S3 + CloudFront**: Static hosting with CDN
- **Docker**: Containerized deployment
- **Traditional hosting**: Any static file hosting service

## Troubleshooting

### Common Issues

**Build fails with type errors**
```bash
# Run TypeScript compiler to see detailed errors
npx tsc --noEmit
```

**Tailwind classes not working**
```bash
# Rebuild Tailwind CSS
npm run build
```

**Lazy loading not working**
- Ensure all imports use dynamic `import()` syntax
- Check that `Suspense` wraps all lazy components
- Verify that the Loading component is properly exported

## Contributing

When contributing to this project:

1. Follow the existing code style and patterns
2. Ensure accessibility standards are met
3. Update documentation as needed
4. Use meaningful commit messages

## License

[Add your license information here]

---

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
