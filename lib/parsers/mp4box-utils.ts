// mp4box logs "[BoxParser] Invalid box type: ..." for unrecognised QuickTime boxes
// (e.g. ©xyz GPS metadata). These are harmless but pollute the console and the
// Next.js dev overlay. Wrap any mp4box operation with this to silence them.
export function suppressMp4BoxErrors(): () => void {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[1] === "string" && args[1].includes("[BoxParser]") && 
      typeof args[2] === "string" && args[2].includes("Invalid box type:")
    ) return;
    originalError(...args);
  };
  return () => {
    console.error = originalError;
  };
}
