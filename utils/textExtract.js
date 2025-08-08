import mammoth from "mammoth";
export async function extractTextFromBuffer(filename, buffer) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt")) return buffer.toString("utf-8");
  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }
  throw new Error("Unsupported file type. Use .txt or .docx");
}
