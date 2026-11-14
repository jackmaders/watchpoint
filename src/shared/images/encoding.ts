function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const rawBase64 = base64.replace(/^data:[^;]+;base64,/iu, "");
  const binary = atob(rawBase64);
  return Uint8Array.from(binary, (char) => Number(char.codePointAt(0))).buffer;
}

export { decodeBase64ToArrayBuffer };
