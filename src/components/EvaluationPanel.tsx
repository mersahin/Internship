'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EVAL_CRITERIA } from '@/lib/evaluation';
import { useT } from '@/i18n/client';

interface Evaluation {
  id: string;
  scores: Record<string, number>;
  comment: string | null;
  createdAt: string;
}

// Shows a mentee's evaluation history; mentors/admins can add a new one.
export function EvaluationPanel({ relationId, readOnly = false }: { relationId: string; readOnly?: boolean }) {
  const t = useT();
  const [items, setItems] = useState<Evaluation[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/evaluations?relationId=${relationId}`);
    if (res.ok) setItems((await res.json()).evaluations ?? []);
  }, [relationId]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relationId, scores, comment }),
      });
      if (res.ok) { setScores({}); setComment(''); await load(); }
    } finally {
      setSaving(false);
    }
  };

  const label = (c: string) => (t.evaluation.criteria as Record<string, string>)[c] ?? c;

  return (
    <Card>
      <CardHeader><CardTitle>{t.evaluation.title}</CardTitle></CardHeader>

      {!readOnly && (
        <form onSubmit={submit} className="space-y-3 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EVAL_CRITERIA.map((c) => (
              <label key={c} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-700">{label(c)}</span>
                <select
                  value={scores[c] ?? ''}
                  onChange={(e) => setScores({ ...scores, [c]: Number(e.target.value) })}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="">–</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder={t.evaluation.comment}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <Button type="submit" size="sm" loading={saving} disabled={Object.keys(scores).length === 0}>
            {t.evaluation.add}
          </Button>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-gray-400">{t.evaluation.none}</p>
      ) : (
        <div className="space-y-3">
          {items.map((ev) => (
            <div key={ev.id} className="rounded-lg border border-gray-100 p-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {EVAL_CRITERIA.filter((c) => ev.scores[c]).map((c) => (
                  <span key={c} className="text-gray-700">{label(c)}: <strong>{ev.scores[c]}/5</strong></span>
                ))}
              </div>
              {ev.comment && <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-wrap">{ev.comment}</p>}
              <p className="text-xs text-gray-400 mt-1">{new Date(ev.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
