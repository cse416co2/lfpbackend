import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import fs from "fs";
import path from "path";
import app from "../server.js";
import { Tax } from "../models/taxModel.js";
import { User } from "../models/userModel.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongoServer;
let token;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Tax.deleteMany();
  await User.deleteMany();
});

describe("Tax Routes", () => {
  beforeEach(async () => {
    await request(app).post("/api/user/register").send({
      name: "Tax Tester",
      email: "tax@example.com",
      password: "password123",
    });

    const loginRes = await request(app).post("/api/user/login").send({
      email: "tax@example.com",
      password: "password123",
    });

    token = loginRes.headers["set-cookie"][0].split(";")[0].split("=")[1];

    await Tax.create({
      federalTaxBrackets: [
        { bracket: "10%", rate: 10 },
        { bracket: "20%", rate: 20 },
      ],
      stateTaxes: [
        {
          state: "California",
          brackets: [
            { bracket: "5%", rate: 5 },
            { bracket: "10%", rate: 10 },
          ],
        },
        {
          state: "Texas",
          brackets: [{ bracket: "0%", rate: 0 }],
        },
      ],
      capitalGainsTax: {
        longTermRate: 15,
        shortTermRate: 25,
      },
      socialSecurityTax: {
        taxablePercentage: 85,
      },
    });
  });

  it("should fetch federal tax brackets", async () => {
    const res = await request(app)
      .get("/api/tax/federal")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].bracket).toBe("10%");
  });

  it("should fetch state tax brackets for California", async () => {
    const res = await request(app)
      .get("/api/tax/state/California")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.state).toBe("California");
    expect(res.body.brackets.length).toBe(2);
  });

  it("should return 404 for unknown state", async () => {
    const res = await request(app)
      .get("/api/tax/state/UnknownState")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });

  it("should fetch all state names", async () => {
    const res = await request(app)
      .get("/api/tax/states")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("California");
    expect(res.body).toContain("Texas");
  });

  it("should upload and update tax data from YAML", async () => {
    const filePath = path.join(__dirname, "test-tax-data.yaml");
    const yamlContent = `
federalTaxBrackets:
  - bracket: "12%"
    rate: 12
  - bracket: "22%"
    rate: 22
stateTaxes:
  - state: "New York"
    brackets:
      - bracket: "6%"
        rate: 6
      - bracket: "8%"
        rate: 8
capitalGainsTax:
  longTermRate: 18
  shortTermRate: 28
socialSecurityTax:
  taxablePercentage: 90
    `;

    fs.writeFileSync(filePath, yamlContent);

    const res = await request(app)
      .post("/api/tax/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", filePath);

    expect(res.statusCode).toBe(200);
    expect(res.body.taxData.federalTaxBrackets.length).toBe(2);
    expect(res.body.taxData.stateTaxes[0].state).toBe("New York");

    fs.unlinkSync(filePath);
  });

  it("should return 400 for missing file upload", async () => {
    const res = await request(app)
      .post("/api/tax/upload")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
  });
});
