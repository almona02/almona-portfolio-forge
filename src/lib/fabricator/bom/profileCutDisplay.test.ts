import { describe, expect, it } from 'vitest';
import { groupProfileCuts } from './profileCutDisplay';
describe('profile cut display', () => { it('groups equal cuts without merging different angles', () => { expect(groupProfileCuts({ cuttingLengths: [1000, 1000, 1000], angles: [45, 45, 90] } as never)).toEqual([{ length: 1000, angle: 45, count: 2 }, { length: 1000, angle: 90, count: 1 }]); }); });
