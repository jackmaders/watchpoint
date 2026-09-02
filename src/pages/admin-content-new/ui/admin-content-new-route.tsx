/**
 * Route presentation component for creating new VOD training session records.
 *
 * Implements `AdminContentNewRouteComponent` rendering the `AdminVodEditorPage` widget in creation mode (`isCreate = true`).
 */
import { AdminVodEditorPage } from "@/widgets/admin-vod-editor";

export function AdminContentNewRouteComponent() {
	return <AdminVodEditorPage isCreate />;
}
