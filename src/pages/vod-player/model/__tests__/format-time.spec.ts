import { describe, expect, it } from "vite-plus/test";

import { formatTime } from "../format-time";

describe("formatTime MM:SS helper", () => {
  it("formats zero seconds as 00:00", () => {
    expect.assertions(1);

    // Act
    const formatted = formatTime(0);

    // Assert
    expect(formatted).toBe("00:00");
  });

  it("formats seconds under one minute with zero-padded MM:SS", () => {
    expect.assertions(1);

    // Act
    const formatted = formatTime(45);

    // Assert
    expect(formatted).toBe("00:45");
  });

  it("formats minutes and seconds with leading zeros and floors fractional seconds", () => {
    expect.assertions(3);

    // Act
    const oneFifty = formatTime(110.9);
    const threeOhFive = formatTime(185);
    const overTenMinutes = formatTime(725);

    // Assert
    expect(oneFifty).toBe("01:50");
    expect(threeOhFive).toBe("03:05");
    expect(overTenMinutes).toBe("12:05");
  });

  it("clamps negative and non-finite inputs to 00:00", () => {
    expect.assertions(3);

    // Act
    const negative = formatTime(-15);
    const nanValue = formatTime(Number.NaN);
    const infiniteValue = formatTime(Number.POSITIVE_INFINITY);

    // Assert
    expect(negative).toBe("00:00");
    expect(nanValue).toBe("00:00");
    expect(infiniteValue).toBe("00:00");
  });
});
