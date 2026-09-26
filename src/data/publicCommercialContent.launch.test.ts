import { describe, expect, it } from 'vitest';
import { getServicePackages, SERVICE_PACKAGE_IDS } from './servicePackages';
import { generateUpcomingCohorts, trainingLevels } from './trainingPrograms';
import { usedMachines } from './usedMachines';

describe('Public commercial content without approved commercial records', () => {
  it('does not turn the current date into a bookable course schedule', () => {
    expect(generateUpcomingCohorts()).toEqual([]);
    expect(trainingLevels.every(level => level.price === 'Contact for a quote')).toBe(true);
  });
  it('does not publish unapproved seller listings or their ratings and stock offers', () => {
    expect(usedMachines).toEqual([]);
  });
  it.each(['en', 'ar', 'tr'])('does not advertise unapproved service prices or discounts in %s', language => {
    const plans = getServicePackages(language);
    for (const id of SERVICE_PACKAGE_IDS) {
      expect(plans[id].popular).toBe(false);
      expect(plans[id].price).not.toMatch(/[0-9٠-٩]/);
      expect(plans[id].features.join(' ')).not.toMatch(/%|٪|24\/7|4h|48h/);
    }
  });
});
