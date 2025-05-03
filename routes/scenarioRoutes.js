import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  createScenario,
  deleteScenario,
  getScenarioById,
  getScenarios,
  updateScenario,
} from "../controllers/scenarioController.js";

const router = express.Router();

router.post("/", isAuthenticated, createScenario);
router.get("/", isAuthenticated, getScenarios);
router.get("/:id", isAuthenticated, getScenarioById);
router.put("/:id", isAuthenticated, updateScenario);
router.delete("/:id", isAuthenticated, deleteScenario);

export default router;
