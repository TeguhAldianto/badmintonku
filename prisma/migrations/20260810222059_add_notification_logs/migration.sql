-- CreateTable
CREATE TABLE `notification_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `target` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `errorMessage` TEXT NULL,
    `providerResponse` TEXT NULL,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
