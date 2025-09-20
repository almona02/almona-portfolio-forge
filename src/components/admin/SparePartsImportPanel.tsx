import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { importSpareParts } from '@/utils/excelImport';
import { toast } from 'sonner';

type TargetTable = 'products' | 'spare_parts';

const human = {
  products: 'Products (category = spare_part)',
  spare_parts: 'Dedicated Spare Parts table',
} as const;

export const SparePartsImportPanel: React.FC = () => {
  const [target, setTarget] = useState<TargetTable>('products');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  }, []);

  const onImport = useCallback(async () => {
    if (!file) {
      toast.info('Please choose an .xlsx file first.');
      return;
    }
    setBusy(true);
    const tid = toast.loading('Importing spare parts…');
    try {
      const { success, errors } = await importSpareParts(file, { useDedicatedTable: target === 'spare_parts' });
      if (success) {
        toast.success('Import completed successfully.', { id: tid });
      } else {
        toast.error(`Import completed with ${errors.length} error(s). Check console for details.`, { id: tid });
      }
    } catch (err) {
      toast.error((err as Error).message || 'Import failed', { id: tid });
    } finally {
      setBusy(false);
    }
  }, [file, target]);

  return (
    <Card className="mb-6">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Target</label>
            <Select value={target} onValueChange={(v) => setTarget(v as TargetTable)}>
              <SelectTrigger>
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="products">{human.products}</SelectItem>
                <SelectItem value="spare_parts">{human.spare_parts}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Choose whether to import into Products (as category = spare_part) or the dedicated spare_parts table.
            </p>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Excel file (.xlsx)</label>
            <input type="file" accept=".xlsx,.xls" onChange={onFileChange} className="block w-full text-sm" />
          </div>

          <div className="flex-none">
            <Button disabled={!file || busy} onClick={onImport}>
              {busy ? 'Importing…' : 'Start Import'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SparePartsImportPanel;
