import { describe, expect, it } from "vitest";
import { tables } from "../../../lib/db/types";

describe("db schema constants", () => {
  it("contains required core tables", () => {
    expect(tables).toEqual(
      expect.arrayContaining([
        "users",
        "models",
        "articles",
        "favorites",
        "conversations",
        "messages",
        "solutions",
      ]),
    );
  });
});
