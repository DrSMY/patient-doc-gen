// GLP-1 / weight-management medication catalog used by the public request
// form and the one-click prescription prefill. Grouped by product, each with
// its selectable dose variants (dose, quantity, instructions).

export interface Glp1Variant {
  dose: string;
  quantity: string;
  instructions: string;
}

export interface Glp1Product {
  product: string;
  variants: Glp1Variant[];
}

const WEEKLY_INJECTION = "Inject subcutaneously once weekly, on the same day each week.";
const WEGOVY_TABLET = "Take orally once daily in the morning on an empty stomach with plain water.";
const FOUNDAYO_TABLET = "Take orally once daily.";
const RYBELSUS_TABLET =
  "Take orally once daily in the morning on an empty stomach with a sip of water.";

export const GLP1_PRODUCTS: Glp1Product[] = [
  {
    product: "Wegovy Injection",
    variants: ["0.25 mg", "0.5 mg", "1 mg", "1.7 mg", "2.4 mg", "7.2 mg"].map(
      (dose) => ({ dose, quantity: "1 pre-filled pen", instructions: WEEKLY_INJECTION }),
    ),
  },
  {
    product: "Wegovy Tablets",
    variants: ["1.5 mg", "4 mg", "9 mg", "25 mg"].map((dose) => ({
      dose,
      quantity: "1 tablet",
      instructions: WEGOVY_TABLET,
    })),
  },
  {
    product: "Mounjaro Injection",
    variants: ["2.5 mg", "5 mg", "7.5 mg", "10 mg", "12.5 mg", "15 mg"].map(
      (dose) => ({ dose, quantity: "1 pre-filled pen", instructions: WEEKLY_INJECTION }),
    ),
  },
  {
    product: "Foundayo Tablets",
    variants: ["0.8 mg", "2.5 mg", "5.5 mg", "9 mg", "14.5 mg", "17.2 mg"].map(
      (dose) => ({ dose, quantity: "1 tablet", instructions: FOUNDAYO_TABLET }),
    ),
  },
  {
    product: "Rybelsus Tablets",
    variants: ["3 mg", "7 mg", "14 mg"].map((dose) => ({
      dose,
      quantity: "1 tablet",
      instructions: RYBELSUS_TABLET,
    })),
  },
];

export function findVariant(product: string, dose: string): Glp1Variant | undefined {
  return GLP1_PRODUCTS.find((p) => p.product === product)?.variants.find(
    (v) => v.dose === dose,
  );
}
