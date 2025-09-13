import React from 'react';
import { useQuoteLookup } from '@/hooks/useQuoteLookup';
import { Input } from '@/shared/ui/ui/input';
import { Badge } from '@/shared/ui/ui/badge';

interface Props {
  onSelect?: (id: string) => void;
  className?: string;
}

export const QuoteTwinSearchPanel: React.FC<Props> = ({ onSelect, className }) => {
  const { query, setQuery, results, isLoading, error } = useQuoteLookup();

  return (
    <div className={className}>      
      <div className="mb-3">
        <Input
          placeholder="Search quote #, digital twin, or portal reference..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      {isLoading && <p className="text-sm text-gray-400">Searching...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!isLoading && !error && results.length === 0 && query.length >= 2 && (
        <p className="text-sm text-gray-500">No matches.</p>
      )}
      <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {results.map(r => (
          <li
            key={r.id}
            className="p-3 rounded bg-almona-dark hover:bg-almona-darker cursor-pointer transition"
            onClick={() => onSelect?.(r.id)}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Quote {r.quote_number}</p>
                <p className="text-xs text-gray-400">
                  {r.digital_twin_code || 'No twin'} • {r.portal_reference || 'No ref'}
                </p>
              </div>
              <Badge variant="outline" className="border-orange-500 text-orange-400">
                {r.status}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-gray-500 flex justify-between">
              <span>{new Date(r.created_at).toLocaleDateString()}</span>
              <span>
                {typeof r.total_amount === 'number'
                  ? r.total_amount.toLocaleString() + ' EGP'
                  : 'Pending'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
