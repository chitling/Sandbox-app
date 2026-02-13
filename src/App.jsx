//import { useState } from "react";
import { Routes, Route } from "react-router";
import { HomePage } from "./pages/HomePage";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
    </Routes>
  );
}

export default App;
