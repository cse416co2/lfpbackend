import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  addInvestment,
  deleteInvestment,
  getInvestmentById,
  getInvestmentsByScenarioId,
  updateInvestment,
} from "../controllers/investmentController.js";

const router = express.Router();

router.post("/", isAuthenticated, addInvestment);
router.get(
  "/scenario/:scenarioId",
  isAuthenticated,
  getInvestmentsByScenarioId
);
router.get("/:id", isAuthenticated, getInvestmentById);
router.put("/:id", isAuthenticated, updateInvestment);
router.delete("/:id", isAuthenticated, deleteInvestment);

export default router;
