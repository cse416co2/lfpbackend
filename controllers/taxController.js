import { Tax } from "../models/taxModel.js";
import fs from "fs";
import yaml from "js-yaml";
import { logScenarioActivity } from "../controllers/loggingController.js";

export const getFederalTaxes = async (req, res) => {
  try {
    const taxData = await Tax.findOne();
    if (!taxData)
      return res.status(404).json({ message: "Federal tax data not found" });

    logScenarioActivity("GLOBAL", "Fetched federal tax brackets.");

    res.status(200).json(taxData.federalTaxBrackets);
  } catch (error) {
    logScenarioActivity(
      "GLOBAL",
      `Error fetching federal tax data: ${error.message}`
    );
    res.status(500).json({
      message: "Error fetching federal tax data",
      error: error.message,
    });
  }
};

export const getStateTaxes = async (req, res) => {
  try {
    const { state } = req.params;

    console.log("Fetching tax data for state:", state);

    const taxData = await Tax.findOne({ "stateTaxes.state": state });

    console.log("Tax data found:", taxData);

    if (!taxData || !taxData.stateTaxes) {
      return res
        .status(404)
        .json({ message: `No tax data found for ${state}` });
    }

    let stateTaxes;

    if (Array.isArray(taxData.stateTaxes)) {
      stateTaxes = taxData.stateTaxes.find((s) => s.state === state);
    } else if (taxData.stateTaxes.state === state) {
      stateTaxes = taxData.stateTaxes;
    }

    if (!stateTaxes) {
      return res
        .status(404)
        .json({ message: `No tax data found for ${state}` });
    }

    logScenarioActivity("GLOBAL", `Fetched tax data for state: ${state}`);

    res.status(200).json(stateTaxes);
  } catch (error) {
    console.error("Error fetching state taxes:", error);
    logScenarioActivity(
      "GLOBAL",
      `Error fetching state tax data for ${req.params.state}: ${error.message}`
    );
    res.status(500).json({
      message: "Error fetching state tax data",
      error: error.message,
    });
  }
};

export const uploadTaxData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const yamlData = yaml.load(fs.readFileSync(req.file.path, "utf8"));

    if (!yamlData.stateTaxes || !yamlData.federalTaxBrackets) {
      return res.status(400).json({ message: "Invalid YAML format" });
    }

    const updatedTaxData = await Tax.findOneAndUpdate({}, yamlData, {
      upsert: true,
      new: true,
    });

    logScenarioActivity("GLOBAL", "Tax data uploaded successfully.");

    res.status(200).json({
      message: "Tax data uploaded successfully",
      taxData: updatedTaxData,
    });
  } catch (error) {
    logScenarioActivity("GLOBAL", `Error uploading tax data: ${error.message}`);
    res.status(500).json({
      message: "Error uploading tax data",
      error: error.message,
    });
  }
};

export const getAllStateNames = async (req, res) => {
  try {
    const taxData = await Tax.find({});

    const stateNames = [
      ...new Set(taxData.flatMap((doc) => doc.stateTaxes.map((s) => s.state))),
    ];

    logScenarioActivity("GLOBAL", "Fetched all state names.");

    res.status(200).json(stateNames);
  } catch (error) {
    console.error("Error fetching state names:", error);
    logScenarioActivity(
      "GLOBAL",
      `Error fetching state names: ${error.message}`
    );
    res.status(500).json({
      message: "Error fetching state names",
      error: error.message,
    });
  }
};
