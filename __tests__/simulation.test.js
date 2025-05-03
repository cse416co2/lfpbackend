import request from "supertest";
import app from "../server.js";
import { Scenario } from "../models/scenarioModel.js";
import { Investment } from "../models/investmentModel.js";
import { Tax } from "../models/taxModel.js";
import mongoose from "mongoose";

let token, userId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URL);

  await request(app).post("/api/auth/register").send({
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  });

  const loginRes = await request(app).post("/api/auth/login").send({
    email: "test@example.com",
    password: "password123",
  });

  const cookie = loginRes.headers["set-cookie"][0];
  token = cookie.split(";").find(c => c.includes("token")).split("=")[1];

  const meRes = await request(app).get("/api/auth/me").set("Cookie", `token=${token}`);
  userId = meRes.body._id;
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe("POST /api/simulate/:scenarioId", () => {
  it("should simulate the scenario and return SimulationResult", async () => {
    const investment = await Investment.create({
      name: "Test Investment",
      expectedReturn: 0.07,
      expenseRatio: 0.01,
      dividendYield: 0.02,
      taxability: "taxDeferred",
      accountType: "retirement",
    });

    const scenario = await Scenario.create({
      name: "Test Scenario",
      user: userId,
      investmentTypes: [investment._id],
      inflationAssumption: 0.02,
      spendingStrategy: "default",
      withdrawalStrategy: "default",
      rothConversionSettings: { enabled: false },
      RMDSettings: { enabled: true, age: 72 },
      financialGoal: 100000,
    });

    await Tax.create({
      year: 2025,
      federal: [
        { rate: 0.1, threshold: 11000 },
        { rate: 0.12, threshold: 44725 },
        { rate: 0.22, threshold: 95375 },
        { rate: 0.24, threshold: 182100 },
      ],
      state: 0.05,
      capitalGains: {
        longTerm: 0.15,
        shortTerm: 0.22,
      },
      socialSecurity: 0.062,
    });

    const res = await request(app)
      .post(`/api/simulate/${scenario._id}`)
      .set("Cookie", `token=${token}`)
      .send();

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result).toMatchObject({
      totalIncome: expect.any(Number),
      totalExpenses: expect.any(Number),
    });
    expect(res.body.result.reports.chartData).toEqual(
      expect.objectContaining({
        income: expect.any(Array),
        expenses: expect.any(Array),
        investmentValues: expect.any(Array),
      })
    );
  });
});
