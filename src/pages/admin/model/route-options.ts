import { adminIndexBeforeLoad } from "../api/loaders";

export const adminIndexRouteOptions = {
	beforeLoad: adminIndexBeforeLoad,
	component: () => null,
};
