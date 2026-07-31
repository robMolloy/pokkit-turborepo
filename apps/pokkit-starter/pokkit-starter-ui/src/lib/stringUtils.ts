export const getInitialsFromString = (str: string) =>
  str
    .split(" ")
    .map((x) => x[0])
    .filter((x) => x)
    .join("")
    .slice(0, 3)
    .toUpperCase();
