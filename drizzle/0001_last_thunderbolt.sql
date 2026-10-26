CREATE TABLE `support_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`author_role` text NOT NULL,
	`message` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `support_requests`(`id`) ON UPDATE no action ON DELETE no action
);
