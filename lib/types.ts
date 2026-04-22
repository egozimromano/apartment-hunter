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
  source: "yad2" | "homeless" | "madlan" | "facebook" | "other";
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
  | "no_parking"   | "no_elevator" | "loved_it" | "interested" | "contacted";

export interface FeedbackMap {
  [aptId: string]: FeedbackTag[];
}
