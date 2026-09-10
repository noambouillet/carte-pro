import { describe, test, expect } from "bun:test";
import { hashPassword, verifyPassword } from "../src/middleware/auth";
import { clientIp } from "../src/middleware/audit";

describe("hashPassword / verifyPassword", () => {
  test("verifyPassword succeeds with the right password", async () => {
    const hash = await hashPassword("Recette2026!");
    expect(await verifyPassword("Recette2026!", hash)).toBe(true);
  });

  test("verifyPassword fails with the wrong password", async () => {
    const hash = await hashPassword("Recette2026!");
    expect(await verifyPassword("not-the-password", hash)).toBe(false);
  });

  test("hashPassword never returns the plain password", async () => {
    const hash = await hashPassword("Recette2026!");
    expect(hash).not.toBe("Recette2026!");
  });
});

describe("clientIp", () => {
  test("reads the first address from x-forwarded-for", () => {
    const request = new Request("https://localhost/", {
      headers: { "x-forwarded-for": "203.0.113.4, 10.0.0.1" },
    });
    expect(clientIp(request)).toBe("203.0.113.4");
  });

  test("falls back to x-real-ip when x-forwarded-for is missing", () => {
    const request = new Request("https://localhost/", {
      headers: { "x-real-ip": "198.51.100.7" },
    });
    expect(clientIp(request)).toBe("198.51.100.7");
  });

  test("returns null when neither header is present", () => {
    const request = new Request("https://localhost/");
    expect(clientIp(request)).toBeNull();
  });
});
