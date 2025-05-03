import mongoose from "mongoose";

const taxSchema = new mongoose.Schema(
  {
    federalTaxBrackets: [
      {
        bracket: String,
        rate: Number,
      },
    ],
    stateTaxes: [
      {
        state: String,
        brackets: [
          {
            bracket: String,
            rate: Number,
          },
        ],
      },
    ],
    capitalGainsTax: {
      longTermRate: Number,
      shortTermRate: Number,
    },
    socialSecurityTax: {
      taxablePercentage: Number,
    },
  },
  { timestamps: true }
);

export const Tax = mongoose.model("Tax", taxSchema);
