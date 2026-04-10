import { BrowserRouter, Routes, Route } from "react-router";
import HomePage from "./pages/HomePage";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
