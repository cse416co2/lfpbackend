import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../server.js";
import { User } from "../models/userModel.js";
import { Scenario } from "../models/scenarioModel.js";
import { Event } from "../models/eventModel.js";

let mongoServer;
let token;
let userId;
let scenarioId;
let createdEventId;

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
  await Event.deleteMany();
  await Scenario.deleteMany();
  await User.deleteMany();
});

describe("Event Routes", () => {
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

    scenarioId = scenarioRes.body.scenario._id;

    const eventRes = await request(app)
      .post("/api/event")
      .set("Authorization", `Bearer ${token}`)
      .send({
        scenarioId,
        type: "income",
        startYear: 2025,
        duration: 1,
        amount: 20000,
        expectedChange: 20,
        inflationAdjusted: true,
        discretionary: false,
      });

    createdEventId = eventRes.body.event._id;
  });

  it("should create a new event", async () => {
    const res = await request(app)
      .post("/api/event")
      .set("Authorization", `Bearer ${token}`)
      .send({
        scenarioId,
        type: "expense",
        startYear: 2026,
        duration: 2,
        amount: 15000,
        expectedChange: 5,
        inflationAdjusted: false,
        discretionary: true,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.event.type).toBe("expense");
    expect(res.body.event.scenario).toBe(String(scenarioId));
  });

  it("should fetch all events for a scenario", async () => {
    const res = await request(app)
      .get(`/api/event/scenario/${scenarioId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0]._id).toBe(createdEventId);
  });

  it("should fetch an event by ID", async () => {
    const res = await request(app)
      .get(`/api/event/${createdEventId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(createdEventId);
    expect(res.body.type).toBe("income");
  });

  it("should update an event", async () => {
    const res = await request(app)
      .put(`/api/event/${createdEventId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ expectedChange: 6000 });

    expect(res.statusCode).toBe(200);
    expect(res.body.event.expectedChange).toBe(6000);
  });

  it("should delete an event", async () => {
    const res = await request(app)
      .delete(`/api/event/${createdEventId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Event deleted successfully");

    const followUp = await request(app)
      .get(`/api/event/${createdEventId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(followUp.statusCode).toBe(404);
  });
});
