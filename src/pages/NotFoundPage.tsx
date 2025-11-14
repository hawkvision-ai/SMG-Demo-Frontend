import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="text-5xl font-bold text-gray-800">404</h1>
      <p className="mt-2 text-lg text-gray-600">Oops! The page you're looking for doesn't exist.</p>
      <Link
        to="/home"
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-gray-50 hover:bg-blue-700"
      >
        Go Home
      </Link>
    </div>
  );
}
