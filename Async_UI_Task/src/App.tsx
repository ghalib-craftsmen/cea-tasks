import { BrowserRouter, Routes, Route } from "react-router";
import HomePage from "./pages/HomePage";
import ItemPage from "./pages/ItemPage";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/item/:id" element={<ItemPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
