import { Scenario } from "../models/scenarioModel.js";
import { User } from "../models/userModel.js";
import { logScenarioActivity } from "../controllers/loggingController.js";

export const createScenario = async (req, res) => {
  try {
    console.log("req.userId:", req.userId);
    const {
      name,
      type,
      birthYear,
      lifeExpectancy,
      financialGoal,
      inflationAssumption,
      spendingStrategy,
      withdrawalStrategy,
      rothConversionSettings,
      RMDSettings,
    } = req.body;

    const user = await User.findById(req.userId);
    if (!user)
      return res.status(404).json({ message: "user not found" });

    const newScenario = new Scenario({
      user: req.userId,
      name,
      type,
      birthYear,
      lifeExpectancy,
      financialGoal,
      inflationAssumption,
      spendingStrategy,
      withdrawalStrategy,
      rothConversionSettings,
      RMDSettings,
      investmentTypes: [],
      events: [],
      sharedWith: [],
    });

    await newScenario.save();

    user.scenarios.push(newScenario._id);
    await user.save();

    logScenarioActivity(
      newScenario._id,
      `Scenario created: ${name}, Type: ${type}`
    );

    res.status(201).json({
      message: "Scenario created successfully",
      scenario: newScenario,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating scenario", error: error.message });
  }
};

export const getScenarios = async (req, res) => {
  try {
    const scenarios = await Scenario.find({ user: req.userId })
      .populate("investmentTypes.investment")
      .populate("events");

    res.status(200).json(scenarios);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching scenarios", error: error.message });
  }
};

export const getScenarioById = async (req, res) => {
  try {
    const scenario = await Scenario.findOne({
      _id: req.params.id,
      user: req.userId,
    })
      .populate("investmentTypes.investment")
      .populate("events");

    if (!scenario)
      return res.status(404).json({ message: "Scenario not found" });

    res.status(200).json(scenario);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching scenario", error: error.message });
  }
};

export const updateScenario = async (req, res) => {
  try {
    const updatedScenario = await Scenario.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedScenario)
      return res.status(404).json({ message: "Scenario not found" });

    logScenarioActivity(
      updatedScenario._id,
      `Scenario updated: ${updatedScenario.name}`
    );

    res.status(200).json({
      message: "Scenario updated successfully",
      scenario: updatedScenario,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating scenario", error: error.message });
  }
};

export const deleteScenario = async (req, res) => {
  try {
    const deletedScenario = await Scenario.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!deletedScenario)
      return res.status(404).json({ message: "Scenario not found" });

      const user = await User.findById(req.userId);
      if (user) {
        user.scenarios.pull(deletedScenario._id);
        await user.save();
      }

    logScenarioActivity(
      deletedScenario._id,
      `Scenario deleted: ${deletedScenario.name}`
    );

    res.status(200).json({ message: "Scenario deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting scenario", error: error.message });
  }
};
