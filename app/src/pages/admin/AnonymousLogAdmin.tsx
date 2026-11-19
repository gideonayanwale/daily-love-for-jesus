import { useState, useEffect } from 'react';
import { trpc } from '@/providers/trpc';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

type LogRow = {
  id: number;
  ipAddress: string | null;
  resourceId: string | null;
  userAgent: string | null;
  metadata: unknown;
  occurredAt: Date;
};

export default function AnonymousLogAdmin() {
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<LogRow[]>([]);

  type LogQueryResult = { items: LogRow[]; total: number } | undefined;
  const { data, isLoading, isFetching } = trpc.anonymousLog.list.useQuery(
    { limit: 50, offset },
    { placeholderData: (prev: LogQueryResult) => prev }
  );

  // Accumulate rows across pages
  useEffect(() => {
    if (!data?.items) return;
    if (offset === 0) {
      setRows(data.items as LogRow[]);
    } else {
      setRows((prev) => [...prev, ...(data.items as LogRow[])]);
    }
  }, [data, offset]);

  const total = data?.total ?? 0;
  const hasMore = rows.length < total;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Anonymous visitor log — {total} total {total === 1 ? 'entry' : 'entries'}
        </p>
      </div>

      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0c0c0f]">
        {isLoading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-10">
            No anonymous visits recorded.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200 dark:border-zinc-800">
                <TableHead className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                  Date / Time
                </TableHead>
                <TableHead className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                  IP Address
                </TableHead>
                <TableHead className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                  Page
                </TableHead>
                <TableHead className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                  User Agent
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-zinc-100 dark:border-zinc-800 text-sm"
                >
                  <TableCell className="text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                    {format(new Date(row.occurredAt), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {row.ipAddress ?? '—'}
                  </TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate">
                    {row.resourceId ?? '—'}
                  </TableCell>
                  <TableCell className="text-zinc-500 dark:text-zinc-400 text-xs">
                    {row.userAgent
                      ? row.userAgent.length > 60
                        ? `${row.userAgent.slice(0, 60)}...`
                        : row.userAgent
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            onClick={() => setOffset((prev) => prev + 50)}
            disabled={isFetching}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950"
          >
            {isFetching ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
