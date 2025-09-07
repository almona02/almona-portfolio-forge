import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useTranslation } from '@/hooks/useTranslation';

type FormData = {
  serialNumber: string;
};

type ValidationResult = {
  is_valid: boolean;
  model_code?: string;
  warranty_status?: string;
  production_date?: string;
};

type Props = {
  onSubmit: (data: { serialNumber: string; yilmaz_validation: ValidationResult }) => void;
};

export const YilmazMachineRegistration: React.FC<Props> = ({ onSubmit }) => {
  const { register, handleSubmit, setValue } = useForm<FormData>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedData, setValidatedData] = useState<ValidationResult | null>(null);

  const validateSerial = async (serial: string) => {
    setValidationError(null);
    setValidatedData(null);
    setLoading(true);
    try {
      const resp = await axios.post('/api/v2/yilmaz/validate-serial', {
        serial_number: serial,
        region: 'egypt',
      });
      if (resp.data && resp.data.is_valid) {
        setValidatedData(resp.data as ValidationResult);
        setValue('serialNumber', serial);
      } else {
        setValidationError(t('yilmazValidation.invalidSerial'));
      }
    } catch (_err) {
      setValidationError(t('yilmazValidation.invalidSerial'));
    } finally {
      setLoading(false);
    }
  };

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onFormSubmit = async (data: FormData) => {
    if (!validatedData) {
      setValidationError(t('yilmazValidation.invalidSerial'));
      return;
    }

    setSubmitting(true);
    setSuccessMessage(null);
    try {
      const resp = await axios.post('/api/v2/yilmaz/register', {
        serial_number: data.serialNumber,
        region: 'egypt',
        model_code: validatedData.model_code,
        production_date: validatedData.production_date,
        warranty_expiry: validatedData.warranty_status,
      });

      if (resp.data && resp.data.success) {
        setSuccessMessage(t('yilmazValidation.success'));
        onSubmit({ serialNumber: data.serialNumber, yilmaz_validation: validatedData });
      } else {
        setValidationError(t('yilmazValidation.invalidSerial'));
      }
    } catch (_err) {
      setValidationError(t('yilmazValidation.invalidSerial'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 bg-almona-darker/50 p-6 rounded-lg">
  <h3 className="text-xl font-semibold">{t('yilmazRegistration.title')}</h3>
      <div className="flex items-center gap-2">
        <input
          {...register('serialNumber')}
          type="text"
          placeholder={t('yilmazRegistration.serialNumberLabel')}
          className="flex-1 px-3 py-2 rounded bg-almona-dark border border-almona-light/20"
        />
        <button
          type="button"
          onClick={async () => {
            const val = (document.querySelector('input[name="serialNumber"]') as HTMLInputElement)?.value;
            if (val) await validateSerial(val);
          }}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-400 rounded text-black"
        >
          {loading ? <span className="loader" /> : t('yilmazRegistration.validateButton')}
        </button>
      </div>

  {validationError && <p className="text-red-400">{validationError}</p>}

      {validatedData && (
        <div className="bg-almona-dark/60 p-4 rounded">
          <p>{t('yilmazValidation.success')}</p>
          <p className="text-sm">Model: {validatedData?.model_code}</p>
          <p className="text-sm">Warranty: {validatedData?.warranty_status}</p>
          <p className="text-sm">Production Date: {validatedData?.production_date}</p>
        </div>
      )}

      {successMessage && <p className="text-green-400">{successMessage}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!validatedData || submitting}
          className={`px-4 py-2 rounded ${validatedData ? 'bg-emerald-500' : 'bg-gray-600 cursor-not-allowed'}`}
        >
          {submitting ? <span className="loader" /> : t('yilmazRegistration.title')}
        </button>
      </div>
    </form>
  );
};

export default YilmazMachineRegistration;
