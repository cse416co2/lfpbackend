import request from "supertest";
import app from "../server.js";
import mongoose from "mongoose";

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URL);
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe("App Integration Tests", () => {
  it("GET /home should return welcome message", async () => {
    const res = await request(app).get("/home");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "I am coming from backend");
    expect(res.body).toHaveProperty("success", true);
  });

  const routes = [
    "/api/user",
    "/api/scenario",
    "/api/investment",
    "/api/event",
    "/api/tax",
    "/api/simulation",
    "/api/scenarios",
    "/api/logging"
  ];

  routes.forEach((route) => {
    it(`Base route ${route} should not return 500`, async () => {
      const res = await request(app).get(route);
      expect(res.statusCode).not.toBe(500); // Could be 404 or 401 depending on protection
    });
  });
});
