function sanitizeNamePart(name: string): string {
  return name.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
}

function sanitizeCompanyNamePart(name: string): string {
  const stripped = name.replace(/[^a-zA-Z0-9]/g, "");
  return stripped ? stripped[0].toUpperCase() + stripped.slice(1) : stripped;
}

/**
 * Drive filename for a generated/uploaded resume: `{FirstName}_{LastName}_{CompanyName}.docx`.
 * Built from `first_name`/`last_name`, not the profile's `name` field — `name` is a free-form
 * identifier a profile can be told apart by (e.g. two profiles for the same real person), so it
 * isn't safe to parse for a filename. Falls back to splitting `legacyProfileName` (best-effort,
 * on whitespace) for profiles saved before first/last name existed, then to `fallbackBaseName`
 * (e.g. the template's own name) when there's no profile at all.
 */
export function buildResumeFilename(
  profileFirstName: string | null | undefined,
  profileLastName: string | null | undefined,
  legacyProfileName: string | null | undefined,
  companyName: string,
  fallbackBaseName: string
): string {
  const firstName = profileFirstName?.trim();
  const lastName = profileLastName?.trim();
  const legacyName = legacyProfileName?.trim();

  let namePart: string | null = null;
  if (firstName && lastName) {
    namePart = `${sanitizeNamePart(firstName)}_${sanitizeNamePart(lastName)}`;
  } else if (legacyName) {
    namePart = sanitizeNamePart(legacyName);
  }

  const baseName = namePart ? `${namePart}_${sanitizeCompanyNamePart(companyName)}` : fallbackBaseName;
  return `${baseName}.docx`;
}
