import "reflect-metadata";
import { loadPrismaEnvFile, normalizeEnvQuotes } from "../src/load-env";

// Each E2E app gets an isolated revocation/cache store. Using shared local Redis
// leaks logout and replay state between otherwise independent test files.
process.env.REDIS_USE_MEMORY = "true";

normalizeEnvQuotes();
loadPrismaEnvFile();
