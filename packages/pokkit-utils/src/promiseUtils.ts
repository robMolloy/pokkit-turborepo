import { execAsync } from "./cliUtils";

export const killProcessByPortNumber = async (portNumber: number) => {
  try {
    const result = await execAsync(
      `kill -15 $(lsof -tiTCP:"${portNumber}" -sTCP:LISTEN 2>/dev/null | head -n 1) 2>/dev/null || true`,
    );
    return { success: true, data: result } as const;
  } catch (error) {
    return { success: false, error } as const;
  }
};
