# Almona Portfolio Forge

This is the repository for the Almona Portfolio Forge project, a modern, interactive portfolio website for Almona, a company specializing in industrial machinery. It's built with a React frontend (using Vite and TypeScript) and a Python backend (using FastAPI).

## Features

*   **Interactive Product Showcase:** Browse and view industrial machinery with detailed specifications.
*   **3D Model Viewer:** Interact with 3D models of the machines.
*   **AR Integration:** Visualize machines in your own space using Augmented Reality.
*   **Quoting System:** Request quotes for products.
*   **Customer Portal:** Access order history and other account information.
*   **Internationalization:** Support for multiple languages.
*   **Responsive Design:** Works on all devices.

## Technologies Used

*   **Frontend:**
    *   React
    *   Vite
    *   TypeScript
    *   Tailwind CSS
    *   Shadcn UI
    *   Three.js & @react-three/fiber
    *   React Router
    *   i18next
*   **Backend:**
    *   Python
    *   FastAPI
    *   Supabase (for auth and database)
*   **Testing:**
    *   Vitest
    *   Pytest
    *   Playwright
    *   Storybook
*   **DevOps:**
    *   Docker
    *   Vercel

## Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   npm or bun
*   Python (v3.9 or higher)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/almona-portfolio-forge.git
    cd almona-portfolio-forge
    ```

2.  **Install frontend dependencies:**
    ```bash
    npm install
    ```

3.  **Install backend dependencies:**
    ```bash
    cd python_backend
    pip install -r requirements.txt
    ```

4.  **Set up environment variables:**
    *   Create a `.env` file in the root directory by copying `.env.example`.
    *   Create a `.env` file in the `python_backend` directory by copying `python_backend/.env.example`.
    *   Fill in the required environment variables, such as your Supabase credentials.

### Running the Application

1.  **Start the frontend development server:**
    ```bash
    npm run dev
    ```

2.  **Start the backend server:**
    ```bash
    cd python_backend
    uvicorn apis.main:app --reload
    ```

## Available Scripts

*   `npm run dev`: Starts the Vite development server.
*   `npm run build`: Builds the application for production.
*   `npm run lint`: Lints the codebase.
*   `npm run preview`: Previews the production build.
*   `npm run test`: Runs all tests.
*   `npm run test:watch`: Runs tests in watch mode.
*   `npm run test:api`: Runs backend API tests.
*   `npm run test:react`: Runs React component tests.
*   `npm run test:security`: Runs backend security tests.
*   `npm run test:performance`: Runs backend performance tests.
*   `npm run storybook`: Starts Storybook.
*   `npm run build-storybook`: Builds Storybook for deployment.

## Project Structure

```tree
C:\projects\almona-portfolio-forge\
├───.github/
├───.kilocode/
├───.storybook/
├───.tabby/
├───.vscode/
├───docs/
├───locales/
├───public/
├───publicimagesmachines/
├───publicimagesprofiles/
├───python_backend/
├───src/
├───srcassetsimages/
├───tabby_x86_64-windows-msvc/
├───.blackboxrules
├───.env
├───.env.example
├───.gitignore
├───.vercelignore
├───bun.lockb
├───CODE_PRINCIPLES_EVALUATION.md
├───components.json
├───DEVELOPMENT_GUIDE.md
├───eslint.config.js
├───index.html
├───MCP_SETUP.md
├───package-lock.json
├───package.json
├───postcss.config.js
├───README.md
├───tailwind.config.ts
├───tsconfig.app.json
├───tsconfig.json
├───tsconfig.node.json
├───vite.config.ts
├───vitest.config.ts
└───vitest.shims.d.ts
```

## Deployment

This project is configured for deployment on Vercel. The `vercel.json` file contains the necessary configuration. To deploy, simply connect your Vercel account to your Git repository.

## Contributing

Contributions are welcome! Please follow the existing code style and conventions. Make sure to run the linter and tests before submitting a pull request.
