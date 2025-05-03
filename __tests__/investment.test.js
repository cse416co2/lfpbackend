import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../server.js";
import { User } from "../models/userModel.js";
import { Scenario } from "../models/scenarioModel.js";
import { Investment } from "../models/investmentModel.js";

let mongoServer;
let token;
let userId;
let scenarioId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Investment.deleteMany();
  await Scenario.deleteMany();
  await User.deleteMany();
});

describe("Investment Routes", () => {
  beforeEach(async () => {
    await request(app).post("/api/user/register").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    const loginRes = await request(app).post("/api/user/login").send({
      email: "test@example.com",
      password: "password123",
    });

    token = loginRes.headers["set-cookie"][0].split(";")[0].split("=")[1];
    userId = loginRes.body.user._id;

    const scenarioRes = await request(app)
      .post("/api/scenario")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Test Scenario",
        type: "Individual",
        birthYear: 1990,
        lifeExpectancy: 85,
        financialGoal: 1000000,
        inflationAssumption: 2.5,
        spendingStrategy: "Conservative",
        withdrawalStrategy: "4PercentRule",
        rothConversionSettings: {
          enabled: true,
          startYear: 2030,
          endYear: 2040,
        },
        RMDSettings: { enabled: true },
      });

    console.log("created scenario!");

    scenarioId = scenarioRes.body.scenario._id;
  });

  it("should create a new investment", async () => {
    const res = await request(app)
      .post("/api/investment/")
      .set("Authorization", `Bearer ${token}`)
      .send({
        scenarioId,
        name: "Index Fund",
        description: "S&P 500",
        expectedReturn: 7.0,
        expenseRatio: 0.1,
        dividendYield: 2.0,
        taxability: "taxable",
        accountType: "pre-tax",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.investment.name).toBe("Index Fund");
    expect(Number(res.body.investment.expectedReturn)).toBe(7.0);;
  });

  it("should fetch all investments for a scenario", async () => {
    await request(app)
      .post("/api/investment")
      .set("Authorization", `Bearer ${token}`)
      .send({
        scenarioId,
        name: "REIT",
        description: "Real Estate Fund",
        expectedReturn: 5.0,
        expenseRatio: 0.2,
        dividendYield: 4.5,
        taxability: "taxable",
        accountType: "after-tax",
      });

    const res = await request(app)
      .get(`/api/investment/scenario/${scenarioId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("REIT");
  });

  it("should fetch an investment by ID", async () => {
    const investmentRes = await request(app)
      .post("/api/investment")
      .set("Authorization", `Bearer ${token}`)
      .send({
        scenarioId,
        name: "Bond Fund",
        description: "Government Bonds",
        expectedReturn: 3.0,
        expenseRatio: 0.05,
        dividendYield: 1.5,
        taxability: "tax-exempt",
        accountType: "non-retirement",
      });

    const investmentId = investmentRes.body.investment._id;

    const res = await request(app)
      .get(`/api/investment/${investmentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe("Bond Fund");
    expect(res.body.scenarioId).toBe(String(scenarioId));
  });

  it("should update an investment", async () => {
    const investmentRes = await request(app)
      .post("/api/investment")
      .set("Authorization", `Bearer ${token}`)
      .send({
        scenarioId,
        name: "Crypto",
        description: "Bitcoin",
        expectedReturn: 15.0,
        expenseRatio: 0,
        dividendYield: 0,
        taxability: "taxable",
        accountType: "pre-tax",
      });

    const investmentId = investmentRes.body.investment._id;

    const res = await request(app)
      .put(`/api/investment/${investmentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ expectedReturn: 20.0 });

    expect(res.statusCode).toBe(200);
    expect(Number(res.body.investment.expectedReturn)).toBe(20.0);
  });

  it("should delete an investment", async () => {
    const investmentRes = await request(app)
      .post("/api/investment")
      .set("Authorization", `Bearer ${token}`)
      .send({
        scenarioId,
        name: "ETF",
        description: "Tech ETF",
        expectedReturn: 10.0,
        expenseRatio: 0.15,
        dividendYield: 1.2,
        taxability: "taxable",
        accountType: "non-retirement",
      });

    const investmentId = investmentRes.body.investment._id;

    const res = await request(app)
      .delete(`/api/investment/${investmentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Investment deleted successfully");
  });
});
