import { Scenario } from "../models/scenarioModel.js";
import fs from "fs";
import path from "path";

export const getScenarioLogs = async (req, res) => {
  try {
    const { scenarioId } = req.params;

    const scenario = await Scenario.findOne({
      _id: scenarioId,
      user: req.userId,
    });
    if (!scenario)
      return res.status(404).json({ message: "Scenario not found" });

    const logFilePath = path.join("logs", `scenario_${scenarioId}.log`);

    if (!fs.existsSync(logFilePath)) {
      return res
        .status(404)
        .json({ message: "No logs found for this scenario" });
    }

    const logs = fs.readFileSync(logFilePath, "utf8");
    res.status(200).json({ scenarioId, logs });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching logs", error: error.message });
  }
};

export const logScenarioActivity = (scenarioId, message) => {
  const logDir = path.join("logs");
  const logFilePath = path.join(logDir, `scenario_${scenarioId}.log`);
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  fs.appendFileSync(logFilePath, logMessage, "utf8");
};
