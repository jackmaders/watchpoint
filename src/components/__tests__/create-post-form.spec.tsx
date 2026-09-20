import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { useCreatePostMutation } from "@/api/posts";
import { CreatePostForm } from "../create-post-form";

vi.mock("@/api/posts");

describe("CreatePostForm", () => {
	test("renders the post name field and submit button", () => {
		render(<CreatePostForm />);

		expect(screen.getByLabelText("Post name")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Add post" }),
		).toBeInTheDocument();
	});

	test("creates a post and clears the form", async () => {
		const user = userEvent.setup();
		render(<CreatePostForm />);

		const input = screen.getByLabelText("Post name");
		await user.type(input, "First post");

		await act(() =>
			user.click(screen.getByRole("button", { name: "Add post" })),
		);

		expect(useCreatePostMutation().mutateAsync).toHaveBeenCalledWith({
			name: "First post",
		});
		expect(input).toHaveValue("");
	});

	test("does not create a post when the name is blank", async () => {
		const user = userEvent.setup();
		render(<CreatePostForm />);

		const input = screen.getByLabelText("Post name");
		await user.type(input, "   ");

		await act(() =>
			user.click(screen.getByRole("button", { name: "Add post" })),
		);

		expect(useCreatePostMutation().mutateAsync).not.toHaveBeenCalled();
	});
});
