import request from "supertest";
import app from "../server.js";
import { Scenario } from "../models/scenarioModel.js";
import { User } from "../models/userModel.js";
import { Investment } from "../models/investmentModel.js";
import fs from "fs";
import yaml from "js-yaml";

// Mock fs and yaml
jest.mock("fs");
jest.mock("js-yaml");

describe("Scenario Controller Tests", () => {
  let userId;
  let scenarioId;
  let userToken;

  beforeAll(async () => {
    // Set up mock data
    const user = await User.create({
      email: "testuser@example.com",
      password: "password123",
    });
    userId = user._id;
    userToken = `Bearer ${user.generateAuthToken()}`;

    const scenario = await Scenario.create({
      name: "Test Scenario",
      user: userId,
    });
    scenarioId = scenario._id;
  });

  afterAll(async () => {
    // Clean up mock data
    await Scenario.deleteMany({});
    await User.deleteMany({});
    jest.restoreAllMocks();
  });

  describe("POST /api/scenario/share", () => {
    it("should share a scenario successfully", async () => {
      const userToShareWith = await User.create({
        email: "shareuser@example.com",
        password: "password123",
      });

      const res = await request(app)
        .post("/api/scenario/share")
        .set("Authorization", userToken)
        .send({
          scenarioId,
          userId: userToShareWith._id,
          accessType: "read",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Scenario shared successfully");
    });

    it("should return 404 if scenario not found", async () => {
      const res = await request(app)
        .post("/api/scenario/share")
        .set("Authorization", userToken)
        .send({
          scenarioId: "invalidScenarioId",
          userId,
          accessType: "read",
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Scenario not found");
    });

    it("should return 404 if user to share with is not found", async () => {
      const res = await request(app)
        .post("/api/scenario/share")
        .set("Authorization", userToken)
        .send({
          scenarioId,
          userId: "invalidUserId",
          accessType: "read",
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("User to share with not found");
    });

    it("should return 400 if scenario is already shared with the user", async () => {
      const userToShareWith = await User.create({
        email: "shareuser@example.com",
        password: "password123",
      });

      await Scenario.findByIdAndUpdate(scenarioId, {
        $push: { sharedWith: { user: userToShareWith._id, accessType: "read" } },
      });

      const res = await request(app)
        .post("/api/scenario/share")
        .set("Authorization", userToken)
        .send({
          scenarioId,
          userId: userToShareWith._id,
          accessType: "read",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Scenario is already shared with this user");
    });
  });

  describe("GET /api/scenario/export/:scenarioId", () => {
    it("should export a scenario successfully", async () => {
      const mockYamlDump = jest.fn(() => "--- test: scenario data ---");
      yaml.dump = mockYamlDump;

      const res = await request(app)
        .get(`/api/scenario/export/${scenarioId}`)
        .set("Authorization", userToken);

      expect(res.status).toBe(200);
      expect(res.header["content-disposition"]).toContain("attachment");
    });

    it("should return 404 if scenario not found", async () => {
      const res = await request(app)
        .get("/api/scenario/export/invalidScenarioId")
        .set("Authorization", userToken);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Scenario not found");
    });
  });

  describe("POST /api/scenario/import", () => {
    it("should import a scenario successfully", async () => {
      const mockYamlLoad = jest.fn(() => ({
        scenario: {
          name: "Imported Scenario",
          type: "Individual",
          user: userId,
          events: [],
        },
      }));
      yaml.load = mockYamlLoad;

      fs.readFileSync = jest.fn(() => "--- test: imported data ---");
      fs.existsSync = jest.fn(() => false);
      fs.mkdirSync = jest.fn();

      const mockScenarioCreate = jest.spyOn(Scenario, "create").mockResolvedValue({
        _id: "newScenarioId",
      });

      const res = await request(app)
        .post("/api/scenario/import")
        .set("Authorization", userToken)
        .attach("file", "test.yml");

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Scenario imported successfully");
      expect(mockScenarioCreate).toHaveBeenCalled();
    });

    it("should return 400 if invalid YAML format", async () => {
      const mockYamlLoad = jest.fn(() => null);
      yaml.load = mockYamlLoad;

      const res = await request(app)
        .post("/api/scenario/import")
        .set("Authorization", userToken)
        .attach("file", "invalid.yml");

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Import failed");
    });
  });
});
