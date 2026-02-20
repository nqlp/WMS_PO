import { CURRENCIES } from "@/lib/constants";

export function CurrencyOptions() {
  return (
    <>
      {CURRENCIES.map((currency) => (
        <s-option key={currency} value={currency}>
          {currency}
        </s-option>
      ))}
    </>
  );
}
