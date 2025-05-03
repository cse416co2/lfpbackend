import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { runMonteCarloSimulation, getSimulationResults } from "../controllers/simulationController.js";

const router = express.Router();

router.post("/run", isAuthenticated, runMonteCarloSimulation);
router.get("/results/:id", isAuthenticated, getSimulationResults);

export default router;