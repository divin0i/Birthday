// Scovy's age on the main site: script/birthday-age.js (SCOVY_BIRTH_YEAR).

// Flip this off after the birthday.
// /memorywall?upload will stop taking photos. The wall stays up.
export const UPLOADS_ENABLED = true;

export const GRACE_MS = 30_000;
export const MAX_IMAGE_CHARS = 380_000;
/** Soft limit for Firebase rules; no hard UI cap. */
export const MAX_NOTE = 8000;
export const MAX_NAME = 32;

/** Extra fake polaroids on the wall (0 = off). Also works with ?demo=14 in the URL. */
export const DEMO_POLAROID_COUNT = 0;

/** Max polaroids visible per wall page (book spread). */
export const PICTURES_PER_PAGE = 20;
