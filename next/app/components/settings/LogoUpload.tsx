'use client';

import { useRef } from 'react';
import { Button } from '@heroui/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Upload04Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { resizeImage } from '@/lib/escpos';

interface LogoUploadProps {
  logo?: string;
  onLogoChange: (logo: string | undefined) => void;
}

const MAX_LOGO_SIZE = 100 * 1024; // 100KB
const MAX_LOGO_WIDTH = 384; // For 80mm paper

export function LogoUpload({ logo, onLogoChange }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size
    if (file.size > MAX_LOGO_SIZE) {
      alert('Image must be under 100KB');
      return;
    }

    // Read and resize image
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      try {
        const resized = await resizeImage(dataUrl, MAX_LOGO_WIDTH);
        onLogoChange(resized);
      } catch (error) {
        console.error('Failed to process image:', error);
        onLogoChange(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onLogoChange(undefined);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Logo</label>

      <div className="flex items-center gap-4">
        {logo ? (
          <div className="bg-white p-2 border rounded">
            <img
              src={logo}
              alt="Receipt logo"
              className="max-w-[150px] max-h-[60px] object-contain"
            />
          </div>
        ) : (
          <div className="w-[150px] h-[60px] border-2 border-dashed border-default-300 rounded flex items-center justify-center text-default-400 text-sm">
            No logo
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="flat"
            onPress={() => inputRef.current?.click()}
            startContent={<HugeiconsIcon icon={Upload04Icon} className="h-4 w-4" />}
          >
            Upload
          </Button>

          {logo && (
            <Button
              size="sm"
              variant="light"
              color="danger"
              onPress={handleRemove}
              startContent={<HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />}
            >
              Remove
            </Button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <p className="text-xs text-default-400">
        Recommended: PNG, max 384px wide, under 100KB
      </p>
    </div>
  );
}
