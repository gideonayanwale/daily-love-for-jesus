import { useState } from 'react';
import { trpc } from '@/providers/trpc-client';
import { Progress } from '@/components/ui/progress';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

interface MediaUploadProps {
  onUpload: (url: string) => void;
  accept?: string;
  label?: string;
}

type UploadStatus = 'idle' | 'uploading' | 'archiving' | 'done' | 'error';

export default function MediaUpload({
  onUpload,
  accept = 'image/*,video/*,audio/*',
  label = 'Upload Media',
}: MediaUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const uploadUrlMutation = trpc.media.uploadUrl.useMutation();
  const archiveMutation = trpc.media.archiveToSupabase.useMutation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      // Step 1: Get signed upload URL from Cloudinary via tRPC
      const { uploadUrl, fields } = await uploadUrlMutation.mutateAsync({
        fileName: selected.name,
        mimeType: selected.type,
        folder: 'devotionals',
      });

      // Step 2: Build FormData
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      formData.append('file', selected);

      // Step 3: Upload via XMLHttpRequest with progress tracking
      const secureUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response.secure_url as string);
            } catch {
              reject(new Error('Invalid response from upload server'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));

        xhr.open('POST', uploadUrl);
        xhr.send(formData);
      });

      // Step 4: Archive to Supabase
      setStatus('archiving');
      await archiveMutation.mutateAsync({
        cloudinaryUrl: secureUrl,
        fileName: selected.name,
      });

      // Step 5: Notify parent
      setStatus('done');
      setProgress(100);
      onUpload(secureUrl);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }
  };

  const statusLabel: Record<UploadStatus, string> = {
    idle: '',
    uploading: 'Uploading...',
    archiving: 'Archiving to storage...',
    done: 'Upload complete',
    error: '',
  };

  return (
    <div className="space-y-2">
      {/* File input button */}
      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50">
          <Upload className="w-4 h-4" />
          {label}
        </span>
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={status === 'uploading' || status === 'archiving'}
          className="sr-only"
          aria-label={label}
        />
        {file && status !== 'idle' && (
          <span className="text-xs text-zinc-500 max-w-[200px] truncate">{file.name}</span>
        )}
      </label>

      {/* Progress bar */}
      {(status === 'uploading' || status === 'archiving') && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2 w-full max-w-xs" />
          <p className="text-xs text-zinc-500">{statusLabel[status]} {status === 'uploading' ? `${progress}%` : ''}</p>
        </div>
      )}

      {/* Done */}
      {status === 'done' && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Upload complete</span>
        </div>
      )}

      {/* Error */}
      {status === 'error' && errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
