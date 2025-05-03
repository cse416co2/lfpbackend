import mongoose from "mongoose";

const scenarioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["Individual", "Married"],
      required: true,
    },
    birthYear: {
      type: Number,
      required: true,
    },
    lifeExpectancy: {
      type: Number,
      required: true,
    },
    financialGoal: {
      type: Number,
      required: true,
    },
    investmentTypes: [
      {
        investment: { type: mongoose.Schema.Types.ObjectId, ref: "Investment" },
        value: Number,
      },
    ],
    events: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    inflationAssumption: {
      type: Number,
      required: true,
    },
    spendingStrategy: {
      type: String,
      required: true,
    },
    withdrawalStrategy: {
      type: String,
      required: true,
    },
    rothConversionSettings: {
      enabled: Boolean,
      startYear: Number,
      endYear: Number,
    },
    RMDSettings: {
      enabled: Boolean,
    },
    sharedWith: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        accessType: { type: String, enum: ["read", "write"] },
      },
    ],
  },
  { timestamps: true }
);

export const Scenario = mongoose.model("Scenario", scenarioSchema);
