import express from "express";
import multer from "multer";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  exportScenario,
  importScenario,
  shareScenario,
} from "../controllers/sharingController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/share/:id", isAuthenticated, shareScenario);
router.get("/export/:scenarioId", isAuthenticated, exportScenario);
router.post("/import", isAuthenticated, upload.single("file"), importScenario);

export default router;
