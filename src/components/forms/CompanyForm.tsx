'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2 } from 'lucide-react';

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  description: z.string().optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  industry: z.string().optional(),
  needs: z.array(
    z.object({
      position: z.string().min(1, 'Position is required'),
      count: z.coerce.number().int().min(1, 'Count must be at least 1'),
      period: z.string().min(1, 'Period is required'),
    })
  ).optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyFormProps {
  defaultValues?: Partial<CompanyFormData>;
  onSubmit: (data: CompanyFormData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export function CompanyForm({ defaultValues, onSubmit, onCancel, isEditing }: CompanyFormProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: defaultValues || { needs: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'needs' });

  const handleFormSubmit = handleSubmit(async (data) => {
    setLoading(true);
    setError('');
    try {
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Company Name"
          required
          {...register('name')}
          error={errors.name?.message}
        />
        <Input
          label="Industry"
          placeholder="e.g. Technology, Finance"
          {...register('industry')}
          error={errors.industry?.message}
        />
      </div>

      <Input
        label="Contact Email"
        type="email"
        {...register('contactEmail')}
        error={errors.contactEmail?.message}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Brief description of the company..."
          className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors"
        />
      </div>

      {/* Company Needs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">Internship Needs</label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => append({ position: '', count: 1, period: '' })}
          >
            <Plus className="h-4 w-4" />
            Add Need
          </Button>
        </div>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <Input
                  placeholder="Position (e.g. Frontend Developer)"
                  {...register(`needs.${index}.position`)}
                  error={errors.needs?.[index]?.position?.message}
                />
              </div>
              <div className="w-20">
                <Input
                  type="number"
                  placeholder="Count"
                  min={1}
                  {...register(`needs.${index}.count`)}
                  error={errors.needs?.[index]?.count?.message}
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Period (e.g. Summer 2025)"
                  {...register(`needs.${index}.period`)}
                  error={errors.needs?.[index]?.period?.message}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="mt-2.5 text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
              No needs added yet. Click &quot;Add Need&quot; to add internship positions.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEditing ? 'Update Company' : 'Create Company'}
        </Button>
      </div>
    </form>
  );
}
