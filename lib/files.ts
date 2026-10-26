const allowed = new Map([
  ['application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2d]],
  ['image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ['image/jpeg', [0xff, 0xd8, 0xff]],
]);
export async function validateDocument(value: unknown): Promise<{file: File; bytes: ArrayBuffer}> {
  if (!(value instanceof File) || !allowed.has(value.type) || value.size < 1 || value.size > 10 * 1024 * 1024) {
    throw new Error('Choose a PDF, JPEG or PNG between 1 byte and 10 MB');
  }
  const bytes = await value.arrayBuffer();
  const signature = allowed.get(value.type)!;
  if (!signature.every((byte, i) => new Uint8Array(bytes)[i] === byte)) {
    throw new Error('The file contents do not match its PDF or image format');
  }
  return {file: value, bytes};
}
