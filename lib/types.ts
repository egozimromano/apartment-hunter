export interface RawApartment {
  id: string;
  title: string;
  price: number | null;
  rooms: number | null;
  size: number | null;
  floor: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  source: "yad2" | "homeless" | "madlan" | "komo" | "facebook" | "other";
  url: string | null;
  image: string | null;
  features: string[];
  description: string | null;
  posted_at: string | null;
}

export interface ScoredApartment extends RawApartment {
  match_score: number;
  match_reasons: string[];
}

export type FeedbackTag =
  | "too_expensive" | "too_far" | "too_small" | "bad_area"
  | "no_parking"   | "no_elevator" | "loved_it" | "interested" | "contacted"
  | "seen" | "hidden_permanent";

export interface FeedbackMap {
  [aptId: string]: FeedbackTag[];
}

// ─── v2: Structured filters ────────────────────────────────────
export interface StructuredFilters {
  city?: string;
  neighborhoods?: string[];
  rooms_min?: number;
  rooms_max?: number;
  price_min?: number;
  price_max?: number;
  size_min?: number;
  must_have?: string[]; // "parking", "elevator", "balcony"...
}

// ─── v2: Saved search ──────────────────────────────────────────
export interface SavedSearch {
  id: string;
  name: string;             // user-given name ("תל אביב 3 חדרים")
  freeText: string;         // free-form Hebrew description
  filters: StructuredFilters;
  results: ScoredApartment[];
  hiddenIds: string[];      // apartments the user removed
  feedback: FeedbackMap;
  insights: string;
  chatHistory: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  lastSearchedAt: number | null;
  searchCount: number;
  pushEnabled: boolean;
}

// ─── v2: Chat ──────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  actions?: ChatAction[];
}

export type ChatAction =
  | { type: "updateFilters"; filters: Partial<StructuredFilters> }
  | { type: "runSearch" }
  | { type: "hideApartment"; aptId: string }
  | { type: "hideMany"; aptIds: string[] }
  | { type: "clearHidden" };

// ─── v2: User settings ─────────────────────────────────────────
export type ThemeMode = "light" | "dark" | "auto";
export type ColorScheme = "blue" | "green" | "red" | "purple" | "orange";
export type FontSize = "small" | "medium" | "large";

export interface UserSettings {
  theme: ThemeMode;
  color: ColorScheme;
  fontSize: FontSize;
  animations: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  color: "blue",
  fontSize: "medium",
  animations: true,
};
