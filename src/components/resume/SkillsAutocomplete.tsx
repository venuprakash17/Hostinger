import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkillsAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  category: string;
  placeholder?: string;
  className?: string;
}

// Skill suggestions by category
const SKILL_SUGGESTIONS: Record<string, string[]> = {
  technical: [
    "Python", "JavaScript", "Java", "C++", "C#", "TypeScript", "React", "Node.js", "Angular", "Vue.js",
    "Django", "Flask", "Express", "Spring Boot", "Laravel", "ASP.NET", "SQL", "PostgreSQL", "MySQL", "MongoDB",
    "Redis", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git", "Jenkins", "CI/CD", "Linux",
    "REST API", "GraphQL", "Microservices", "Machine Learning", "Data Science", "TensorFlow", "PyTorch",
    "Pandas", "NumPy", "Scikit-learn", "HTML", "CSS", "SASS", "Bootstrap", "Tailwind CSS", "Material-UI",
    "GitHub", "GitLab", "Bitbucket", "JIRA", "Confluence", "Agile", "Scrum", "DevOps", "Terraform",
    "Ansible", "Prometheus", "Grafana", "ELK Stack", "Splunk", "Kafka", "RabbitMQ", "Elasticsearch",
    "NoSQL", "Cassandra", "DynamoDB", "Firebase", "Supabase", "Heroku", "Vercel", "Netlify",
    "Webpack", "Vite", "Babel", "ESLint", "Prettier", "Jest", "Cypress", "Selenium", "Postman",
    "Swagger", "OAuth", "JWT", "OAuth2", "GraphQL", "REST", "SOAP", "XML", "JSON", "YAML",
    "Shell Scripting", "Bash", "PowerShell", "Nginx", "Apache", "CDN", "Load Balancing"
  ],
  soft: [
    "Communication", "Leadership", "Teamwork", "Problem Solving", "Critical Thinking", "Time Management",
    "Project Management", "Agile Methodology", "Scrum", "Kanban", "Conflict Resolution", "Negotiation",
    "Public Speaking", "Presentation Skills", "Writing", "Active Listening", "Empathy", "Adaptability",
    "Creativity", "Innovation", "Analytical Thinking", "Strategic Planning", "Decision Making",
    "Customer Service", "Stakeholder Management", "Mentoring", "Coaching", "Cross-functional Collaboration",
    "Remote Work", "Multitasking", "Organization", "Attention to Detail", "Work Ethic", "Professionalism",
    "Emotional Intelligence", "Cultural Awareness", "Diversity & Inclusion", "Work-Life Balance",
    "Self-motivation", "Initiative", "Accountability", "Reliability", "Persistence", "Resilience",
    "Flexibility", "Open-mindedness", "Continuous Learning", "Growth Mindset", "Feedback Reception",
    "Change Management", "Risk Management", "Quality Assurance", "Documentation", "Training & Development"
  ],
  languages: [
    "English", "Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Chinese (Mandarin)",
    "Japanese", "Korean", "Arabic", "Hindi", "Bengali", "Urdu", "Punjabi", "Tamil", "Telugu", "Marathi",
    "Gujarati", "Kannada", "Malayalam", "Dutch", "Polish", "Turkish", "Vietnamese", "Thai", "Indonesian",
    "Swedish", "Norwegian", "Danish", "Finnish", "Greek", "Czech", "Romanian", "Hungarian", "Bulgarian",
    "Croatian", "Serbian", "Slovak", "Slovenian", "Estonian", "Latvian", "Lithuanian", "Ukrainian",
    "Hebrew", "Persian (Farsi)", "Malay", "Tagalog", "Swahili", "Yoruba", "Zulu", "Afrikaans",
    "Amharic", "Somali", "Hausa", "Igbo", "Bengali", "Nepali", "Sinhala", "Burmese", "Khmer", "Lao"
  ]
};

