import { ChipGroup, Field } from "./fields";

/** Labeled chip group — the standard style/option picker for every tool. */
export function StyleSelector({
  label = "Style",
  options,
  value,
  onChange,
}: {
  label?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <ChipGroup options={options} value={value} onChange={onChange} />
    </Field>
  );
}
