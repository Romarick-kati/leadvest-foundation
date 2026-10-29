import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { adminContentRouter } from './content.js';
import { adminPeopleRouter } from './people.js';
import { adminOpsRouter } from './operations.js';

export const adminRouter = Router();
// Every administrator route is protected here on the server, independent of the interface.
adminRouter.use(requireAdmin);
adminRouter.use(adminOpsRouter);
adminRouter.use(adminContentRouter);
adminRouter.use(adminPeopleRouter);
