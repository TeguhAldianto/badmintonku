import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || "mysql://root:@localhost:3306/badmintonku",
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
