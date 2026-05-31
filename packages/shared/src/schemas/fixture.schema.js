"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixtureListQuerySchema = void 0;
const zod_1 = require("zod");
exports.fixtureListQuerySchema = zod_1.z.object({
    date: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
        .optional(),
    status: zod_1.z
        .enum(['scheduled', 'live', 'finished', 'postponed', 'cancelled', 'all'])
        .optional()
        .default('all'),
    leagueId: zod_1.z.coerce.number().positive().optional(),
    sportId: zod_1.z.coerce.number().positive().optional().default(1),
    page: zod_1.z.coerce.number().min(1).optional().default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).optional().default(20),
    timezone: zod_1.z.string().optional().default('UTC'),
});
//# sourceMappingURL=fixture.schema.js.map