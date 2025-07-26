
import React from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/shared/ui/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/ui/popover';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectProps {
  options: { label: string; value: string }[];
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
  placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onSelectedChange,
  placeholder = 'Select options...',
}) => {
  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onSelectedChange(selected.filter((item) => item !== value));
    } else {
      onSelectedChange([...selected, value]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between bg-almona-dark border-almona-light"
        >
          <div className="flex flex-wrap gap-1">
            {selected.length === 0 ? (
              <span className="text-gray-400">{placeholder}</span>
            ) : (
              selected.map((value) => {
                const option = options.find((o) => o.value === value);
                return (
                  <Badge key={value} variant="secondary" className="flex items-center gap-1">
                    {option?.label}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(value);
                      }}
                    />
                  </Badge>
                );
              })
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-almona-darker border-almona-light">
        <Command>
          <CommandInput placeholder="Search options..." className="bg-almona-dark border-almona-light" />
          <CommandEmpty>No options found.</CommandEmpty>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={() => handleSelect(option.value)}
                className="cursor-pointer hover:bg-almona-dark"
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selected.includes(option.value) ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
