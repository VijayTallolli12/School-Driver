import { enqueueSos, flushSosQueue, getSosQueue } from "@/services/sosQueue";
import { storage } from "@/utils/storage";
import { isNetworkError, sendSosAlert } from "@/services/api";
import type { SosAlertPayload } from "@/types";

jest.mock("@/services/api", () => ({
  sendSosAlert: jest.fn(),
  isNetworkError: jest.fn(),
}));

jest.mock("@/utils/storage", () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clearAll: jest.fn(),
  },
}));

const mockGet = storage.get as jest.Mock;
const mockSet = storage.set as jest.Mock;
const mockSend = sendSosAlert as jest.Mock;
const mockIsNetworkError = isNetworkError as jest.Mock;

const payload: SosAlertPayload = {
  driver_uuid: "drv-1",
  trip_id: 42,
  recorded_at: "2026-08-10T10:00:00.000Z",
  latitude: 19.076,
  longitude: 72.877,
  accuracy: 12,
  battery_level: 0.8,
} as SosAlertPayload;

beforeEach(() => {
  mockGet.mockReset();
  mockSet.mockReset();
  mockSend.mockReset();
  mockIsNetworkError.mockReset();
  mockGet.mockResolvedValue([]);
  mockSet.mockResolvedValue(undefined);
  mockSend.mockResolvedValue({ success: true });
});

describe("enqueueSos", () => {
  it("appends a new alert to an empty queue", async () => {
    const queue = await enqueueSos(payload);
    expect(queue).toHaveLength(1);
    expect(mockSet).toHaveBeenCalledWith("driver_sos_queue", [payload]);
  });

  it("deduplicates identical (driver, trip, recorded_at) entries", async () => {
    mockGet.mockResolvedValue([payload]);
    await enqueueSos(payload);
    const written = mockSet.mock.calls[0][1] as SosAlertPayload[];
    expect(written).toHaveLength(1);
  });
});

describe("flushSosQueue", () => {
  it("returns immediately when the queue is empty", async () => {
    const result = await flushSosQueue();
    expect(result).toEqual({ pending: 0, sent: 0 });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends every queued alert and reports zero pending", async () => {
    mockGet.mockResolvedValue([payload, { ...payload, trip_id: 43 }]);
    const result = await flushSosQueue();
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ pending: 0, sent: 2 });
    expect(mockSet).toHaveBeenCalledWith("driver_sos_queue", []);
  });

  it("keeps entries on a network error and lets later ones retry", async () => {
    mockSend
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ success: true });
    mockIsNetworkError.mockReturnValue(true);
    mockGet.mockResolvedValue([payload, { ...payload, trip_id: 43 }]);

    const result = await flushSosQueue();
    expect(result).toEqual({ pending: 1, sent: 1 });
    const kept = mockSet.mock.calls[0][1] as SosAlertPayload[];
    expect(kept).toEqual([payload]);
  });

  it("drops entries rejected by the backend so they never loop forever", async () => {
    mockSend.mockRejectedValueOnce(new Error("validation failed"));
    mockIsNetworkError.mockReturnValue(false);
    mockGet.mockResolvedValue([payload]);

    const result = await flushSosQueue();
    expect(result).toEqual({ pending: 0, sent: 0 });
    expect(mockSet).toHaveBeenCalledWith("driver_sos_queue", []);
  });
});

describe("getSosQueue", () => {
  it("returns a stored queue", async () => {
    mockGet.mockResolvedValue([payload]);
    await expect(getSosQueue()).resolves.toEqual([payload]);
  });

  it("returns an empty array when nothing is stored", async () => {
    mockGet.mockResolvedValue(null);
    await expect(getSosQueue()).resolves.toEqual([]);
  });
});