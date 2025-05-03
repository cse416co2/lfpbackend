import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../server.js";
import { Scenario } from "../models/scenarioModel.js";
import { User } from "../models/userModel.js";

let mongoServer;
let token;
let userId;

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
  await Scenario.deleteMany();
  await User.deleteMany();
});

describe("Scenario Routes", () => {
  beforeEach(async () => {
    // Register user
    await request(app).post("/api/user/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });
      
      const loginRes = await request(app).post("/api/user/login").send({
        email: "test@example.com",
        password: "password123",
      });
      
      token = loginRes.headers["set-cookie"][0].split(";")[0].split("=")[1];  // Extract token
      userId = loginRes.body.user._id;
  });

  it("should create a new scenario", async () => {
    const res = await request(app)
      .post("/api/scenario")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Retirement Plan",
        type: "Individual",
        birthYear: 1990,
        lifeExpectancy: 85,
        financialGoal: 1000000,
        inflationAssumption: 2.5,
        spendingStrategy: "Conservative",
        withdrawalStrategy: "4PercentRule",
        rothConversionSettings: { enabled: true, startYear: 2030, endYear: 2040 },
        RMDSettings: { enabled: true },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Scenario created successfully");
    expect(res.body.scenario.name).toBe("Retirement Plan");
  });

  it("should fetch all scenarios for the user", async () => {
    // Pre-create one scenario
    await Scenario.create({
      user: userId,
      name: "Scenario 1",
      type: "Individual",
      birthYear: 1985,
      lifeExpectancy: 80,
      financialGoal: 800000,
      inflationAssumption: 2,
      spendingStrategy: "Moderate",
      withdrawalStrategy: "BucketStrategy",
      rothConversionSettings: { enabled: false },
      RMDSettings: { enabled: true },
    });

    const res = await request(app)
      .get("/api/scenario")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("Scenario 1");
  });

  it("should fetch scenario by ID", async () => {
    const scenario = await Scenario.create({
      user: userId,
      name: "Scenario Fetch",
      type: "Individual",
      birthYear: 1980,
      lifeExpectancy: 90,
      financialGoal: 1200000,
      inflationAssumption: 3,
      spendingStrategy: "Aggressive",
      withdrawalStrategy: "DynamicWithdrawal",
      rothConversionSettings: { enabled: true },
      RMDSettings: { enabled: false },
    });

    const res = await request(app)
      .get(`/api/scenario/${scenario._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe("Scenario Fetch");
  });

  it("should update a scenario", async () => {
    const scenario = await Scenario.create({
      user: userId,
      name: "Update Me",
      type: "Individual",
      birthYear: 1975,
      lifeExpectancy: 85,
      financialGoal: 700000,
      inflationAssumption: 2,
      spendingStrategy: "Moderate",
      withdrawalStrategy: "SafeWithdrawal",
      rothConversionSettings: { enabled: false },
      RMDSettings: { enabled: true },
    });

    const res = await request(app)
      .put(`/api/scenario/${scenario._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Name", financialGoal: 900000 });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Scenario updated successfully");
    expect(res.body.scenario.name).toBe("Updated Name");
    expect(res.body.scenario.financialGoal).toBe(900000);
  });

  it("should delete a scenario", async () => {
    const scenario = await Scenario.create({
      user: userId,
      name: "Delete Me",
      type: "Individual",
      birthYear: 1992,
      lifeExpectancy: 88,
      financialGoal: 500000,
      inflationAssumption: 1.5,
      spendingStrategy: "Minimalist",
      withdrawalStrategy: "FixedWithdrawal",
      rothConversionSettings: { enabled: false },
      RMDSettings: { enabled: false },
    });

    const res = await request(app)
      .delete(`/api/scenario/${scenario._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Scenario deleted successfully");
  });
});
