/**
 * Route options configuration for the `/admin` root route.
 *
 * Configures `adminIndexRouteOptions` binding `beforeLoad: adminIndexBeforeLoad` to execute redirection on access.
 */
import { adminIndexBeforeLoad } from "../api/loaders";

export const adminIndexRouteOptions = {
	beforeLoad: adminIndexBeforeLoad,
	component: () => null,
};
