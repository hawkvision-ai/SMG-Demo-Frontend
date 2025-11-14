import React from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  tagInput: string;
  onTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onRemoveTag: (tag: string) => void;
  disabled?: boolean;
  onTagInputFocus?: () => void;
  onTagInputBlur?: () => void;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  tagInput,
  onTagInputChange,
  onTagInputKeyDown,
  onRemoveTag,
  disabled = false,
  onTagInputFocus,
  onTagInputBlur,
}) => {
  return (
    <div className="relative bottom- w-full z-20">
      <div
        className="
          rounded-xl 
          bg-gray-50 
          p-4 
          ring-1 
          ring-gray-200 
          flex 
          flex-wrap
          items-center
          gap-2
        "
      >
        {tags.map((tag, index) => (
          <React.Fragment key={index}>
            <span className="flex items-center rounded-sm bg-teal-100 px-2 py-0.5 text-sm text-teal-800">
              {tag}
              <X
                onClick={() => onRemoveTag(tag)}
                className="ml-1 h-3.5 w-3.5 text-teal-600 hover:text-teal-800 cursor-pointer"
                aria-label={`Remove tag ${tag}`}
              />
            </span>
          </React.Fragment>
        ))}
        
        <Input
          id="tag-input"
          value={tagInput}
          onChange={onTagInputChange}
          onKeyDown={onTagInputKeyDown}
          onFocus={onTagInputFocus}
          onBlur={onTagInputBlur}
          placeholder="Enter to select, or comma (,) to add multiple tags."
          className="flex-1 min-w-[150px]"
          disabled={disabled}
        />
      </div>
    </div>
  );
};