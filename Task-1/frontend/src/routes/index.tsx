import { createBrowserRouter } from 'react-router-dom';
import App from '../App';

// Placeholder routes - will be updated with actual routes
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <div className="p-8"><h1 className="text-3xl font-bold">Welcome to the App</h1></div>,
      },
    ],
  },
]);
