import express from "express";
import multer from "multer";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  getAllStateNames,
  getFederalTaxes,
  getStateTaxes,
  uploadTaxData,
} from "../controllers/taxController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.get("/federal", isAuthenticated, getFederalTaxes);
router.get("/state/:state", isAuthenticated, getStateTaxes);
router.post("/upload", isAuthenticated, upload.single("file"), uploadTaxData);
router.get("/states", isAuthenticated, getAllStateNames);

export default router;
