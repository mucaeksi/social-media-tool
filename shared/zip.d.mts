export function createZip(
  entries: { name: string; bytes: string | Uint8Array }[],
): Uint8Array;
export function readZip(
  bytes: Uint8Array,
): { name: string; bytes: Uint8Array }[];
