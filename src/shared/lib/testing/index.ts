/**
 * Exposes shared testing utilities and player mock harnesses for unit and integration test suites.
 *
 * Re-exports YouTube player mock fixtures, frame controllers, and state simulation helpers
 * from the shared media mock layer to provide uniform media testing across the repository.
 */

export {
	createYouTubeMock,
	installMockFrames,
	type MockFrameController,
	type MockYouTubePlayer,
	setDocumentVisibility,
	setYouTubeNamespace,
	type YouTubeMock,
	YouTubePlayerState,
} from "../../media/__mocks__/youtube";
