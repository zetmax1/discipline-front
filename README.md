# Discipline Tracker

## Project Overview

A productivity and discipline tracking application built with modern web technologies.

## How to Use This Application

There are several ways to work with this application.

**Development Mode**

Clone this repository and run it locally for development.

Changes made locally will be reflected when you run the development server.

**Local Development Setup**

To work with this project locally:

1. Ensure you have Node.js installed (version 16 or higher)
2. Install dependencies with npm or yarn

Follow these steps:

```sh
# Step 1: Clone the repository
git clone <repository-url>

# Step 2: Navigate to the project directory
cd discipline-tracker

# Step 3: Install dependencies
npm install

# Step 4: Start the development server
npm run dev
```

**Direct File Editing**

You can edit files directly through the GitHub interface or use GitHub Codespaces for a full development environment in the browser.

## Checks

`npm run check` runs tsc, eslint, vitest (including the contract tests), the Playwright
E2E specs in `e2e/` (`npm run e2e`; once per machine: `npm run e2e:install`), the
production build, `npm audit --omit=dev` against `audit-allowlist.json` (`audit:check`) and
gitleaks over the full history (`secrets`, needs Docker).

## Technology Stack

This project is built with modern web technologies:

- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript
- **React** - Component-based UI library
- **shadcn/ui** - Reusable component library
- **Tailwind CSS** - Utility-first CSS framework

## Deployment

This application can be deployed to any static hosting service that supports modern JavaScript applications, such as:

- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

Simply build the project with `npm run build` and deploy the contents of the `dist` folder.
