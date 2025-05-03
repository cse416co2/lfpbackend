import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["income", "expense", "investment", "rebalance", "spouseDeath"],
      required: true,
    },
    scenario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scenario",
      required: true,
    },
    startYear: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: function() {
        return this.type !== "spouseDeath";
      },
    },
    expectedChange: {
      type: Number,
      required: function() {
        return this.type !== "spouseDeath";
      },
    },
    inflationAdjusted: {
      type: Boolean,
      default: false,
    },
    discretionary: {
      type: Boolean,
      default: false,
    },
    assetAllocation: [
      {
        investment: { type: mongoose.Schema.Types.ObjectId, ref: "Investment" },
        percentage: Number,
      },
    ],
    isJointIncome: {
      type: Boolean,
      default: false,
    },
    isJointExpense: {
      type: Boolean,
      default: false,
    },
    primaryOwnerShare: {
      type: Number,
      default: 0.0,
      min: 0,
      max: 1,
    },
  },
  { timestamps: true }
);

export const Event = mongoose.model("Event", eventSchema);