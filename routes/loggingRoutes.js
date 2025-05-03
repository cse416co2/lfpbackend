import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { getScenarioLogs } from "../controllers/loggingController.js";

const router = express.Router();

router.get("/:scenarioId", isAuthenticated, getScenarioLogs);

export default router;