export function SkillsAutocomplete({
  value,
  onChange,
  category,
  placeholder = "Enter skills separated by commas...",
  className
}: SkillsAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSelectingRef = useRef(false);

  // Sync with external value changes, but avoid unnecessary updates
  useEffect(() => {
    if (value !== inputValue && !isSelectingRef.current) {
      setInputValue(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Memoize suggestions to prevent recalculation
  const suggestions = useMemo(() => {
    return category ? (SKILL_SUGGESTIONS[category] || []) : [];
  }, [category]);

  // Memoize current skills parsing to prevent recalculation
  const currentSkills = useMemo(() => {
    return (inputValue || "").split(",").map(s => s.trim()).filter(Boolean);
  }, [inputValue]);

  // Create a Set for faster lookups - memoized
  const currentSkillsSet = useMemo(() => {
    return new Set(currentSkills.map(s => s.toLowerCase()));
  }, [currentSkills]);

  // Memoize filtered suggestions with stable array reference
  const filteredSuggestions = useMemo(() => {
    if (!category || !inputValue || inputValue.trim() === "") return [];
    
    const lastPart = inputValue.split(",").pop()?.trim() || "";
    const searchTerm = lastPart.toLowerCase();
    
    if (searchTerm.length === 0) return [];

    const filtered = suggestions.filter(
      skill => {
        const skillLower = skill.toLowerCase();
        return skillLower.includes(searchTerm) && !currentSkillsSet.has(skillLower);
      }
    ).slice(0, 10);
    
    return filtered;
  }, [inputValue, suggestions, currentSkillsSet, category]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    
    // Show suggestions if there's text in the last part
    const parts = newValue.split(",");
    const lastPart = parts[parts.length - 1].trim();
    if (lastPart.length > 0 && category) {
      setOpen(true);
    } else if (lastPart.length === 0) {
      setOpen(false);
    }
  }, [onChange, category]);

  const handleSelectSuggestion = useCallback((suggestion: string) => {
    isSelectingRef.current = true;
    const parts = inputValue.split(",").map(s => s.trim()).filter(Boolean);
    // Remove the last incomplete part and add the selected suggestion
    if (parts.length > 0 && parts[parts.length - 1] !== suggestion) {
      parts[parts.length - 1] = suggestion;
    } else {
      parts.push(suggestion);
    }
    const newValue = parts.join(", ");
    setInputValue(newValue);
    onChange(newValue);
    
    // Close dropdown immediately
    setOpen(false);
    
    // Reset flag and focus after a brief delay
    setTimeout(() => {
      isSelectingRef.current = false;
      inputRef.current?.focus();
    }, 100);
  }, [inputValue, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }

    // Enter key: add current typed text as skill if it's not empty
    if (e.key === "Enter") {
      e.preventDefault();
      const parts = inputValue.split(",").map(s => s.trim()).filter(Boolean);
      const currentTyping = inputValue.split(",").pop()?.trim() || "";
      
      // If there's text being typed and it's not already in the list
      if (currentTyping && !parts.includes(currentTyping)) {
        const newValue = [...parts, currentTyping].join(", ");
        setInputValue(newValue);
        onChange(newValue);
        setOpen(false);
      } else if (filteredSuggestions.length > 0) {
        // If suggestions are open, select the first one
        handleSelectSuggestion(filteredSuggestions[0]);
      }
      return;
    }

    // Comma key: add current typed text and continue
    if (e.key === ",") {
      e.preventDefault();
      const parts = inputValue.split(",").map(s => s.trim()).filter(Boolean);
      const currentTyping = inputValue.split(",").pop()?.trim() || "";
      
      // If there's text being typed and it's not already in the list
      if (currentTyping && !parts.includes(currentTyping)) {
        const newValue = [...parts, currentTyping].join(", ") + ", ";
        setInputValue(newValue);
        onChange(newValue);
        setOpen(false);
      } else {
        // Just add comma and space
        const newValue = inputValue.trim() + ", ";
        setInputValue(newValue);
        onChange(newValue);
        setOpen(false);
      }
      return;
    }
  }, [inputValue, onChange, filteredSuggestions, handleSelectSuggestion]);

  const handleFocus = useCallback(() => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    
    if (inputValue && category) {
      const lastPart = inputValue.split(",").pop()?.trim();
      if (lastPart && lastPart.length > 0 && filteredSuggestions.length > 0) {
        setOpen(true);
      }
    }
  }, [inputValue, category, filteredSuggestions.length]);

  const handleBlur = useCallback(() => {
    // Delay to allow suggestion click
    blurTimeoutRef.current = setTimeout(() => {
      // Only close if not selecting
      if (!isSelectingRef.current) {
        setOpen(false);
      }
    }, 200);
  }, []);

  // Handle controlled open state to prevent flicker
  const handleOpenChange = useCallback((newOpen: boolean) => {
    // Don't interfere with internal state management
    if (!isSelectingRef.current) {
      // Only allow controlled closing when no suggestions
      if (!newOpen && filteredSuggestions.length === 0) {
        setOpen(false);
      }
    }
  }, [filteredSuggestions.length]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  // Determine if dropdown should be open - only show when there are suggestions
  const shouldOpen = open && filteredSuggestions.length > 0 && category;

  return (
    <Popover open={shouldOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={className}
        />
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Prevent closing when clicking inside the popover
          const target = e.target as HTMLElement;
          if (target.closest('[role="listbox"]') || target.closest('[cmdk-list]')) {
            e.preventDefault();
          }
        }}
      >
        <Command shouldFilter={false}>
          <CommandList>
            <CommandEmpty>No matching skills found. Type your own skill and press Enter or comma to add.</CommandEmpty>
            {filteredSuggestions.length > 0 && (
              <CommandGroup heading={`${filteredSuggestions.length} matching ${category || 'skill'}${filteredSuggestions.length > 1 ? 's' : ''}`}>
                {filteredSuggestions.map((skill) => {
                  const isSelected = currentSkillsSet.has(skill.toLowerCase());
                  return (
                    <CommandItem
                      key={skill}
                      value={skill}
                      onSelect={() => handleSelectSuggestion(skill)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 flex-shrink-0",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex-1">{skill}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
