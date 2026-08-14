declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: { userId: number; username: string; role: string } | undefined;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};