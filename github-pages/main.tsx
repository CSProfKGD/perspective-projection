import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "katex/dist/katex.min.css";
import "../app/globals.css";
import { ProjectionLab } from "../app/projection-lab";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Perspective Projection root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ProjectionLab />
  </StrictMode>,
);
