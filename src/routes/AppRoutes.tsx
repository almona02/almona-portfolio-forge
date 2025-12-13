import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/Index";
import AboutPage from "../pages/About";
import ContactPage from "../pages/Contact";
import TrainingServicesPage from "./TrainingServicesPage";
import { MaalemDashboard } from "@/components/pilot/MaalemDashboard";
import { CivilizationGallery } from "@/components/gallery/CivilizationGallery";
import { TuningWorkbench } from "@/components/tuning/TuningWorkbench";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/services/training" element={<TrainingServicesPage />} />
      <Route path="/pilot" element={<MaalemDashboard />} />
      <Route path="/gallery" element={<CivilizationGallery />} />
      <Route path="/tuning" element={<TuningWorkbench />} />
    </Routes>
  );
}

export default AppRoutes;