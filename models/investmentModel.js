import mongoose from "mongoose";

const investmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    expectedReturn: {
      type: String,
      required: true,
    },
    expenseRatio: {
      type: Number,
      required: true,
    },
    dividendYield: {
      type: Number,
      required: true,
    },
    taxability: {
      type: String,
      enum: ["tax-exempt", "taxable"],
      required: true,
    },
    accountType: {
      type: String,
      enum: ["non-retirement", "pre-tax", "after-tax"],
      required: true,
    },
  },
  { timestamps: true }
);

export const Investment = mongoose.model("Investment", investmentSchema);
