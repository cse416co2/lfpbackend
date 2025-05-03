import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    scenarios: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Scenario",
      },
    ],
    sharedScenarios: [
      {
        scenarioId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Scenario",
        },
        accessType: {
          type: String,
          enum: ["read", "write"],
        },
      },
    ],
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
