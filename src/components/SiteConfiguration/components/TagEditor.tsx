import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TagEditorProps {
  label?: string;
  tags: string[];
  canEdit?: boolean;
  showEditButton?: boolean;
  onChange?: (tags: string[]) => void;
  labelClass?: string;
  editMode?: boolean;
  alwaysShowInput?: boolean; // Always show input field without edit button
  tagColorScheme?: "blue" | "green" | "teal"; // Basic color options
}

export const TagEditor = ({
  label,
  tags = [],
  canEdit = false,
  showEditButton = false,
  onChange,
  labelClass,
  editMode = false,
  alwaysShowInput = false,
  tagColorScheme = "green",
}: TagEditorProps) => {
  const [tagInput, setTagInput] = useState("");
  const [localTags, setLocalTags] = useState(tags);
  const [isEditing, setIsEditing] = useState(editMode);

  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  const updateTags = (newTags: string[]) => {
    setLocalTags(newTags);
    onChange?.(newTags);
  };

  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.endsWith(",") || value.endsWith(" ") || value.endsWith("#")) {
      const newTag = value.slice(0, -1).trim();
      if (newTag && !localTags.includes(newTag)) {
        updateTags([...localTags, newTag]);
      }
      setTagInput("");
    } else {
      setTagInput(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!localTags.includes(newTag)) {
        updateTags([...localTags, newTag]);
      }
      setTagInput("");
    } else if (e.key === "Backspace" && tagInput === "" && localTags.length > 0) {
      // Remove the last tag when backspace is pressed and input is empty
      const newTags = [...localTags];
      newTags.pop();
      updateTags(newTags);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const filtered = localTags.filter((tag) => tag !== tagToRemove);
    updateTags(filtered);
  };

  const handleEditToggle = () => {
    setIsEditing((prev) => !prev);
  };

  // Determine tag color classes based on color scheme
  const getTagColorClasses = () => {
    const colorMap = {
      blue: "bg-blue-100 text-blue-800",
      green: "bg-green-100 text-green-800",
      teal: "bg-teal-100 text-teal-800",
    };

    if (canEdit && isEditing) {
      return "bg-blue-200 text-blue-800";
    }

    return colorMap[tagColorScheme];
  };

  const showInput = (canEdit && isEditing) || alwaysShowInput;

  return (
    <div className="mt-2">
      <div className="mb-2 flex items-center justify-between">
        {label && <label className={labelClass || "text-sm font-medium"}>{label}</label>}

        {showEditButton && canEdit && !alwaysShowInput && (
          <Button
            type="button"
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            onClick={handleEditToggle}
          >
            {isEditing ? <Check size={16} /> : <Pencil size={16} />}
          </Button>
        )}
      </div>

      <div className="flex min-h-[2.5rem] flex-wrap gap-2 rounded border border-gray-200 p-2">
        {localTags.map((tag, index) => (
          <span
            key={index}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm ${getTagColorClasses()}`}
          >
            {tag}
            {(canEdit && isEditing) || alwaysShowInput ? (
              <Button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 text-red-500 hover:text-red-700"
              >
                &times;
              </Button>
            ) : null}
          </span>
        ))}

        {showInput && (
          <Input
            value={tagInput}
            onChange={handleTagInput}
            onKeyDown={handleKeyDown}
            placeholder="Type and press space, comma or enter"
            className="min-w-[3rem] flex-1 border-none outline-none focus:ring-0"
          />
        )}
      </div>
    </div>
  );
};
