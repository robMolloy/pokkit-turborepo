export const safeJsonParse = (str: string) => {
  try {
    const json = JSON.parse(str) as unknown;
    return { success: true, data: json } as const;
  } catch (error) {
    return { success: false, error } as const;
  }
};

export const delay = async (x: number) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), x);
  });
};

export const formatDateForPb = (date: Date) => date.toISOString().replace("T", " ");
