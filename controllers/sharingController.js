import { Scenario } from "../models/scenarioModel.js";
import { User } from "../models/userModel.js";
import { Event } from "../models/eventModel.js";
import { Investment } from "../models/investmentModel.js";
import fs from "fs";
import yaml from "js-yaml";
import { logScenarioActivity } from "./loggingController.js";

export const shareScenario = async (req, res) => {
  try {
    const { scenarioId, userId, accessType } = req.body;

    const scenario = await Scenario.findOne({
      _id: scenarioId,
      user: req.userId,
    });
    if (!scenario)
      return res.status(404).json({ message: "Scenario not found" });

    const userToShareWith = await User.findById(userId);
    if (!userToShareWith)
      return res.status(404).json({ message: "User to share with not found" });

    const isAlreadyShared = scenario.sharedWith.some(
      (share) => share.user.toString() === userId
    );

    if (isAlreadyShared)
      return res
        .status(400)
        .json({ message: "Scenario is already shared with this user" });

    scenario.sharedWith.push({ user: userId, accessType });
    await scenario.save();

    logScenarioActivity(
      scenarioId,
      `Scenario shared with User ID: ${userId}, Access Type: ${accessType}`
    );

    res.status(200).json({ message: "Scenario shared successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error sharing scenario", error: error.message });
  }
};

export const exportScenario = async (req, res) => {
  try {
    const { scenarioId } = req.params;

    console.log({ scenarioId, userId: req.userId });

    const scenario = await Scenario.findOne({
      _id: scenarioId,
      user: req.userId,
    })
      .populate("investmentTypes.investment")
      .populate("events");
    if (!scenario)
      return res.status(404).json({ message: "Scenario not found" });

    const yamlData = yaml.dump(scenario.toObject());
    const filePath = `exports/scenario_${scenarioId}.yaml`;

    if (!fs.existsSync("exports")) {
      fs.mkdirSync("exports");
    }

    fs.writeFileSync(filePath, yamlData, "utf8");

    logScenarioActivity(scenarioId, `Scenario exported as YAML file.`);

    res.status(200).download(filePath, `scenario_${scenarioId}.yaml`, (err) => {
      if (err) {
        res
          .status(500)
          .json({ message: "Error exporting scenario", error: err.message });
      } else {
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error exporting scenario", error: error.message });
  }
};

function stripIds(obj) {
  if (Array.isArray(obj)) return obj.map(stripIds);
  if (obj && typeof obj === "object") {
    const { _id, ...rest } = obj;
    const cleaned = {};
    for (const key in rest) cleaned[key] = stripIds(rest[key]);
    return cleaned;
  }
  return obj;
}

export const importScenario = async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, "utf8");
    const parsedData = yaml.load(fileContent);
    fs.unlinkSync(filePath); // Clean up file

    // Handle case where data might be at root level or under 'scenario'
    const scenarioData = parsedData.scenario || parsedData;
    if (!scenarioData) {
      throw new Error("Invalid YAML format - missing scenario data");
    }

    // Step 1: Process investments first and create mapping
    const investmentMap = new Map();
    if (scenarioData.investmentTypes) {
      await Promise.all(
        scenarioData.investmentTypes.map(async (item) => {
          if (item.investment) {
            const newInv = await Investment.create({
              name: item.investment.name,
              description: item.investment.description,
              expectedReturn: parseFloat(item.investment.expectedReturn),
              expenseRatio: item.investment.expenseRatio,
              dividendYield: item.investment.dividendYield,
              taxability: item.investment.taxability,
              accountType: item.investment.accountType,
              user: req.userId,
            });

            // Extract and normalize original investment ID
            let originalId = null;
            if (item.investment._id?.buffer instanceof Buffer) {
              originalId = item.investment._id.buffer.toString("hex");
            } else if (item.investment._id instanceof Buffer) {
              originalId = item.investment._id.toString("hex");
            } else if (typeof item.investment._id === "string") {
              originalId = item.investment._id;
            }

            if (originalId) {
              investmentMap.set(originalId, newInv._id);
            }
          }
        })
      );
    }

    // Step 2: Create the scenario
    const newScenario = await Scenario.create({
      name: scenarioData.name || "Imported Scenario",
      type: scenarioData.type || "Individual",
      birthYear: scenarioData.birthYear,
      lifeExpectancy: scenarioData.lifeExpectancy,
      financialGoal: scenarioData.financialGoal || 0,
      inflationAssumption: scenarioData.inflationAssumption || 2.5,
      spendingStrategy: scenarioData.spendingStrategy || "Safe Withdrawal Rate",
      withdrawalStrategy: scenarioData.withdrawalStrategy || "RMD",
      user: req.userId,
      rothConversionSettings: scenarioData.rothConversionSettings || {
        enabled: false,
        startYear: null,
        endYear: null,
      },
      RMDSettings: scenarioData.RMDSettings || { enabled: true },
      investmentTypes: scenarioData.investmentTypes
        ? scenarioData.investmentTypes.map((item) => {
            let originalId = null;
            if (item.investment?._id?.buffer instanceof Buffer) {
              originalId = item.investment._id.buffer.toString("hex");
            } else if (typeof item.investment === "string") {
              originalId = item.investment;
            }
            return {
              investment: investmentMap.get(originalId),
              value: item.value,
            };
          })
        : [],
    });

    // Step 3: Process events
    if (scenarioData.events) {
      await Promise.all(
        scenarioData.events.map(async (event) => {
          const eventData = {
            ...event,
            scenario: newScenario._id,
            user: req.userId,
          };

          // Handle assetAllocation if present
          if (event.assetAllocation) {
            eventData.assetAllocation = event.assetAllocation.map(
              (allocation) => {
                let originalId = null;

                if (allocation.investment?._id?.buffer instanceof Buffer) {
                  originalId = allocation.investment._id.buffer.toString("hex");
                } else if (
                  allocation.investment?.buffer instanceof Buffer
                ) {
                  originalId = allocation.investment.buffer.toString("hex");
                } else if (typeof allocation.investment === "string") {
                  originalId = allocation.investment;
                }

                return {
                  investment: investmentMap.get(originalId),
                  percentage: allocation.percentage,
                };
              }
            );
          }

          await Event.create(eventData);
        })
      );
    }

    res.status(201).json({
      success: true,
      scenarioId: newScenario._id,
      message: "Scenario imported successfully",
    });
  } catch (error) {
    console.error("Import error:", error);
    res.status(400).json({
      success: false,
      error: "Import failed",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
