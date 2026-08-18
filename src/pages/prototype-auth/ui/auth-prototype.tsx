import type { FormEvent } from "react";
import { useId, useState } from "react";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import "./auth-prototype.css";

type Mode = "sign-in" | "register";
type Status = "idle" | "created" | "signed-in" | "error" | "expired";

export function AuthPrototype() {
	const [mode, setMode] = useState<Mode>("sign-in");
	const [open, setOpen] = useState(true);
	const [registrationEnabled, setRegistrationEnabled] = useState(true);
	const [status, setStatus] = useState<Status>("idle");

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setStatus(mode === "register" ? "created" : "signed-in");
	}

	function toggleRegistration() {
		setRegistrationEnabled((enabled) => {
			if (enabled) setMode("sign-in");
			return !enabled;
		});
	}

	return (
		<main className="prototype-shell">
			<div aria-hidden="true" className="backdrop">
				<span>WATCHPOINT</span>
				<span>PUBLIC TRAINING CATALOGUE</span>
			</div>
			<div aria-live="polite" className="prototype-state">
				<strong>Modal prototype</strong>
				<span>
					modal={open ? "open" : "closed"} · mode={mode} · registration=
					{registrationEnabled ? "on" : "off"} · status={status}
				</span>
			</div>
			<AuthModal
				mode={mode}
				onSubmit={submit}
				open={open}
				registrationEnabled={registrationEnabled}
				setMode={setMode}
				setOpen={setOpen}
				status={status}
			/>
			<section aria-label="Prototype controls" className="prototype-controls">
				<Button onClick={() => setOpen(true)} size="sm">
					Open modal
				</Button>
				<Button onClick={toggleRegistration} size="sm" variant="outline">
					Registration {registrationEnabled ? "enabled" : "disabled"}
				</Button>
				<Button
					onClick={() => setStatus("expired")}
					size="sm"
					variant="outline"
				>
					Simulate expiry
				</Button>
				<Button onClick={() => setStatus("error")} size="sm" variant="outline">
					Simulate invalid credentials
				</Button>
			</section>
		</main>
	);
}

function AuthModal({
	mode,
	onSubmit,
	open,
	registrationEnabled,
	setMode,
	setOpen,
	status,
}: {
	mode: Mode;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	open: boolean;
	registrationEnabled: boolean;
	setMode: (mode: Mode) => void;
	setOpen: (open: boolean) => void;
	status: Status;
}) {
	const headingId = useId();
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogContent aria-labelledby={headingId} className="auth-dialog">
				<DialogHeader>
					<span className="eyebrow">Watchpoint / player account</span>
					<DialogTitle id={headingId}>
						{mode === "register"
							? "Create your player identity"
							: "Welcome back, player"}
					</DialogTitle>
					<DialogDescription>
						Own your attempts and continue training where you left off.
					</DialogDescription>
				</DialogHeader>
				<Tabs
					className="auth-tabs"
					onValueChange={(value) => setMode(value as Mode)}
					value={mode}
				>
					<TabsList>
						<TabsTrigger value="sign-in">Sign in</TabsTrigger>
						<TabsTrigger
							className="registration-tab"
							disabled={!registrationEnabled}
							value="register"
						>
							Register
						</TabsTrigger>
					</TabsList>
					<TabsContent value="sign-in">
						<AuthForm mode="sign-in" onSubmit={onSubmit} status={status} />
					</TabsContent>
					<TabsContent value="register">
						<AuthForm mode="register" onSubmit={onSubmit} status={status} />
					</TabsContent>
				</Tabs>
				{!registrationEnabled && (
					<Alert aria-live="polite" className="registration-note" role="status">
						<AlertDescription className="col-span-2">
							Registration is currently unavailable. Existing players can still
							sign in.
						</AlertDescription>
					</Alert>
				)}
			</DialogContent>
		</Dialog>
	);
}

function AuthForm({
	mode,
	onSubmit,
	status,
}: {
	mode: Mode;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	status: Status;
}) {
	const fieldIds = useId();
	return (
		<form className="auth-form" onSubmit={onSubmit}>
			<FieldGroup className="auth-fields">
				{mode === "register" && (
					<Field>
						<FieldLabel htmlFor={`${fieldIds}-display-name`}>
							Display name
						</FieldLabel>
						<Input
							id={`${fieldIds}-display-name`}
							name="display-name"
							placeholder="How should we call you?"
							required
						/>
					</Field>
				)}
				<Field>
					<FieldLabel htmlFor={`${fieldIds}-email`}>Email</FieldLabel>
					<Input
						id={`${fieldIds}-email`}
						name="email"
						placeholder="you@example.com"
						required
						type="email"
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor={`${fieldIds}-password`}>Password</FieldLabel>
					<Input
						id={`${fieldIds}-password`}
						minLength={8}
						name="password"
						placeholder="At least 8 characters"
						required
						type="password"
					/>
					{mode === "register" && (
						<FieldDescription>Use at least 8 characters.</FieldDescription>
					)}
				</Field>
			</FieldGroup>
			{status === "error" && (
				<Alert
					aria-live="assertive"
					className="form-alert"
					variant="destructive"
				>
					<AlertDescription className="col-span-2">
						Invalid email or password.
					</AlertDescription>
				</Alert>
			)}
			{status === "expired" && (
				<Alert aria-live="polite" className="form-alert" role="status">
					<AlertDescription className="col-span-2">
						Your session expired. Sign in again to continue.
					</AlertDescription>
				</Alert>
			)}
			<Button className="auth-cta" type="submit">
				{mode === "register" ? "Create account" : "Sign in"}
			</Button>
		</form>
	);
}
