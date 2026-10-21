export interface Prompt {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocxTemplate {
  id: string;
  name: string;
  storage_path: string;
  variables: string[];
  template_type: "resume" | "cover_letter";
  profile_id: string | null;
  prompt_id: string | null;
  notes: string | null;
  company_name_hyperlink: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  default_template_id: string | null;
  /** JSON.stringify'd `ProfileBasicInfo`, or null if never filled in. */
  profile_basic: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** The structured "basic info" form on the Profile page - personal/education
 * details used for auto-fill (e.g. by the Apply Assistant extension), plus a
 * freeform `note` sub-field for anything else (work auth, EEO questions,
 * etc.) - this is the only notes field on a profile now; there is no separate
 * `profile_note` column. Stored as JSON text in `profiles.profile_basic`;
 * key names/casing are a fixed external contract, not just internal naming -
 * keep them exactly as-is if touching this. */
export interface ProfileBasicInfo {
  first_name: string;
  last_name: string;
  dob: string;
  address: string;
  city: string;
  state: string;
  state_abb: string;
  zip: string;
  email: string;
  phone: string;
  linkedin: string;
  education: {
    university: string;
    unverstisity_locatoin_city: string;
    unverstisity_locatoin_state: string;
    unverstisity_locatoin_state_abb: string;
    field_study: string;
    education_start: string;
    education_end: string;
  };
  note: string;
}

export interface ProfileAssignment {
  id: string;
  profile_id: string;
  user_id: string;
  created_at: string;
}
