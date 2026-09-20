import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { usePostCreateMutation } from "../api/post-create";
import { PostCreateForm } from "../ui/post-create-form";

vi.mock("../api/post-create");

describe("PostCreateForm", () => {
	test("renders the post name field and submit button", () => {
		render(<PostCreateForm />);

		expect(screen.getByLabelText("Post name")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Add post" }),
		).toBeInTheDocument();
	});

	test("creates a post and clears the form", async () => {
		const user = userEvent.setup();
		render(<PostCreateForm />);

		const input = screen.getByLabelText("Post name");
		await user.type(input, "First post");

		await act(() =>
			user.click(screen.getByRole("button", { name: "Add post" })),
		);

		expect(usePostCreateMutation().mutateAsync).toHaveBeenCalledWith({
			name: "First post",
		});
		expect(input).toHaveValue("");
	});

	test("does not create a post when the name is blank", async () => {
		const user = userEvent.setup();
		render(<PostCreateForm />);

		const input = screen.getByLabelText("Post name");
		await user.type(input, "   ");

		await act(() =>
			user.click(screen.getByRole("button", { name: "Add post" })),
		);

		expect(usePostCreateMutation().mutateAsync).not.toHaveBeenCalled();
	});
});
