import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../server.js";
import { User } from "../models/userModel.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany();
});

describe("User Routes", () => {
  it("should register a new user", async () => {
    const res = await request(app).post("/api/user/register").send({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Account created successfully!");
    expect(res.body.success).toBe(true);
  });

  it("should not register with missing fields", async () => {
    const res = await request(app).post("/api/user/register").send({
      email: "john@example.com",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should login an existing user", async () => {
    await request(app).post("/api/user/register").send({
      name: "John Doe",
      email: "john2@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/user/login").send({
      email: "john2@example.com",
      password: "password123",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe("john2@example.com"); // Fixed the email to match the registered user
  });

  it("should logout user", async () => {
    const res = await request(app).get("/api/user/logout");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});