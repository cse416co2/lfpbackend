import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  addEvent,
  deleteEvent,
  getEventById,
  getEventsByScenarioId,
  updateEvent,
} from "../controllers/eventController.js";

const router = express.Router();

router.post("/", isAuthenticated, addEvent);
router.get("/scenario/:scenarioId", isAuthenticated, getEventsByScenarioId);
router.get("/:id", isAuthenticated, getEventById);
router.put("/:id", isAuthenticated, updateEvent);
router.delete("/:id", isAuthenticated, deleteEvent);

export default router;
