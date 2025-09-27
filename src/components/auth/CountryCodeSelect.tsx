import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Country Code Select Component
 * 
 * A dropdown component for selecting international country codes with flags.
 * Features:
 * - Pre-configured list of Middle Eastern and international country codes
 * - Visual flag emojis for easy identification
 * - Supports common countries in the region (Saudi Arabia, UAE, Egypt, etc.)
 * - Used in forms requiring international phone number input
 * 
 * @param value - Currently selected country code (e.g., "+966")
 * @param onChange - Callback function when selection changes
 * @param className - Optional CSS class for styling
 */

interface CountryCodeSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const countryCodes = [
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+962", country: "Jordan", flag: "🇯🇴" },
  { code: "+961", country: "Lebanon", flag: "🇱🇧" },
  { code: "+964", country: "Iraq", flag: "🇮🇶" },
  { code: "+1", country: "USA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
];

export const CountryCodeSelect: React.FC<CountryCodeSelectProps> = ({
  value,
  onChange,
  className: _className,
}) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {countryCodes.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <span className="flex items-center">
              <span className="mr-2">{country.flag}</span>
              <span>{country.code}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
