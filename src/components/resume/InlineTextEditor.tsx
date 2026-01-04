/**
 * Inline Text Editor Component
 * Allows users to edit text directly in the preview (Canva-style)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InlineTextEditorProps {
  value: string;
  onSave: (newValue: string) => void;
  onCancel?: () => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  children?: React.ReactNode; // Display content when not editing
}

export function InlineTextEditor({
  value,
  onSave,
  onCancel,
  className = '',
  placeholder = 'Enter text...',
  multiline = false,
  children,
}: InlineTextEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    if (onCancel) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  if (isEditing) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder={placeholder}
            className="min-w-[200px] px-2 py-1 border border-primary rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder={placeholder}
            className="min-w-[200px] px-2 py-1 border border-primary rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        )}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            className="h-7 w-7 p-0"
          >
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-7 w-7 p-0"
          >
            <X className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <span
      className={`group relative cursor-pointer hover:bg-primary/5 rounded px-1 transition-colors ${className}`}
      onClick={handleStartEdit}
      title="Click to edit"
    >
      {children || value}
      <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 absolute -top-1 -right-1 bg-background border rounded p-0.5 text-primary transition-opacity" />
    </span>
  );
}

