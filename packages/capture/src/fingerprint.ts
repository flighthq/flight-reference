type NormalizedValue =
  | null
  | boolean
  | number
  | string
  | NormalizedValue[]
  | {
      [key: string]: NormalizedValue;
    };

function normalize(value: unknown): NormalizedValue {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value;
  }

  if (value === undefined) {
    return {
      $undefined: true
    };
  }

  if (typeof value === "bigint") {
    return {
      $bigint: value.toString()
    };
  }

  if (typeof value === "function") {
    return {
      $function: value.name || "anonymous"
    };
  }

  if (typeof value === "symbol") {
    return {
      $symbol: value.description || ""
    };
  }

  if (value instanceof Date) {
    return {
      $date: value.toISOString()
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }

  if (value instanceof Set) {
    return {
      $set: Array.from(value, (item) => normalize(item))
    };
  }

  if (value instanceof Map) {
    return {
      $map: Array.from(value.entries())
        .sort(([left], [right]) => String(left).localeCompare(String(right)))
        .map(([key, entryValue]) => [String(key), normalize(entryValue)])
    };
  }

  if (ArrayBuffer.isView(value)) {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

    return {
      $typedArray: Array.from(bytes)
    };
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));

  return Object.fromEntries(entries.map(([key, entryValue]) => [key, normalize(entryValue)]));
}

function hashChunk(input: string, seed: number): string {
  let hash = seed >>> 0;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 2246822519) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

export function fingerprintValue(value: unknown): string {
  const payload = JSON.stringify(normalize(value));
  return [
    2166136261,
    1597334677,
    3812015801,
    958282187,
    1103547991,
    2654435761,
    2246822519,
    3266489917
  ]
    .map((seed) => hashChunk(payload, seed))
    .join("");
}
