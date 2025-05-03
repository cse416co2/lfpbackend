import mongoose from "mongoose";

const simulationResultSchema = new mongoose.Schema(
  {
    scenario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scenario",
      required: true,
    },
    yearlyInvestmentValues: [
      {
        year: Number,
        value: Number,
      },
    ],
    successProbability: {
      type: Number,
      required: true,
    },
    totalIncome: [
      {
        year: Number,
        amount: Number,
      },
    ],
    totalExpenses: [
      {
        year: Number,
        amount: Number,
      },
    ],
    reports: {
      chartData: { type: Object, required: true },
    },
  },
  { timestamps: true }
);

export const SimulationResult = mongoose.model(
  "SimulationResult",
  simulationResultSchema
);
