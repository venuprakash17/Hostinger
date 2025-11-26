import { createContext, useContext, useState, ReactNode } from "react";

interface CodingFiltersContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  difficultyFilter: string;
  setDifficultyFilter: (difficulty: string) => void;
  tagsFilter: string;
  setTagsFilter: (tags: string) => void;
  yearFilter: string;
  setYearFilter: (year: string) => void;
  languageFilter: string;
  setLanguageFilter: (language: string) => void;
  scopeTypeFilter: string;
  setScopeTypeFilter: (scope: string) => void;
  clearFilters: () => void;
}

const CodingFiltersContext = createContext<CodingFiltersContextType | undefined>(undefined);

export function CodingFiltersProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [tagsFilter, setTagsFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [scopeTypeFilter, setScopeTypeFilter] = useState("all");

  const clearFilters = () => {
    setSearchQuery("");
    setDifficultyFilter("all");
    setTagsFilter("");
    setYearFilter("all");
    setLanguageFilter("all");
    setScopeTypeFilter("all");
  };

  return (
    <CodingFiltersContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        difficultyFilter,
        setDifficultyFilter,
        tagsFilter,
        setTagsFilter,
        yearFilter,
        setYearFilter,
        languageFilter,
        setLanguageFilter,
        scopeTypeFilter,
        setScopeTypeFilter,
        clearFilters,
      }}
    >
      {children}
    </CodingFiltersContext.Provider>
  );
}

export function useCodingFilters() {
  const context = useContext(CodingFiltersContext);
  if (context === undefined) {
    throw new Error("useCodingFilters must be used within a CodingFiltersProvider");
  }
  return context;
}

