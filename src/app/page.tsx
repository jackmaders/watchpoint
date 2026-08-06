import { UserForm } from "@/features/user-form";

const handleUserFormSubmit = () => {};

export default function Home() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-24">
			<h1 className="text-4xl font-bold tracking-tight">
				Next.js Project Template
			</h1>
			<p className="mt-4 text-muted-foreground">
				Scaffolded with Bun, FSD, Biome, and Vitest
			</p>
			<div className="mt-8 w-full max-w-md">
				<UserForm onSubmit={handleUserFormSubmit} />
			</div>
		</main>
	);
}
