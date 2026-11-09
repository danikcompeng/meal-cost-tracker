import type { Macros } from "./macros";
import type { BaseUnit } from "./units";

/** Calories and macros are per 100 g, per 100 ml, or per 1 item ("each"). */
export type Food = Macros & {
  id: string;
  name: string;
  price: number;
  package_size: number;
  unit: BaseUnit;
};

/** What a form action sends back to the form after it runs. */
export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};
