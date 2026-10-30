/**
 * Contract for GET /api/features: the feature flags switched on with
 * FEATURE_<id>=true on the API. Anything not listed is off.
 *
 * `contracts/features.schema.json` is the exported JSON Schema; the API's Go
 * tests validate their real responses against that file.
 * After changing the schema, run `npm run contract:update`.
 */
import { z } from 'zod/v4';

/** A feature id from the milestone specs: F1…F14, optionally with a part letter (F12A, F9B). */
export const FeatureId = z.string().regex(/^F[0-9]+[A-Z]?$/);

export const FeaturesResponse = z.looseObject({
  features: z.array(FeatureId),
});

export type FeaturesResponse = z.infer<typeof FeaturesResponse>;

/** The JSON Schema file other repos validate against (contracts/features.schema.json). */
export function exportContract() {
  return {
    features: z.toJSONSchema(FeaturesResponse),
  };
}
