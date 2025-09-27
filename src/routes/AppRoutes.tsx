import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/Index";
import AboutPage from "../pages/About";
import ContactPage from "../pages/Contact";
import TrainingServicesPage from "./TrainingServicesPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/services/training" element={<TrainingServicesPage />} />
    </Routes>
  );
}

export default AppRoutes;