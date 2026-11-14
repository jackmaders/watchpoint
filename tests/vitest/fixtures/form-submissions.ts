import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

async function retryFailedSave(
  user: ReturnType<typeof userEvent.setup>,
  { buttonName, title }: { buttonName: string; title: HTMLInputElement },
) {
  await user.click(screen.getByRole("button", { name: buttonName }));
  const error = await screen.findByRole("alert");
  const retry = screen.getByRole<HTMLButtonElement>("button", { name: buttonName });
  const failure = {
    message: error.textContent,
    retainedTitle: title.value,
    retryDisabled: retry.disabled,
  };
  const recovery = await retryAfterDescriptionEdit(user, retry);
  return { ...failure, ...recovery };
}

async function retryAfterDescriptionEdit(
  user: ReturnType<typeof userEvent.setup>,
  retry: HTMLButtonElement,
) {
  await user.type(screen.getByRole("textbox", { name: "Description" }), " revised");
  const recovery = {
    feedbackVisibleAfterEdit: Boolean(screen.queryByRole("alert")),
    retryDisabledAfterEdit: retry.disabled,
  };
  await user.click(retry);
  return recovery;
}

export { retryFailedSave };
