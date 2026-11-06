import type { BaseUnit } from "./units";

export type Ingredient = {
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
