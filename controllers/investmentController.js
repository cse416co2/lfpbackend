import { Investment } from "../models/investmentModel.js";
import { Scenario } from "../models/scenarioModel.js";
import { logScenarioActivity } from "../controllers/loggingController.js";

export const addInvestment = async (req, res) => {
  try {
    const {
      scenarioId,
      name,
      description,
      expectedReturn,
      expenseRatio,
      dividendYield,
      taxability,
      accountType,
    } = req.body;

    const scenario = await Scenario.findOne({
      _id: scenarioId,
      user: req.userId,
    });
    if (!scenario)
      return res.status(404).json({ message: "Scenario not found" });

    const newInvestment = new Investment({
      name,
      description,
      expectedReturn,
      expenseRatio,
      dividendYield,
      taxability,
      accountType,
    });

    await newInvestment.save();

    scenario.investmentTypes.push({ investment: newInvestment._id, value: 0 });
    await scenario.save();

    logScenarioActivity(
      scenarioId,
      `Investment added: ${name}, Expected Return: ${expectedReturn}%`
    );

    res.status(201).json({
      message: "Investment added successfully",
      investment: newInvestment,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding investment", error: error.message });
  }
};

export const getInvestmentsByScenarioId = async (req, res) => {
  try {
    const { scenarioId } = req.params;

    const scenario = await Scenario.findById(scenarioId).populate(
      "investmentTypes.investment"
    );

    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found" });
    }

    const investments = scenario.investmentTypes.map(
      (investmentType) => investmentType.investment
    );

    res.status(200).json(investments);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching investments", error: error.message });
  }
};

export const getInvestmentById = async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id);
    if (!investment)
      return res.status(404).json({ message: "Investment not found" });

    const scenario = await Scenario.findOne({
      "investmentTypes.investment": investment._id,
    });
    if (!scenario) {
      return res
        .status(404)
        .json({ message: "Scenario not found for this investment" });
    }

    const investmentWithScenarioId = {
      ...investment.toObject(), 
      scenarioId: scenario._id, 
    };

    res.status(200).json(investmentWithScenarioId);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching investment", error: error.message });
  }
};

export const updateInvestment = async (req, res) => {
  try {
    const updatedInvestment = await Investment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedInvestment)
      return res.status(404).json({ message: "Investment not found" });

    logScenarioActivity(
      updatedInvestment._id,
      `Investment updated: ${updatedInvestment.name}, New Expected Return: ${updatedInvestment.expectedReturn}%`
    );

    res.status(200).json({
      message: "Investment updated successfully",
      investment: updatedInvestment,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating investment", error: error.message });
  }
};

export const deleteInvestment = async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id);
    if (!investment)
      return res.status(404).json({ message: "Investment not found" });

    await Scenario.updateMany(
      { "investmentTypes.investment": investment._id },
      { $pull: { investmentTypes: { investment: investment._id } } }
    );

    await Investment.findByIdAndDelete(req.params.id);

    logScenarioActivity(
      investment._id,
      `Investment deleted: ${investment.name}`
    );

    res.status(200).json({ message: "Investment deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting investment", error: error.message });
  }
};
