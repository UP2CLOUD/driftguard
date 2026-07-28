import { describe, it, expect } from "vitest";
import { BASE_RECORDS, buildChain, verifyChain } from "./evidence";

describe("evidence hash chain", () => {
  it("verifies cleanly when nothing has been tampered with", async () => {
    const chain = await buildChain(BASE_RECORDS);
    const result = await verifyChain(chain);
    expect(result.ok).toBe(true);
    expect(result.firstFailureSeq).toBeNull();
    expect(result.steps.every((s) => s.hashOk && s.chainOk && s.trusted)).toBe(true);
  });

  it("chains each record to the previous record's hash", async () => {
    const chain = await buildChain(BASE_RECORDS);
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].prev_hash).toBe(chain[i - 1].hash);
    }
  });

  it("detects a single tampered record and breaks trust for everything after it", async () => {
    const chain = await buildChain(BASE_RECORDS);
    const tampered = chain.map((r) => ({ ...r }));
    // Mutate content of the 3rd record without recomputing its hash — this
    // is what "modify one byte" does in the UI.
    tampered[2] = { ...tampered[2], reason: "policy: no-public-buckets matched (edited)" };

    const result = await verifyChain(tampered);
    expect(result.ok).toBe(false);
    expect(result.firstFailureSeq).toBe(tampered[2].seq);

    // The tampered record itself fails its own hash check.
    expect(result.steps[2].hashOk).toBe(false);
    // Its chain pointer is untouched, so chainOk alone still holds...
    expect(result.steps[2].chainOk).toBe(true);
    // ...but trust is broken from this record on.
    expect(result.steps[2].trusted).toBe(false);
    expect(result.steps[3].trusted).toBe(false);
    expect(result.steps[4].trusted).toBe(false);

    // Everything before the tampered record is still trusted.
    expect(result.steps[0].trusted).toBe(true);
    expect(result.steps[1].trusted).toBe(true);
  });

  it("restoring the original record restores a clean verification", async () => {
    const chain = await buildChain(BASE_RECORDS);
    const tampered = chain.map((r) => ({ ...r }));
    tampered[1] = { ...tampered[1], reason: "tampered" };
    expect((await verifyChain(tampered)).ok).toBe(false);

    const restored = chain.map((r) => ({ ...r }));
    expect((await verifyChain(restored)).ok).toBe(true);
  });
});
