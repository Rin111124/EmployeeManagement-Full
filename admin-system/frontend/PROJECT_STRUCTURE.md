Project structure (feature-based) overview

src/
- assets/          # static images, fonts, icons
- components/      # shared UI components (ui/)
- features/        # feature folders (each with components, hooks, services, store, types)
- hooks/           # shared custom hooks
- layouts/         # layout components (MainLayout, AuthLayout)
- lib/             # 3rd-party config (queryClient, axios instances)
- pages/           # top-level page components matching routes
- routes/          # centralized route mapping
- services/        # shared API call helpers
- store/           # global store (Zustand or Redux)
- types/           # shared TypeScript types
- utils/           # helper functions

Use this as a template to add real feature folders under `features/`.
