import { clearFlushMutexes, withFlushMutex } from "@/utils/flushMutex";

describe("withFlushMutex", () => {
  beforeEach(() => {
    clearFlushMutexes();
  });

  it("shares a single in-flight run across concurrent callers", async () => {
    let runs = 0;
    const op = async () => {
      runs += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return runs;
    };

    const [a, b, c] = await Promise.all([
      withFlushMutex("key", op),
      withFlushMutex("key", op),
      withFlushMutex("key", op),
    ]);

    expect(runs).toBe(1);
    expect(a).toBe(1);
    expect(b).toBe(1);
    expect(c).toBe(1);
  });

  it("allows different keys to run in parallel", async () => {
    let runs = 0;
    const op = async (label: string) => {
      runs += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return label;
    };

    const [a, b] = await Promise.all([
      withFlushMutex("a", () => op("a")),
      withFlushMutex("b", () => op("b")),
    ]);

    expect(runs).toBe(2);
    expect(a).toBe("a");
    expect(b).toBe("b");
  });

  it("runs again after the previous run settles", async () => {
    const op = async () => "ok";
    const first = await withFlushMutex("key", op);
    const second = await withFlushMutex("key", op);
    expect(first).toBe("ok");
    expect(second).toBe("ok");
  });

  it("propagates a rejection and releases the lock", async () => {
    const failing = async () => {
      throw new Error("boom");
    };
    await expect(withFlushMutex("key", failing)).rejects.toThrow("boom");
    await expect(withFlushMutex("key", async () => "recovered")).resolves.toBe("recovered");
  });
});