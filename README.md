# HawkVision

## Prerequisites

Ensure you have the following installed before setting up the project:

- **Node.js** : v20.11.1
- **npm** : v10.2.4

## Dependencies

The project relies on several dependencies and dev dependencies, including:

### Main Dependencies:

- React (v19.0.0)
- React Router DOM (v7.3.0)
- Tailwind CSS (v4.0.14)
- Axios (v1.8.4)
- Lucide React (v0.483.0)
- Radix UI components (various)

### Dev Dependencies:

- TypeScript (v5.7.2)
- ESLint (v9.21.0)
- Prettier (v3.5.3)
- Vite (v6.2.0)
- TailwindCSS plugins

For the full list of dependencies, refer to `package.json`.

## Installation & Setup

Follow these steps to set up the project:

1. **Clone the Repository**
   ```sh
   git clone <repository-url>
   cd hawkeye-dashboard
   ```
2. **Install Dependencies**
   ```sh
   npm install
   ```
3. **Environment Configuration**
   If required, create a `.env` file in the root directory and add necessary configuration variables. Example:
   ```sh
   VITE_API_BASE_URL=http://localhost:3000/api
   ```

## Running the Project

To start the project in development mode:

```sh
npm run dev
```

To build the project for production:

```sh
npm run build
```

To preview the production build:

```sh
npm run preview
```

To lint the project:

```sh
npm run lint
```

## Additional Notes

- The project uses **Vite** as the build tool.
- Tailwind CSS is configured via `tailwind.config.js`.
- ESLint and Prettier ensure code quality and formatting.

For further contributions and improvements, feel free to submit a pull request!!!
