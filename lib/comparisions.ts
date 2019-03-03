const eq = (a: number, b: number) => a === b;
const neq = (a: number, b: number) => a !== b;
const gte = (a: number, b: number) => a >= b;

const lte = (a: number, b: number) => a <= b;
const gt = (a: number, b: number) => a > b;

const lt = (a: number, b: number) => a < b;

export const COMPARISIONS: {
  [key: string]: (a: number, b: number) => boolean;
} = {
  "==": eq,
  ">=": gte,
  "<=": lte,
  "!=": neq,
  ">": gt,
  "<": lt,
  eq,
  gte,
  lte,
  neq,
  gt,
  lt
};
