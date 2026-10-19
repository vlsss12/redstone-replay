// Validate physical boundaries before the official parser traverses untrusted counts.
// Field widths match @redstone-finance/protocol 1.0.0 redstone-constants.
export function validatePayloadLayout(bytes) {
  let end = bytes.length - 9;
  const take = (count) => {
    if (!Number.isSafeInteger(count) || count < 0 || count > end)
      throw new Error(
        "The RedStone payload is truncated or has invalid field lengths.",
      );
    const start = end - count;
    const value = bytes.subarray(start, end);
    end = start;
    return value;
  };
  const number = (count) => [...take(count)].reduce((n, b) => n * 256 + b, 0);
  const metadataLength = number(3);
  take(metadataLength);
  const packageCount = number(2);
  if (!packageCount || packageCount > 500)
    throw new Error(
      "The payload package count is empty or exceeds the 500-package inspection limit.",
    );
  let observations = 0;
  for (let i = 0; i < packageCount; i++) {
    take(65);
    const points = number(3);
    const valueBytes = number(4);
    take(6);
    if (!points || !valueBytes || valueBytes > 32)
      throw new Error(
        "Only non-empty numeric observations of up to 32 bytes are supported.",
      );
    observations += points;
    if (observations > 4096)
      throw new Error(
        "The payload exceeds the 4096-observation inspection limit.",
      );
    take(points * (32 + valueBytes));
  }
}
