import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import fs from "fs";
import path from "path";
import app from "../server.js";
import { User } from "../models/userModel.js";
import { Scenario } from "../models/scenarioModel.js";
import { jest } from '@jest/globals';

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
  await Scenario.deleteMany();
  await User.deleteMany();
});

describe("Scenario Logging", () => {
  beforeEach(async () => {
    await request(app).post("/api/user/register").send({
      name: "Logger User",
      email: "logger@example.com",
      password: "password123",
    });

    const loginRes = await request(app).post("/api/user/login").send({
      email: "logger@example.com",
      password: "password123",
    });

    token = loginRes.headers["set-cookie"][0].split(";")[0].split("=")[1];
    userId = loginRes.body.user._id;

    const scenarioRes = await request(app)
      .post("/api/scenario")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Log Scenario",
        type: "Individual",
        birthYear: 1980,
        lifeExpectancy: 90,
        financialGoal: 500000,
        inflationAssumption: 2.0,
        spendingStrategy: "Moderate",
        withdrawalStrategy: "BucketStrategy",
        rothConversionSettings: {
          enabled: false,
          startYear: 2030,
          endYear: 2040,
        },
        RMDSettings: { enabled: false },
      });

    scenarioId = scenarioRes.body.scenario._id;
  });

  it("should return 404 if log file does not exist", async () => {
    jest.spyOn(fs, "existsSync").mockReturnValue(false);

    const res = await request(app)
      .get(`/api/logging/${scenarioId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("No logs found for this scenario");

    fs.existsSync.mockRestore();
  });

  it("should write and fetch logs successfully", async () => {
    jest.spyOn(fs, "appendFileSync").mockImplementation(() => {});

    jest.spyOn(fs, "existsSync").mockReturnValue(true);

    jest.spyOn(fs, "readFileSync").mockReturnValue(
      `[${new Date().toISOString()}] First log entry\n[${new Date().toISOString()}] Second log entry`
    );

    const res = await request(app)
      .get(`/api/logging/${scenarioId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.scenarioId).toBe(scenarioId);
    expect(res.body.logs).toMatch(/First log entry/);
    expect(res.body.logs).toMatch(/Second log entry/);

    fs.appendFileSync.mockRestore();
    fs.existsSync.mockRestore();
    fs.readFileSync.mockRestore();
  });

  it("should return 404 if scenario does not belong to user", async () => {
    await request(app).post("/api/user/register").send({
      name: "Other User",
      email: "other@example.com",
      password: "password123",
    });

    const otherLoginRes = await request(app).post("/api/user/login").send({
      email: "other@example.com",
      password: "password123",
    });

    const otherToken = otherLoginRes.headers["set-cookie"][0]
      .split(";")[0]
      .split("=")[1];

    const res = await request(app)
      .get(`/api/logging/${scenarioId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Scenario not found");
  });
});
