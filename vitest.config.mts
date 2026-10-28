import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for plain TypeScript logic (no DOM): Node environment, and the
// same "@/" -> src/ alias as tsconfig.json. Component tests would need the
// extra packages from Next's Vitest guide (jsdom, @vitejs/plugin-react,
// @testing-library/react).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
