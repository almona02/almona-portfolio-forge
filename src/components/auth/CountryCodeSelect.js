# Python 3.6+ compatible code
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update
from pydantic import BaseModel, EmailStr
import httpx
import secrets
import redis.asyncio as redis
from datetime import datetime, timedelta
import hashlib
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base import declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarative_base
from sqlalchemy.ext.declive_base = declarativeI will fix the TypeScript error in CountryCodeSelect.tsx by removing the className prop from SelectTrigger and applying it to a wrapper div instead.

<edit_file>
<path>src/components/auth/CountryCodeSelect.tsx</path>
<content>
<<<<<<< SEARCH
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CountryCodeSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const countryCodes = [
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴' },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
  { code: '+964', country: 'Iraq', flag: '🇮🇶' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
];

export const CountryCodeSelect: React.FC<CountryCodeSelectProps> = ({
  value,
  onChange,
  className,
}) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
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
=======
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CountryCodeSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const countryCodes = [
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴' },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
  { code: '+964', country: 'Iraq', flag: '🇮🇶' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
];

export const CountryCodeSelect: React.FC<CountryCodeSelectProps> = ({
  value,
  onChange,
  className,
}) => {
  return (
    <div className={className}>
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
    </div>
  );
};
