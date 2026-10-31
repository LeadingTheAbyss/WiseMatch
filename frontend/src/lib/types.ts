export type Intent = "seeking" | "has_room";

export interface TagChip {
  key: string;
  label: string;
  emoji: string;
  group?: string;
}
export interface TraitChip {
  key: string;
  value: string;
  label: string;
  emoji: string;
}
export interface Reason {
  icon: string;
  text: string;
}
export interface Entity {
  id: string;
  name: string;
  type: string;
  tags?: string[];
  image?: string | null;
  locality?: string | null;
  source?: string;
}
export interface ListingLite {
  rent: number;
  title: string;
  hue: number;
}
export interface Listing extends ListingLite {
  id: number;
  user_id: number;
  area: string;
  deposit: number;
  room_type: string;
  flat_type: string;
  furnishing: string;
  amenities: string[];
  description: string;
  available_from: string;
  photos: number;
}

export interface MatchCardData {
  id: number;
  avatar: string;
  name: string;
  age: number;
  gender: string;
  occupation: string;
  area: string;
  intent: Intent;
  verified: boolean;
  last_active: string;
  budget_min: number;
  budget_max: number;
  bio: string;
  score: number;
  distance_km: number | null;
  reasons: Reason[];
  shared_tags: TagChip[];
  tags: TagChip[];
  listing: ListingLite | null;
  matched?: boolean;
}

export interface ProfileData extends Omit<MatchCardData, "listing"> {
  religion: string;
  languages: string[];
  move_in: string;
  trait_chips: TraitChip[];
  all_tags: TagChip[];
  taste: Entity[];
  looking_for: string[];
  breakdown: { lifestyle: number; taste: number; preferences: number; budget: number; location: number };
  all_reasons: Reason[];
  heads_up: string[];
  shared_entities: string[];
  listing: Listing | null;
  conversation: { id: number; status: "accepted" | "request"; incoming: boolean } | null;
  is_demo: boolean;
}

export interface Me {
  id: number;
  name: string;
  age: number;
  gender: string;
  occupation: string;
  area: string;
  bio: string;
  intent: Intent;
  budget_min: number;
  budget_max: number;
  move_in: string;
  gender_pref: string;
  religion: string;
  languages: string[];
  traits: Record<string, string>;
  prefs: Record<string, string[]>;
  custom_prefs: { text: string; kind: "want" | "avoid" }[];
  taste: Entity[];
  onboarded: boolean;
  verified: boolean;
  tags: TagChip[];
  trait_chips: TraitChip[];
  answered: number;
  listing: Listing | null;
  counts: { unread: number; requests: number };
  avatar: string;
}

export interface Option {
  value: string;
  label: string;
  emoji: string;
}
export interface Question {
  id: string;
  kind: "trait" | "taste";
  text: string;
  why: string;
  hard: boolean;
  by_agent: boolean;
  options: Option[];
  them_options: Option[];
  them_text: string;
  topic: string;
  emoji: string;
  examples: Entity[];
  split: { value: string; label: string; emoji: string; count: number; pct: number }[];
  expected_keep: number;
}
export interface TraceEvent {
  id: number;
  t: number;
  kind: "pool" | "taste" | "llm" | "decide";
  title: string;
  detail: string;
  ms: number | null;
  source: string;
  ok: boolean;
}
export interface AgentStep {
  pool: { initial: number; remaining: number; removed: number };
  answered: number;
  max_questions: number;
  done: boolean;
  question: Question | null;
  top: { id: number; name: string; score: number; area: string; avatar: string }[];
  trace: TraceEvent[];
}

export interface Stats {
  total: number;
  rooms: number;
  areas: { name: string; lat: number; lng: number; count: number; rooms: number; seekers: number }[];
  top_tags: (TagChip & { count: number })[];
  points: { id: number; lat: number; lng: number; name: string; intent: Intent; area: string; avatar: string }[];
}

export interface Conversation {
  id: number;
  other: { id: number; name: string; area: string; verified: boolean; last_active: string; score: number; occupation: string; avatar: string };
  last: { id: number; body: string; mine: boolean; at: string; read: boolean } | null;
  unread: number;
  status: "accepted" | "request";
  incoming: boolean;
  outgoing: boolean;
}
export interface Msg {
  id: number;
  body: string;
  mine: boolean;
  at: string;
  read: boolean;
}

export interface Catalog {
  areas: { name: string; lat: number; lng: number }[];
  tags: TagChip[];
  traits: { key: string; text: string; them: string; hard: boolean; options: Option[] }[];
  religions: string[];
  languages: string[];
}
